import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import Database from 'better-sqlite3';

import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import type { ExtensionRuntime } from '@dubforge/providers';
import type { LocalizationRepository as TranscriptionLocalizationRepository } from '@dubforge/transcription';

import { FixtureSeamlessAdapter, SeamlessAdapter } from './adapters/seamless/seamless-adapter.js';
import { LocalizationApplication } from './application/localization-application.js';
import {
  BuildSubtitleService,
  TranslateDocumentService,
} from './application/localization-services.js';
import { LocalizationDiagnostics } from './diagnostics/localization-diagnostics.js';
import { createLocalizationEngine } from './engine/localization-engine.js';
import { LocalizationExecutionAdapter } from './integration/localization-execution-adapter.js';
import { resolveGoldenFixturePath } from './integration/adapter-registry.js';
import type { CanonicalTranscriptReader, TranslatorPort } from './ports/localization-ports.js';
import { LocalizationRepository } from './repository/localization-repository.js';
import { LocalizationMigrationRunner } from './repository/sqlite/migrations.js';

export interface LocalizationPlatformOptions {
  readonly rootPath: string;
  readonly eventBus: DomainEventBus;
  readonly artifactSink?: ArtifactSink;
  readonly extensionRuntime?: ExtensionRuntime;
  readonly transcriptReader: CanonicalTranscriptReader;
  readonly translatorPort?: TranslatorPort;
  readonly useFixtureAdapters?: boolean;
  readonly fixtureTranslatePath?: string;
}

export interface LocalizationPlatform {
  readonly application: LocalizationApplication;
  readonly repository: LocalizationRepository;
  readonly diagnostics: LocalizationDiagnostics;
  createExecutionAdapter(): LocalizationExecutionAdapter;
  close(): void;
}

export function createTranscriptReaderFromRepository(
  repository: TranscriptionLocalizationRepository,
): CanonicalTranscriptReader {
  return {
    getCanonicalTranscript: (workflowId, languageCode) =>
      repository.getCanonicalTranscript(workflowId, languageCode),
  };
}

export function createLocalizationPlatform(
  options: LocalizationPlatformOptions,
): LocalizationPlatform {
  mkdirSync(options.rootPath, { recursive: true });

  const databasePath = join(options.rootPath, 'localization-catalog.db');
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  new LocalizationMigrationRunner(db).migrate();

  const repository = new LocalizationRepository(db);
  const diagnostics = new LocalizationDiagnostics();

  const translatorPort =
    options.translatorPort ??
    (options.useFixtureAdapters
      ? new FixtureSeamlessAdapter({
          fixturePath:
            options.fixtureTranslatePath ?? resolveGoldenFixturePath('golden-seamless-hi.json'),
        })
      : new SeamlessAdapter());

  const localizationEngine = createLocalizationEngine({
    translator: translatorPort,
    repository,
  });

  const translateService = new TranslateDocumentService({
    eventBus: options.eventBus,
    repository,
    transcriptReader: options.transcriptReader,
    localizationEngine,
    artifactSink: options.artifactSink,
    extensionRuntime: options.extensionRuntime,
  });

  const subtitleService = new BuildSubtitleService({
    eventBus: options.eventBus,
    repository,
    transcriptReader: options.transcriptReader,
    artifactSink: options.artifactSink,
  });

  const application = new LocalizationApplication(translateService, subtitleService);

  return {
    application,
    repository,
    diagnostics,
    createExecutionAdapter(): LocalizationExecutionAdapter {
      return new LocalizationExecutionAdapter(application);
    },
    close(): void {
      db.close();
    },
  };
}
