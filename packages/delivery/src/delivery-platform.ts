import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import Database from 'better-sqlite3';

import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import type { ExtensionRuntime } from '@dubforge/providers';

import {
  FixtureFfmpegDeliveryAdapter,
  FixtureFfmpegValidatorAdapter,
  FfmpegDeliveryAdapter,
  FfmpegValidatorAdapter,
} from './adapters/ffmpeg-delivery-adapter.js';
import { JsonExportProfileLoader } from './adapters/export-profile-loader.js';
import { DeliveryApplication } from './application/delivery-application.js';
import {
  createPackageAndDeliverService,
  VerifyDeliverablesService,
} from './application/delivery-services.js';
import { DeliveryDiagnostics } from './diagnostics/delivery-diagnostics.js';
import { DeliveryExecutionAdapter } from './integration/delivery-execution-adapter.js';
import { resolveGoldenFixturePath } from './integration/adapter-registry.js';
import type { ExporterPort, ValidatorPort } from './ports/delivery-ports.js';
import { DeliveryRepository } from './persistence/delivery-repository.js';
import { DeliveryMigrationRunner } from './persistence/sqlite/migrations.js';

export interface DeliveryPlatformOptions {
  readonly rootPath: string;
  readonly eventBus: DomainEventBus;
  readonly artifactSink?: ArtifactSink;
  readonly extensionRuntime?: ExtensionRuntime;
  readonly exporterPort?: ExporterPort;
  readonly validatorPort?: ValidatorPort;
  readonly useFixtureAdapters?: boolean;
  readonly fixtureExportPath?: string;
  readonly fixtureValidationPath?: string;
}

export interface DeliveryPlatform {
  readonly application: DeliveryApplication;
  readonly repository: DeliveryRepository;
  readonly diagnostics: DeliveryDiagnostics;
  createExecutionAdapter(): DeliveryExecutionAdapter;
  close(): void;
}

export function createDeliveryPlatform(options: DeliveryPlatformOptions): DeliveryPlatform {
  mkdirSync(options.rootPath, { recursive: true });

  const databasePath = join(options.rootPath, 'delivery-catalog.db');
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  new DeliveryMigrationRunner(db).migrate();

  const repository = new DeliveryRepository(db);
  const diagnostics = new DeliveryDiagnostics();
  const profileLoader = new JsonExportProfileLoader();

  const exporterPort =
    options.exporterPort ??
    (options.useFixtureAdapters
      ? new FixtureFfmpegDeliveryAdapter({
          fixturePath:
            options.fixtureExportPath ?? resolveGoldenFixturePath('golden-delivery-export.json'),
        })
      : new FfmpegDeliveryAdapter());

  const validatorPort =
    options.validatorPort ??
    (options.useFixtureAdapters
      ? new FixtureFfmpegValidatorAdapter({
          fixturePath:
            options.fixtureValidationPath ??
            resolveGoldenFixturePath('golden-delivery-validation.json'),
        })
      : new FfmpegValidatorAdapter());

  const verifyService = new VerifyDeliverablesService({
    eventBus: options.eventBus,
    repository,
    validator: validatorPort,
    artifactSink: options.artifactSink,
  });

  const packageService = createPackageAndDeliverService({
    eventBus: options.eventBus,
    repository,
    profileLoader,
    exporter: exporterPort,
    validator: validatorPort,
    artifactSink: options.artifactSink,
  });

  const application = new DeliveryApplication(verifyService, packageService);

  return {
    application,
    repository,
    diagnostics,
    createExecutionAdapter(): DeliveryExecutionAdapter {
      return new DeliveryExecutionAdapter(application);
    },
    close(): void {
      db.close();
    },
  };
}
