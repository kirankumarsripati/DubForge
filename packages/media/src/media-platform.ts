import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import Database from 'better-sqlite3';

import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import { MEDIA_EVENTS } from '@dubforge/platform-events';
import type { ExtensionRuntime } from '@dubforge/providers';

import { FfmpegExtractAudioAdapter } from './adapters/ffmpeg/ffmpeg-extract-audio-adapter.js';
import { FfmpegMuxAdapter } from './adapters/ffmpeg/ffmpeg-mux-adapter.js';
import { FfmpegProbeAdapter } from './adapters/ffmpeg/ffmpeg-probe-adapter.js';
import { FixtureExtractAudioAdapter } from './adapters/ffmpeg/fixture-extract-audio-adapter.js';
import { FixtureMuxAdapter } from './adapters/ffmpeg/fixture-mux-adapter.js';
import { FixtureProbeAdapter } from './adapters/ffmpeg/fixture-probe-adapter.js';
import { resolveGoldenFixturePath } from './integration/adapter-registry.js';
import { MediaApplication } from './application/media-application.js';
import { ImportMediaService } from './application/import-media-service.js';
import {
  ExtractAudioService,
  MuxMediaService,
  ProbeMediaService,
} from './application/media-services.js';
import { FfprobeDiagnosticsCollector } from './diagnostics/ffprobe-diagnostics.js';
import { MediaDiagnostics } from './diagnostics/media-diagnostics.js';
import { MediaExecutionAdapter } from './integration/media-execution-adapter.js';
import type { ExtractAudioPort, MuxMediaPort, ProbeMediaPort } from './ports/media-ports.js';
import { MediaRepository } from './repository/media-repository.js';
import { MediaMigrationRunner } from './repository/sqlite/migrations.js';

export interface MediaPlatformPorts {
  readonly probePort: ProbeMediaPort;
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
  readonly ports?: MediaPlatformPorts;
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

  const probePort =
    options.ports?.probePort ??
    (options.useFixtureAdapters
      ? new FixtureProbeAdapter({
          fixturePath: options.fixtureProbePath ?? resolveGoldenFixturePath('golden-probe.json'),
        })
      : new FfmpegProbeAdapter({ ffprobePath: options.ffprobePath ?? 'ffprobe' }));

  const extractPort =
    options.ports?.extractPort ??
    (options.useFixtureAdapters
      ? new FixtureExtractAudioAdapter()
      : new FfmpegExtractAudioAdapter({ ffmpegPath: options.ffmpegPath ?? 'ffmpeg' }));

  const muxPort =
    options.ports?.muxPort ??
    (options.useFixtureAdapters
      ? new FixtureMuxAdapter()
      : new FfmpegMuxAdapter({ ffmpegPath: options.ffmpegPath ?? 'ffmpeg' }));

  const probeService = new ProbeMediaService({
    eventBus: options.eventBus,
    repository,
    probePort,
    artifactSink: options.artifactSink,
    extensionRuntime: options.extensionRuntime,
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

  const application = new MediaApplication(probeService, extractService, muxService);
  const executionAdapter = new MediaExecutionAdapter(application);
  const ffprobeDiagnostics = new FfprobeDiagnosticsCollector();
  const importService = new ImportMediaService({
    eventBus: options.eventBus,
    executionAdapter,
    repository,
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
