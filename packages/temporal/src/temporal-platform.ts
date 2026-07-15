import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import Database from 'better-sqlite3';

import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import type { LocalizationRepository } from '@dubforge/localization';
import type { ExtensionRuntime } from '@dubforge/providers';
import type { VoicePerformanceRepository } from '@dubforge/voice-performance';

import {
  FixtureFfmpegCompositionAdapter,
  FfmpegCompositionAdapter,
} from './adapters/ffmpeg-composition-adapter.js';
import { FixtureRubberBandAdapter, RubberBandAdapter } from './adapters/rubber-band-adapter.js';
import { AlignAndComposeService } from './application/temporal-services.js';
import { TemporalSynchronizationApplication } from './application/temporal-synchronization-application.js';
import { TemporalDiagnostics } from './diagnostics/temporal-diagnostics.js';
import { TemporalExecutionAdapter } from './integration/temporal-execution-adapter.js';
import { resolveGoldenFixturePath } from './integration/adapter-registry.js';
import type {
  AudioAlignerPort,
  AudioComposerPort,
  LocalizedDocumentReader,
  VoicePerformanceReader,
} from './ports/temporal-ports.js';
import { TemporalRepository } from './repository/temporal-repository.js';
import { TemporalMigrationRunner } from './repository/sqlite/migrations.js';

export interface TemporalPlatformOptions {
  readonly rootPath: string;
  readonly eventBus: DomainEventBus;
  readonly artifactSink?: ArtifactSink;
  readonly extensionRuntime?: ExtensionRuntime;
  readonly localizedDocumentReader: LocalizedDocumentReader;
  readonly voicePerformanceReader: VoicePerformanceReader;
  readonly alignerPort?: AudioAlignerPort;
  readonly composerPort?: AudioComposerPort;
  readonly useFixtureAdapters?: boolean;
  readonly fixtureAlignPath?: string;
  readonly fixtureComposePath?: string;
}

export interface TemporalPlatform {
  readonly application: TemporalSynchronizationApplication;
  readonly repository: TemporalRepository;
  readonly diagnostics: TemporalDiagnostics;
  createExecutionAdapter(): TemporalExecutionAdapter;
  close(): void;
}

export function createLocalizedDocumentReaderFromRepository(
  repository: LocalizationRepository,
): LocalizedDocumentReader {
  return {
    getLocalizedDocument: (workflowId, languageCode) =>
      repository.getLocalizedDocument(workflowId, languageCode),
  };
}

export function createVoicePerformanceReaderFromRepository(
  repository: VoicePerformanceRepository,
): VoicePerformanceReader {
  return {
    getVoicePerformance: (workflowId, languageCode) =>
      repository.getVoicePerformance(workflowId, languageCode),
  };
}

export function createTemporalPlatform(options: TemporalPlatformOptions): TemporalPlatform {
  mkdirSync(options.rootPath, { recursive: true });

  const databasePath = join(options.rootPath, 'temporal-catalog.db');
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  new TemporalMigrationRunner(db).migrate();

  const repository = new TemporalRepository(db);
  const diagnostics = new TemporalDiagnostics();

  const alignerPort =
    options.alignerPort ??
    (options.useFixtureAdapters
      ? new FixtureRubberBandAdapter({
          fixturePath:
            options.fixtureAlignPath ?? resolveGoldenFixturePath('golden-rubberband-hi.json'),
        })
      : new RubberBandAdapter());

  const composerPort =
    options.composerPort ??
    (options.useFixtureAdapters
      ? new FixtureFfmpegCompositionAdapter({
          fixturePath:
            options.fixtureComposePath ?? resolveGoldenFixturePath('golden-ffmpeg-compose-hi.json'),
        })
      : new FfmpegCompositionAdapter());

  const alignAndComposeService = new AlignAndComposeService({
    eventBus: options.eventBus,
    repository,
    localizedDocumentReader: options.localizedDocumentReader,
    voicePerformanceReader: options.voicePerformanceReader,
    aligner: alignerPort,
    composerPort,
    artifactSink: options.artifactSink,
    extensionRuntime: options.extensionRuntime,
  });

  const application = new TemporalSynchronizationApplication(alignAndComposeService);

  return {
    application,
    repository,
    diagnostics,
    createExecutionAdapter(): TemporalExecutionAdapter {
      return new TemporalExecutionAdapter(application);
    },
    close(): void {
      db.close();
    },
  };
}
