import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import Database from 'better-sqlite3';

import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import type { ExtensionRuntime } from '@dubforge/providers';

import { TranscriptionApplication } from './application/transcription-application.js';
import {
  BuildTranscriptService,
  RecognizeSpeechService,
  TranslateTranscriptService,
} from './application/transcription-services.js';
import {
  FasterWhisperAdapter,
  FixtureFasterWhisperAdapter,
} from './adapters/faster-whisper/faster-whisper-adapter.js';
import { CanonicalTranslateAdapter } from './adapters/translation/canonical-translate-adapter.js';
import { TranscriptionDiagnostics } from './diagnostics/transcription-diagnostics.js';
import { TranscriptionExecutionAdapter } from './integration/transcription-execution-adapter.js';
import { resolveGoldenFixturePath } from './integration/adapter-registry.js';
import type { RecognizeSpeechPort, TranslateTranscriptPort } from './ports/transcription-ports.js';
import { LocalizationRepository } from './repository/localization-repository.js';
import { TranscriptionMigrationRunner } from './repository/sqlite/migrations.js';
import { createTranscriptProcessingPlatform } from './processing/transcript-processing-platform.js';

export interface TranscriptionPlatformPorts {
  readonly recognizePort: RecognizeSpeechPort;
  readonly translatePort: TranslateTranscriptPort;
}

export interface TranscriptionPlatformOptions {
  readonly rootPath: string;
  readonly eventBus: DomainEventBus;
  readonly artifactSink?: ArtifactSink;
  readonly extensionRuntime?: ExtensionRuntime;
  readonly useFixtureAdapters?: boolean;
  readonly fixtureRecognizePath?: string;
  readonly ports?: TranscriptionPlatformPorts;
}

export interface TranscriptionPlatform {
  readonly application: TranscriptionApplication;
  readonly repository: LocalizationRepository;
  readonly diagnostics: TranscriptionDiagnostics;
  createExecutionAdapter(): TranscriptionExecutionAdapter;
  close(): void;
}

export function createTranscriptionPlatform(
  options: TranscriptionPlatformOptions,
): TranscriptionPlatform {
  mkdirSync(options.rootPath, { recursive: true });

  const databasePath = join(options.rootPath, 'localization-catalog.db');
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  new TranscriptionMigrationRunner(db).migrate();

  const repository = new LocalizationRepository(db);
  const diagnostics = new TranscriptionDiagnostics();
  const processingPlatform = createTranscriptProcessingPlatform();

  const recognizePort =
    options.ports?.recognizePort ??
    (options.useFixtureAdapters
      ? new FixtureFasterWhisperAdapter({
          fixturePath:
            options.fixtureRecognizePath ?? resolveGoldenFixturePath('golden-faster-whisper.json'),
        })
      : new FasterWhisperAdapter());

  const translatePort = options.ports?.translatePort ?? new CanonicalTranslateAdapter();

  const recognizeService = new RecognizeSpeechService({
    eventBus: options.eventBus,
    repository,
    recognizePort,
    processingPlatform,
    artifactSink: options.artifactSink,
    extensionRuntime: options.extensionRuntime,
  });

  const buildService = new BuildTranscriptService({
    eventBus: options.eventBus,
    repository,
    processingPlatform,
    artifactSink: options.artifactSink,
  });

  const translateService = new TranslateTranscriptService({
    eventBus: options.eventBus,
    repository,
    translatePort,
    processingPlatform,
    artifactSink: options.artifactSink,
    extensionRuntime: options.extensionRuntime,
  });

  const application = new TranscriptionApplication(
    recognizeService,
    buildService,
    translateService,
  );

  return {
    application,
    repository,
    diagnostics,
    createExecutionAdapter(): TranscriptionExecutionAdapter {
      return new TranscriptionExecutionAdapter(application);
    },
    close(): void {
      db.close();
    },
  };
}
