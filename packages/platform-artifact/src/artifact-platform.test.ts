import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createDomainEventBus, EXECUTION_EVENTS } from '@dubforge/platform-events';

import { createArtifactPlatform } from './artifact-platform.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('ArtifactPlatform', () => {
  it('creates the root directory when it does not exist', async () => {
    const parentPath = await mkdtemp(join(tmpdir(), 'dubforge-artifact-parent-'));
    tempDirs.push(parentPath);
    const rootPath = join(parentPath, 'nested', 'artifacts');
    const eventBus = createDomainEventBus();
    const platform = createArtifactPlatform(
      { rootPath, eventBus },
      {
        serialize: (state: { id: string; root: string }) => JSON.stringify(state),
        deserialize: (content) => JSON.parse(content) as { id: string; root: string },
        getWorkflowId: (state) => state.id,
        getArtifactRoot: (state) => state.root,
      },
    );

    expect(platform).toBeDefined();
    platform.close();
  });

  it('registers artifacts from execution events', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-artifact-'));
    tempDirs.push(rootPath);
    const eventBus = createDomainEventBus();
    const platform = createArtifactPlatform(
      { rootPath, eventBus },
      {
        serialize: (state: { id: string; root: string }) => JSON.stringify(state),
        deserialize: (content) => JSON.parse(content) as { id: string; root: string },
        getWorkflowId: (state) => state.id,
        getArtifactRoot: (state) => state.root,
      },
    );

    eventBus.publish({
      id: crypto.randomUUID(),
      type: EXECUTION_EVENTS.COMPLETED,
      timestamp: new Date().toISOString(),
      workflowId: 'wf-1',
      jobId: 'job-1',
      nodeId: 'node-1',
      adapterKind: 'mock',
      artifacts: { validate: '/tmp/artifacts/node-1.json' },
    });

    const resolved = platform.getResolver().resolve({ workflowId: 'wf-1', kind: 'validate' });
    expect(resolved).toHaveLength(1);
    platform.close();
  });
});
