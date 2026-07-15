import { describe, expect, it, vi } from 'vitest';

import { WORKFLOW_EVENTS } from './events.js';
import { createDomainEventBus, createDomainEventId } from './event-bus.js';

describe('DomainEventBus', () => {
  it('publishes events to global and typed subscribers', () => {
    const bus = createDomainEventBus();
    const globalHandler = vi.fn();
    const typedHandler = vi.fn();

    bus.subscribe(globalHandler);
    bus.subscribeToType(WORKFLOW_EVENTS.STARTED, typedHandler);

    const event = {
      id: createDomainEventId(),
      type: WORKFLOW_EVENTS.STARTED,
      timestamp: new Date().toISOString(),
      workflowId: 'wf-1',
      jobId: 'job-1',
    };

    bus.publish(event);

    expect(globalHandler).toHaveBeenCalledWith(event);
    expect(typedHandler).toHaveBeenCalledWith(event);
  });
});
