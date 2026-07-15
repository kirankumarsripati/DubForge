import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { createMediaPlatform, type MediaPlatform } from '@dubforge/media';
import { createArtifactPlatform } from '@dubforge/platform-artifact';
import { createDomainEventBus } from '@dubforge/platform-events';

export interface DesktopMediaStack {
  readonly mediaPlatform: MediaPlatform;
  readonly artifactRoot: string;
  close(): void;
}

export interface DesktopMediaStackOptions {
  readonly userDataPath: string;
  readonly ffprobePath?: string;
}

export function resolveFfprobePath(): string {
  return process.env.FFPROBE_PATH ?? 'ffprobe';
}

export function createDesktopMediaStack(options: DesktopMediaStackOptions): DesktopMediaStack {
  const mediaRoot = join(options.userDataPath, 'media');
  const artifactRoot = join(options.userDataPath, 'import-artifacts');
  mkdirSync(artifactRoot, { recursive: true });

  const eventBus = createDomainEventBus();
  const artifactPlatform = createArtifactPlatform<{ readonly workflowId: string }>(
    { rootPath: join(options.userDataPath, 'artifacts'), eventBus },
    {
      serialize: (state) => JSON.stringify(state),
      deserialize: (content) => JSON.parse(content) as { workflowId: string },
      getWorkflowId: (state) => state.workflowId,
      getArtifactRoot: () => artifactRoot,
    },
  );

  const mediaPlatform = createMediaPlatform({
    rootPath: mediaRoot,
    eventBus,
    artifactSink: artifactPlatform.getArtifactSink(),
    ffprobePath: options.ffprobePath ?? resolveFfprobePath(),
    useFixtureAdapters: false,
  });

  return {
    mediaPlatform,
    artifactRoot,
    close(): void {
      mediaPlatform.close();
      artifactPlatform.close();
    },
  };
}
