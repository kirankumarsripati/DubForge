import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import Database from 'better-sqlite3';

import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import type { LocalizationRepository } from '@dubforge/localization';
import type { ExtensionRuntime } from '@dubforge/providers';

import { FixtureKokoroAdapter, KokoroAdapter } from './adapters/kokoro/kokoro-adapter.js';
import { VoicePerformanceApplication } from './application/voice-performance-application.js';
import {
  AlignSpeechService,
  SynthesizeSpeechService,
} from './application/voice-performance-services.js';
import { VoicePerformanceDiagnostics } from './diagnostics/voice-performance-diagnostics.js';
import { createPerformancePlanner } from './engine/performance-planner.js';
import { createSpeechSynthesisEngine } from './engine/speech-synthesis-engine.js';
import { VoicePerformanceExecutionAdapter } from './integration/voice-performance-execution-adapter.js';
import { resolveGoldenFixturePath } from './integration/adapter-registry.js';
import type {
  LocalizedDocumentReader,
  SpeechSynthesizerPort,
} from './ports/voice-performance-ports.js';
import { VoicePerformanceRepository } from './repository/voice-performance-repository.js';
import { VoicePerformanceMigrationRunner } from './repository/sqlite/migrations.js';

export interface VoicePerformancePlatformOptions {
  readonly rootPath: string;
  readonly eventBus: DomainEventBus;
  readonly artifactSink?: ArtifactSink;
  readonly extensionRuntime?: ExtensionRuntime;
  readonly localizedDocumentReader: LocalizedDocumentReader;
  readonly synthesizerPort?: SpeechSynthesizerPort;
  readonly useFixtureAdapters?: boolean;
  readonly fixtureSynthesisPath?: string;
}

export interface VoicePerformancePlatform {
  readonly application: VoicePerformanceApplication;
  readonly repository: VoicePerformanceRepository;
  readonly diagnostics: VoicePerformanceDiagnostics;
  createExecutionAdapter(): VoicePerformanceExecutionAdapter;
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

export function createVoicePerformancePlatform(
  options: VoicePerformancePlatformOptions,
): VoicePerformancePlatform {
  mkdirSync(options.rootPath, { recursive: true });

  const databasePath = join(options.rootPath, 'voice-performance-catalog.db');
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  new VoicePerformanceMigrationRunner(db).migrate();

  const repository = new VoicePerformanceRepository(db);
  const diagnostics = new VoicePerformanceDiagnostics();

  const synthesizerPort =
    options.synthesizerPort ??
    (options.useFixtureAdapters
      ? new FixtureKokoroAdapter({
          fixturePath:
            options.fixtureSynthesisPath ?? resolveGoldenFixturePath('golden-kokoro-hi.json'),
        })
      : new KokoroAdapter());

  const synthesisEngine = createSpeechSynthesisEngine({
    planner: createPerformancePlanner(),
    synthesizer: synthesizerPort,
  });

  const synthesizeService = new SynthesizeSpeechService({
    eventBus: options.eventBus,
    repository,
    localizedDocumentReader: options.localizedDocumentReader,
    synthesisEngine,
    artifactSink: options.artifactSink,
    extensionRuntime: options.extensionRuntime,
  });

  const alignService = new AlignSpeechService({
    eventBus: options.eventBus,
    repository,
    artifactSink: options.artifactSink,
  });

  const application = new VoicePerformanceApplication(synthesizeService, alignService);

  return {
    application,
    repository,
    diagnostics,
    createExecutionAdapter(): VoicePerformanceExecutionAdapter {
      return new VoicePerformanceExecutionAdapter(application);
    },
    close(): void {
      db.close();
    },
  };
}
