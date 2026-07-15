import type { AssetDiagnostics, Model, VerifyModelResult } from '@dubforge/types';
import {
  assetDiagnosticsResponseSchema,
  modelResponseSchema,
  verifyModelResponseSchema,
} from '@dubforge/shared';
import type { AssetPlatform, ModelView } from '@dubforge/assets';

type ModelChangeListener = () => void;

function toModel(view: ModelView): Model {
  return modelResponseSchema.parse(view);
}

export class DesktopModelService {
  private readonly listeners = new Set<ModelChangeListener>();
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(private readonly assetPlatform: AssetPlatform) {
    this.startPolling();
  }

  listModels(): readonly Model[] {
    return this.assetPlatform.listModels().map(toModel);
  }

  findModel(id: string): Model | null {
    return this.listModels().find((model) => model.id === id) ?? null;
  }

  async downloadModel(id: string): Promise<Model> {
    await this.assetPlatform.service.downloadAssetInBackground(id);
    this.notifyListeners();
    const model = this.findModel(id);
    if (model === null) {
      throw new Error(`Model not found: ${id}`);
    }

    return model;
  }

  async deleteModel(id: string): Promise<void> {
    await this.assetPlatform.service.deleteAsset(id);
    this.notifyListeners();
  }

  async updateModel(id: string): Promise<Model> {
    const registered = this.assetPlatform.registry.getAsset(id);
    if (registered === null) {
      throw new Error(`Model not found in registry: ${id}`);
    }

    await this.assetPlatform.service.updateAsset(id, registered.latestVersion);
    this.notifyListeners();

    const model = this.findModel(id);
    if (model === null) {
      throw new Error(`Model not found: ${id}`);
    }

    return model;
  }

  async verifyModel(id: string): Promise<VerifyModelResult> {
    const verificationReport = await this.assetPlatform.service.verifyAsset(id);
    await this.assetPlatform.refreshRegistry();

    this.notifyListeners();
    const model = this.findModel(id);
    if (model === null) {
      throw new Error(`Model not found: ${id}`);
    }

    return verifyModelResponseSchema.parse({
      model,
      verificationReport,
    });
  }

  getDiagnostics(id: string): AssetDiagnostics {
    if (this.assetPlatform.registry.getAsset(id) === null) {
      throw new Error(`Model not found in registry: ${id}`);
    }

    return assetDiagnosticsResponseSchema.parse(this.assetPlatform.service.getDiagnostics(id));
  }

  async repairModel(id: string): Promise<Model> {
    await this.assetPlatform.service.repairAsset(id);
    this.notifyListeners();
    const model = this.findModel(id);
    if (model === null) {
      throw new Error(`Model not found: ${id}`);
    }

    return model;
  }

  setChangeListener(listener: ModelChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.listeners.clear();
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      const hasActiveDownloads =
        this.assetPlatform.service.getDownloadManager().listActiveDownloads().length > 0;

      if (hasActiveDownloads) {
        void this.assetPlatform
          .refreshRegistry()
          .then(() => {
            this.notifyListeners();
          })
          .catch(() => {
            this.notifyListeners();
          });
      }
    }, 500);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
