import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import Database from 'better-sqlite3';

import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import { MEDIA_EVENTS } from '@dubforge/platform-events';
import type { ExtensionRuntime } from '@dubforge/providers';

import { Sha256FingerprintAdapter } from './adapters/fingerprint/sha256-fingerprint-adapter.js';
import { FfmpegExtractAudioAdapter } from './adapters/ffmpeg/ffmpeg-extract-audio-adapter.js';
import { FfmpegMuxAdapter } from './adapters/ffmpeg/ffmpeg-mux-adapter.js';
import { FfmpegProbeAdapter } from './adapters/ffmpeg/ffmpeg-probe-adapter.js';
import { FfmpegThumbnailAdapter } from './adapters/ffmpeg/ffmpeg-thumbnail-adapter.js';
import { FixtureExtractAudioAdapter } from './adapters/ffmpeg/fixture-extract-audio-adapter.js';
import { FixtureMuxAdapter } from './adapters/ffmpeg/fixture-mux-adapter.js';
import { FixtureProbeAdapter } from './adapters/ffmpeg/fixture-probe-adapter.js';
import { resolveGoldenFixturePath } from './integration/adapter-registry.js';
import { MediaApplication } from './application/media-application.js';
import { ImportMediaService } from './application/import-media-service.js';
import { FingerprintMediaService } from './application/fingerprint-media-service.js';
import { ThumbnailMediaService } from './application/thumbnail-media-service.js';
import {
  ExtractAudioService,
  MuxMediaService,
  ProbeMediaService,
} from './application/media-services.js';
import { FfprobeDiagnosticsCollector } from './diagnostics/ffprobe-diagnostics.js';
import { MediaDiagnostics } from './diagnostics/media-diagnostics.js';
import { MediaExecutionAdapter } from './integration/media-execution-adapter.js';
import type {
  ExtractAudioPort,
  FingerprintMediaPort,
  MuxMediaPort,
  ProbeMediaPort,
  ThumbnailMediaPort,
} from './ports/media-ports.js';
import { MediaRepository } from './repository/media-repository.js';
import { MediaMigrationRunner } from './repository/sqlite/migrations.js';

export interface MediaPlatformPorts {
  readonly fingerprintPort: FingerprintMediaPort;
  readonly probePort: ProbeMediaPort;
  readonly thumbnailPort: ThumbnailMediaPort;
  readonly extractPort: ExtractAudioPort;
  readonly muxPort: MuxMediaPort;
}

export interface MediaPlatformOptions {
  readonly rootPath: string;
  readonly eventBus: DomainEventBus;
  readonly artifactSink?: ArtifactSink;
  readonly extensionRuntime?: ExtensionRuntime;
  readonly ffprobePath?: string;
  readonly ffmpegPath?: string;
  readonly useFixtureAdapters?: boolean;
  readonly fixtureProbePath?: string;
  readonly ports?: Partial<MediaPlatformPorts>;
}

export interface MediaPlatform {
  readonly application: MediaApplication;
  readonly repository: MediaRepository;
  readonly diagnostics: MediaDiagnostics;
  readonly ffprobeDiagnostics: FfprobeDiagnosticsCollector;
  readonly importService: ImportMediaService;
  createExecutionAdapter(): MediaExecutionAdapter;
  close(): void;
}

export function createMediaPlatform(options: MediaPlatformOptions): MediaPlatform {
  mkdirSync(options.rootPath, { recursive: true });

  const databasePath = join(options.rootPath, 'media-catalog.db');
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  new MediaMigrationRunner(db).migrate();

  const repository = new MediaRepository(db);
  const diagnostics = new MediaDiagnostics();
  const ffmpegPath = options.ffmpegPath ?? 'ffmpeg';

  const fingerprintPort = options.ports?.fingerprintPort ?? new Sha256FingerprintAdapter();

  const probePort =
    options.ports?.probePort ??
    (options.useFixtureAdapters
      ? new FixtureProbeAdapter({
          fixturePath: options.fixtureProbePath ?? resolveGoldenFixturePath('golden-probe.json'),
        })
      : new FfmpegProbeAdapter({ ffprobePath: options.ffprobePath ?? 'ffprobe' }));

  const thumbnailPort =
    options.ports?.thumbnailPort ??
    (options.useFixtureAdapters
      ? new FfmpegThumbnailAdapter({ ffmpegPath })
      : new FfmpegThumbnailAdapter({ ffmpegPath }));

  const extractPort =
    options.ports?.extractPort ??
    (options.useFixtureAdapters
      ? new FixtureExtractAudioAdapter()
      : new FfmpegExtractAudioAdapter({ ffmpegPath }));

  const muxPort =
    options.ports?.muxPort ??
    (options.useFixtureAdapters ? new FixtureMuxAdapter() : new FfmpegMuxAdapter({ ffmpegPath }));

  const fingerprintService = new FingerprintMediaService({
    eventBus: options.eventBus,
    repository,
    fingerprintPort,
    artifactSink: options.artifactSink,
  });

  const probeService = new ProbeMediaService({
    eventBus: options.eventBus,
    repository,
    probePort,
    artifactSink: options.artifactSink,
    extensionRuntime: options.extensionRuntime,
  });

  const thumbnailService = new ThumbnailMediaService({
    eventBus: options.eventBus,
    repository,
    thumbnailPort,
    artifactSink: options.artifactSink,
  });

  const extractService = new ExtractAudioService({
    eventBus: options.eventBus,
    repository,
    extractPort,
    artifactSink: options.artifactSink,
  });

  const muxService = new MuxMediaService({
    eventBus: options.eventBus,
    repository,
    muxPort,
    artifactSink: options.artifactSink,
  });

  const application = new MediaApplication(
    fingerprintService,
    probeService,
    extractService,
    muxService,
  );
  const executionAdapter = new MediaExecutionAdapter(application);
  const ffprobeDiagnostics = new FfprobeDiagnosticsCollector();
  const importService = new ImportMediaService({
    eventBus: options.eventBus,
    repository,
    fingerprintService,
    probeService,
    thumbnailService,
    extractAudioService: extractService,
    ffprobeDiagnostics,
    artifactSink: options.artifactSink,
  });

  options.eventBus.subscribeToType(MEDIA_EVENTS.DIAGNOSTIC_RECORDED, (event) => {
    if ('level' in event && 'message' in event && 'nodeId' in event) {
      diagnostics.record({
        level: event.level,
        message: event.message,
        workflowId: event.workflowId,
        nodeId: event.nodeId,
      });
    }
  });

  return {
    application,
    repository,
    diagnostics,
    ffprobeDiagnostics,
    importService,
    createExecutionAdapter(): MediaExecutionAdapter {
      return executionAdapter;
    },
    close(): void {
      db.close();
    },
  };
}
