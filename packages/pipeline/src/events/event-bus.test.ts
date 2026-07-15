import { describe, expect, it, vi } from 'vitest';
import { createWorkflowEventBus, WORKFLOW_EVENT_TYPES } from './event-bus';

describe('createWorkflowEventBus', () => {
  it('publishes events to subscribers', () => {
    const bus = createWorkflowEventBus();
    const handler = vi.fn();

    const unsubscribe = bus.subscribe(handler);
    bus.publish({
      type: WORKFLOW_EVENT_TYPES.WORKFLOW_STARTED,
      workflowId: 'wf-1',
      jobId: 'job-1',
      timestamp: new Date().toISOString(),
    });

    expect(handler).toHaveBeenCalledTimes(1);
    unsubscribe();
    bus.publish({
      type: WORKFLOW_EVENT_TYPES.WORKFLOW_COMPLETED,
      workflowId: 'wf-1',
      jobId: 'job-1',
      timestamp: new Date().toISOString(),
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
