import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { BINARIES_DIRECTORY } from '../constants.js';
import { AssetDatabase } from '../database/connection.js';
import { DownloadManager } from '../download/download-manager.js';
import { AssetHealthService } from '../health/asset-health.js';
import { runMigrations } from '../migrations/runner.js';
import { toModelView, type ModelHealthStatus, type ModelView } from '../presentation/model-view.js';
import type { AssetManifestRegistry } from '../registry/asset-manifest-registry.js';
import { AssetRepository } from '../repository/asset-repository.js';
import { AssetResolver } from '../resolver/asset-resolver.js';
import { ASSET_STATUSES } from '../types.js';
import type { AssetHealthReport, AssetRecord, DownloadRecord, ResolvedAsset } from '../types.js';
import { AssetVerifier } from '../verification/verifier.js';
import { VersionManager } from '../version/version-manager.js';

export interface AssetServiceOptions {
  readonly rootPath: string;
  readonly registry: AssetManifestRegistry;
}

export interface DependencyResolution {
  readonly assetId: string;
  readonly satisfied: boolean;
  readonly missingDependencies: readonly string[];
  readonly unsatisfiedRequired: readonly string[];
}

export class AssetService {
  private readonly database: AssetDatabase;
  private readonly repository: AssetRepository;
  private readonly downloadManager: DownloadManager;
  private readonly verifier: AssetVerifier;
  private readonly resolver: AssetResolver;
  private readonly healthService: AssetHealthService;
  private readonly versionManager: VersionManager;
  private healthByAssetId = new Map<string, ModelHealthStatus>();
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

    this.initialized = true;
  }

  listModelViews(): readonly ModelView[] {
    this.ensureInitialized();

    return this.options.registry.listAssets().map((registered) => {
      const installation = this.repository.getInstallation(registered.id);
      const downloads = this.downloadManager.listDownloadsByAsset(registered.id);
      const health = this.healthByAssetId.get(registered.id) ?? null;

      return toModelView({
        registered,
        installation,
        downloads,
        health,
      });
    });
  }

  listInstalledAssets(): readonly AssetRecord[] {
    this.ensureInitialized();
    return this.repository.listAssets().filter((asset) => asset.status === ASSET_STATUSES.READY);
  }

  getInstallation(assetId: string): AssetRecord | null {
    this.ensureInitialized();
    this.options.registry.requireAsset(assetId);
    return this.repository.getInstallation(assetId);
  }

  async downloadAsset(assetId: string, targetVersion?: string): Promise<DownloadRecord> {
    this.ensureInitialized();

    const registered = this.options.registry.requireAsset(assetId);
    this.repository.ensureInstallationRecord(registered);
    const version = targetVersion ?? registered.version;
    const manifest = registered.downloadManifest;
    const download = await this.downloadManager.enqueueDownload(assetId, version, manifest);
    const completed = await this.downloadManager.startDownload(download.id, manifest);
    await this.refreshInstallationHealth();
    return completed;
  }

  async downloadAssetInBackground(
    assetId: string,
    targetVersion?: string,
  ): Promise<DownloadRecord> {
    this.ensureInitialized();

    const registered = this.options.registry.requireAsset(assetId);
    this.repository.ensureInstallationRecord(registered);
    const version = targetVersion ?? registered.version;
    const manifest = registered.downloadManifest;
    const download = await this.downloadManager.enqueueDownload(assetId, version, manifest);
    void this.downloadManager.startDownload(download.id, manifest).catch(() => undefined);
    return download;
  }

  async repairAsset(assetId: string): Promise<DownloadRecord> {
    this.ensureInitialized();

    const registered = this.options.registry.requireAsset(assetId);
    const installation = this.repository.getInstallation(assetId);

    if (installation?.filePath !== null && installation?.filePath !== undefined) {
      await rm(dirname(installation.filePath), { recursive: true, force: true });
      this.repository.clearAssetBinary(assetId, ASSET_STATUSES.CORRUPTED);
    }

    return this.downloadAssetInBackground(assetId, registered.version);
  }

  async deleteAsset(assetId: string): Promise<void> {
    this.ensureInitialized();
    this.options.registry.requireAsset(assetId);

    const installation = this.repository.getInstallation(assetId);
    if (installation?.filePath !== null && installation?.filePath !== undefined) {
      await rm(dirname(installation.filePath), { recursive: true, force: true });
    }

    this.repository.deleteInstallation(assetId);
    this.healthByAssetId.delete(assetId);
  }

  async updateAsset(assetId: string, targetVersion?: string): Promise<DownloadRecord> {
    this.ensureInitialized();

    const registered = this.options.registry.requireAsset(assetId);
    const version = targetVersion ?? registered.latestVersion;
    const installation = this.repository.ensureInstallationRecord(registered);

    if (installation.status === ASSET_STATUSES.READY) {
      this.repository.updateAssetMetadata(assetId, { status: ASSET_STATUSES.OUTDATED });
    }

    return this.downloadAssetInBackground(assetId, version);
  }

  resolveAsset(assetId: string, requireReady = true): ResolvedAsset | null {
    this.ensureInitialized();
    return this.resolver.resolveById(assetId, { requireReady });
  }

  resolveDependencies(assetId: string): DependencyResolution {
    this.ensureInitialized();
    this.options.registry.requireAsset(assetId);

    const dependencies = this.options.registry.getDependencies(assetId);
    const missingDependencies: string[] = [];
    const unsatisfiedRequired: string[] = [];

    for (const dependency of dependencies) {
      const installation = this.repository.getInstallation(dependency.dependsOnAssetId);
      if (installation === null) {
        missingDependencies.push(dependency.dependsOnAssetId);
        if (!dependency.optional) {
          unsatisfiedRequired.push(dependency.dependsOnAssetId);
        }
        continue;
      }

      if (dependency.optional) {
        continue;
      }

      if (installation.status !== ASSET_STATUSES.READY) {
        unsatisfiedRequired.push(dependency.dependsOnAssetId);
      }
    }

    return {
      assetId,
      satisfied: missingDependencies.length === 0 && unsatisfiedRequired.length === 0,
      missingDependencies,
      unsatisfiedRequired,
    };
  }

  async verifyAsset(assetId: string): Promise<boolean> {
    this.ensureInitialized();
    const installation = this.repository.getInstallation(assetId);
    if (installation === null) {
      return false;
    }

    const result = await this.verifier.verifyAsset(assetId);
    return result.valid;
  }

  async refreshInstallationHealth(): Promise<void> {
    this.ensureInitialized();

    const reports = await this.checkInstalledHealth();
    this.healthByAssetId = new Map(
      reports.map((report) => [report.assetId, this.toModelHealth(report)]),
    );
  }

  async checkHealth(assetId: string): Promise<AssetHealthReport> {
    this.ensureInitialized();
    return this.healthService.checkAsset(assetId);
  }

  async checkInstalledHealth(): Promise<readonly AssetHealthReport[]> {
    this.ensureInitialized();

    const reports: AssetHealthReport[] = [];
    for (const registered of this.options.registry.listAssets()) {
      const installation = this.repository.getInstallation(registered.id);
      if (installation?.status !== ASSET_STATUSES.READY) {
        continue;
      }

      reports.push(await this.healthService.checkAsset(registered.id));
    }

    return reports;
  }

  getRepository(): AssetRepository {
    this.ensureInitialized();
    return this.repository;
  }

  getDownloadManager(): DownloadManager {
    this.ensureInitialized();
    return this.downloadManager;
  }

  getRegistry(): AssetManifestRegistry {
    return this.options.registry;
  }

  getVersionManager(): VersionManager {
    return this.versionManager;
  }

  close(): void {
    this.database.close();
  }

  private toModelHealth(report: AssetHealthReport): ModelHealthStatus {
    switch (report.status) {
      case 'healthy':
        return 'healthy';
      case 'degraded':
        return 'degraded';
      case 'unhealthy':
        return 'unhealthy';
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('AssetService must be initialized before use');
    }
  }
}

export async function createAssetService(
  rootPath: string,
  registry: AssetManifestRegistry,
): Promise<AssetService> {
  await mkdir(rootPath, { recursive: true });
  const service = new AssetService({ rootPath, registry });
  service.initialize();
  await service.refreshInstallationHealth();
  return service;
}
