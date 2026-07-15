import { GitHubReleaseDownloadProvider } from './providers/github-release-download-provider.js';
import { HuggingFaceDownloadProvider } from './providers/huggingface-download-provider.js';
import { LocalFileDownloadProvider } from './providers/local-file-download-provider.js';
import { MirrorDownloadProvider } from './providers/mirror-download-provider.js';
import type { DownloadProvider, DownloadSource } from './types.js';

export class DownloadProviderRegistry {
  constructor(private readonly providers: readonly DownloadProvider[]) {}

  resolve(source: DownloadSource): DownloadProvider | null {
    return this.providers.find((provider) => provider.canHandle(source)) ?? null;
  }

  listProviders(): readonly DownloadProvider[] {
    return this.providers;
  }
}

export function createDefaultDownloadProviderRegistry(): DownloadProviderRegistry {
  return new DownloadProviderRegistry([
    new LocalFileDownloadProvider(),
    new GitHubReleaseDownloadProvider(),
    new HuggingFaceDownloadProvider(),
    new MirrorDownloadProvider(),
  ]);
}
