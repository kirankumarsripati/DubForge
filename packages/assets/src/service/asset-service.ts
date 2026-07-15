import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { BINARIES_DIRECTORY } from '../constants.js';
import { DEFAULT_ASSET_CATALOG, DEFAULT_ASSET_DEPENDENCIES } from '../catalog/default-catalog.js';
import { AssetDatabase } from '../database/connection.js';
import { DependencyTracker } from '../dependencies/dependency-tracker.js';
import { DownloadManager } from '../download/download-manager.js';
import { AssetHealthService } from '../health/asset-health.js';
import { runMigrations } from '../migrations/runner.js';
import { AssetRepository } from '../repository/asset-repository.js';
import { AssetResolver } from '../resolver/asset-resolver.js';
import { ASSET_STATUSES } from '../types.js';
import type {
  AssetHealthReport,
  AssetRecord,
  CreateAssetInput,
  DownloadRecord,
  ResolvedAsset,
} from '../types.js';
import type { DependencyResolution } from '../dependencies/dependency-tracker.js';
import { AssetVerifier } from '../verification/verifier.js';
import { VersionManager } from '../version/version-manager.js';

export interface AssetServiceOptions {
  readonly rootPath: string;
  readonly seedCatalog?: boolean;
}

export class AssetService {
  private readonly database: AssetDatabase;
  private readonly repository: AssetRepository;
  private readonly downloadManager: DownloadManager;
  private readonly verifier: AssetVerifier;
  private readonly resolver: AssetResolver;
  private readonly dependencyTracker: DependencyTracker;
  private readonly healthService: AssetHealthService;
  private readonly versionManager: VersionManager;
  private initialized = false;

  constructor(private readonly options: AssetServiceOptions) {
    this.database = new AssetDatabase({
      databasePath: join(options.rootPath, 'assets.db'),
    });
    runMigrations(this.database.raw);
    this.repository = new AssetRepository(this.database.raw);
    this.versionManager = new VersionManager();
    const binariesRoot = join(options.rootPath, BINARIES_DIRECTORY);
    this.downloadManager = new DownloadManager(this.database.raw, this.repository, {
      binariesRoot,
    });
    this.verifier = new AssetVerifier(this.repository);
    this.resolver = new AssetResolver(this.repository, this.versionManager);
    this.dependencyTracker = new DependencyTracker(this.repository);
    this.healthService = new AssetHealthService(
      this.repository,
      this.verifier,
      this.versionManager,
    );
  }

  initialize(): void {
    if (this.initialized) {
      return;
    }

    if (this.options.seedCatalog !== false) {
      this.seedCatalog(DEFAULT_ASSET_CATALOG, DEFAULT_ASSET_DEPENDENCIES);
    }

    this.initialized = true;
  }

  seedCatalog(
    catalog: readonly CreateAssetInput[],
    dependencies: readonly {
      readonly assetId: string;
      readonly dependsOnAssetId: string;
      readonly optional: boolean;
    }[] = [],
  ): void {
    const seed = () => {
      this.database.transaction(() => {
        for (const entry of catalog) {
          const existing = this.repository.getAssetById(entry.id);
          if (existing === null) {
            this.repository.createAsset(entry);
          }
        }

        for (const dependency of dependencies) {
          const existingDependencies = this.repository.listDependencies(dependency.assetId);
          const alreadyExists = existingDependencies.some(
            (entry) => entry.dependsOnAssetId === dependency.dependsOnAssetId,
          );
          if (!alreadyExists) {
            this.repository.addDependency(
              dependency.assetId,
              dependency.dependsOnAssetId,
              dependency.optional,
            );
          }
        }
      });
    };

    seed();
  }

  listAssets(): readonly AssetRecord[] {
    this.ensureInitialized();
    return this.repository.listAssets();
  }

  getAsset(assetId: string): AssetRecord | null {
    this.ensureInitialized();
    return this.repository.getAssetById(assetId);
  }

  async downloadAsset(assetId: string, targetVersion?: string): Promise<DownloadRecord> {
    this.ensureInitialized();

    const asset = this.repository.getAssetById(assetId);
    if (asset === null) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const version = targetVersion ?? asset.version;
    const download = await this.downloadManager.enqueueDownload(assetId, version);
    return this.downloadManager.startDownload(download.id);
  }

  async deleteAsset(assetId: string): Promise<AssetRecord> {
    this.ensureInitialized();

    const asset = this.repository.getAssetById(assetId);
    if (asset === null) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    if (asset.filePath !== null) {
      await rm(dirname(asset.filePath), { recursive: true, force: true });
    }

    return this.repository.clearAssetBinary(assetId, ASSET_STATUSES.MISSING);
  }

  async updateAsset(assetId: string, targetVersion: string): Promise<DownloadRecord> {
    this.ensureInitialized();

    const asset = this.repository.getAssetById(assetId);
    if (asset === null) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    this.repository.updateAssetMetadata(assetId, { status: ASSET_STATUSES.OUTDATED });
    return this.downloadAsset(assetId, targetVersion);
  }

  resolveAsset(assetId: string, requireReady = true): ResolvedAsset | null {
    this.ensureInitialized();
    return this.resolver.resolveById(assetId, { requireReady });
  }

  resolveDependencies(assetId: string): DependencyResolution {
    this.ensureInitialized();
    return this.dependencyTracker.resolveDependencies(assetId);
  }

  async verifyAsset(assetId: string): Promise<boolean> {
    this.ensureInitialized();
    const result = await this.verifier.verifyAsset(assetId);
    return result.valid;
  }

  async checkHealth(assetId: string): Promise<AssetHealthReport> {
    this.ensureInitialized();
    return this.healthService.checkAsset(assetId);
  }

  async checkAllHealth(): Promise<readonly AssetHealthReport[]> {
    this.ensureInitialized();
    return this.healthService.checkAll();
  }

  getRepository(): AssetRepository {
    this.ensureInitialized();
    return this.repository;
  }

  getDownloadManager(): DownloadManager {
    this.ensureInitialized();
    return this.downloadManager;
  }

  getDependencyTracker(): DependencyTracker {
    this.ensureInitialized();
    return this.dependencyTracker;
  }

  getVersionManager(): VersionManager {
    return this.versionManager;
  }

  close(): void {
    this.database.close();
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('AssetService must be initialized before use');
    }
  }
}

export async function createAssetService(
  rootPath: string,
  options: Omit<AssetServiceOptions, 'rootPath'> = {},
): Promise<AssetService> {
  await mkdir(rootPath, { recursive: true });
  const service = new AssetService({ rootPath, ...options });
  service.initialize();
  return service;
}
