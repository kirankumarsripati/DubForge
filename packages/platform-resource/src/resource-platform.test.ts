import { describe, expect, it } from 'vitest';

import { createDomainEventBus, RESOURCE_EVENTS } from '@dubforge/platform-events';

import { createResourcePlatform } from './resource-platform.js';

describe('ResourcePlatform', () => {
  it('captures resource snapshots and publishes events', async () => {
    const eventBus = createDomainEventBus();
    const events: string[] = [];
    eventBus.subscribe((event) => events.push(event.type));

    const platform = createResourcePlatform({ eventBus });
    const snapshot = await platform.captureSnapshot('/');

    expect(snapshot.memoryTotalMb).toBeGreaterThan(0);
    expect(events).toContain(RESOURCE_EVENTS.SNAPSHOT);
  });
});
