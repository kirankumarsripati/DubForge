import { describe, expect, it } from 'vitest';

import { createDomainEventBus, WORKFLOW_EVENTS } from '@dubforge/platform-events';

import { createObservabilityPlatform } from './observability-platform.js';

describe('ObservabilityPlatform', () => {
  it('records logs metrics and timeline from domain events', () => {
    const eventBus = createDomainEventBus();
    const observability = createObservabilityPlatform({ eventBus });

    eventBus.publish({
      id: crypto.randomUUID(),
      type: WORKFLOW_EVENTS.STARTED,
      timestamp: new Date().toISOString(),
      workflowId: 'wf-1',
      jobId: 'job-1',
    });

    eventBus.publish({
      id: crypto.randomUUID(),
      type: WORKFLOW_EVENTS.NODE_STARTED,
      timestamp: new Date().toISOString(),
      workflowId: 'wf-1',
      jobId: 'job-1',
      nodeId: 'node-1',
    });

    expect(observability.getLogger().getEntries().length).toBeGreaterThan(0);
    expect(observability.getMetrics().getMetric('domain_event.workflow.started')).toHaveLength(1);
    expect(observability.getTimeline().getTimeline('wf-1').length).toBeGreaterThan(0);
    observability.dispose();
  });
});
