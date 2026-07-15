import { randomUUID } from 'node:crypto';

import {
  createDomainEventId,
  OBSERVABILITY_EVENTS,
  type DomainEvent,
  type DomainEventBus,
} from '@dubforge/platform-events';
import type { NodeKind } from '@dubforge/types';

export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

export interface StructuredLogEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly context: Readonly<Record<string, string>>;
}

export interface MetricEntry {
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly timestamp: string;
}

export interface TimelineEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string | null;
  readonly nodeKind: NodeKind | null;
  readonly label: string;
  readonly status: string;
}

export interface TraceSpan {
  readonly spanId: string;
  readonly spanName: string;
  readonly parentSpanId: string | null;
  readonly workflowId: string;
  readonly jobId: string;
  readonly startedAt: string;
  readonly endedAt: string | null;
}

export class StructuredLogger {
  private readonly entries: StructuredLogEntry[] = [];

  record(entry: StructuredLogEntry): void {
    this.entries.push(entry);
  }

  getEntries(): readonly StructuredLogEntry[] {
    return this.entries;
  }
}

export class MetricsCollector {
  private readonly metrics = new Map<string, MetricEntry[]>();

  record(metric: MetricEntry): void {
    const existing = this.metrics.get(metric.name) ?? [];
    existing.push(metric);
    this.metrics.set(metric.name, existing);
  }

  getMetric(name: string): readonly MetricEntry[] {
    return this.metrics.get(name) ?? [];
  }
}

export class TimelineRecorder {
  private readonly entries: TimelineEntry[] = [];

  record(entry: TimelineEntry): void {
    this.entries.push(entry);
  }

  getTimeline(workflowId: string): readonly TimelineEntry[] {
    return this.entries.filter((entry) => entry.workflowId === workflowId);
  }
}

export class Tracer {
  private readonly spans = new Map<string, TraceSpan>();

  startSpan(
    spanName: string,
    workflowId: string,
    jobId: string,
    parentSpanId: string | null = null,
  ): string {
    const spanId = randomUUID();
    this.spans.set(spanId, {
      spanId,
      spanName,
      parentSpanId,
      workflowId,
      jobId,
      startedAt: new Date().toISOString(),
      endedAt: null,
    });
    return spanId;
  }

  endSpan(spanId: string): void {
    const span = this.spans.get(spanId);
    if (span === undefined) {
      return;
    }

    this.spans.set(spanId, { ...span, endedAt: new Date().toISOString() });
  }

  getSpans(workflowId: string): readonly TraceSpan[] {
    return [...this.spans.values()].filter((span) => span.workflowId === workflowId);
  }
}

export interface ObservabilityPlatformOptions {
  readonly eventBus: DomainEventBus;
}

export class ObservabilityPlatform {
  private readonly logger = new StructuredLogger();
  private readonly metrics = new MetricsCollector();
  private readonly timeline = new TimelineRecorder();
  private readonly tracer = new Tracer();
  private readonly unsubscribe: () => void;

  constructor(private readonly options: ObservabilityPlatformOptions) {
    this.unsubscribe = options.eventBus.subscribe((event) => {
      this.handleDomainEvent(event);
    });
  }

  getLogger(): StructuredLogger {
    return this.logger;
  }

  getMetrics(): MetricsCollector {
    return this.metrics;
  }

  getTimeline(): TimelineRecorder {
    return this.timeline;
  }

  getTracer(): Tracer {
    return this.tracer;
  }

  dispose(): void {
    this.unsubscribe();
  }

  private handleDomainEvent(event: DomainEvent): void {
    if (event.type.startsWith('observability.')) {
      return;
    }
    const timestamp = event.timestamp;
    const logEntry: StructuredLogEntry = {
      id: createDomainEventId(),
      timestamp,
      level: event.type.includes('failed') ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO,
      message: event.type,
      workflowId: event.workflowId,
      jobId: event.jobId,
      context: { eventType: event.type },
    };

    this.logger.record(logEntry);

    this.options.eventBus.publish({
      id: createDomainEventId(),
      type: OBSERVABILITY_EVENTS.LOG_RECORDED,
      timestamp,
      workflowId: event.workflowId,
      jobId: event.jobId,
      level: logEntry.level,
      message: logEntry.message,
      context: logEntry.context,
    });

    this.metrics.record({
      name: `domain_event.${event.type}`,
      value: 1,
      unit: 'count',
      timestamp,
    });

    this.options.eventBus.publish({
      id: createDomainEventId(),
      type: OBSERVABILITY_EVENTS.METRIC_RECORDED,
      timestamp,
      workflowId: event.workflowId,
      jobId: event.jobId,
      name: `domain_event.${event.type}`,
      value: 1,
      unit: 'count',
    });

    if ('nodeId' in event) {
      this.timeline.record({
        id: createDomainEventId(),
        timestamp,
        workflowId: event.workflowId,
        jobId: event.jobId,
        nodeId: event.nodeId,
        nodeKind: null,
        label: event.type,
        status: event.type,
      });

      this.options.eventBus.publish({
        id: createDomainEventId(),
        type: OBSERVABILITY_EVENTS.TIMELINE_ENTRY,
        timestamp,
        workflowId: event.workflowId,
        jobId: event.jobId,
        nodeId: event.nodeId,
        nodeKind: null,
        label: event.type,
        status: event.type,
      });
    }

    if (event.type.endsWith('.started')) {
      const spanId = this.tracer.startSpan(event.type, event.workflowId, event.jobId);
      this.options.eventBus.publish({
        id: createDomainEventId(),
        type: OBSERVABILITY_EVENTS.SPAN_STARTED,
        timestamp,
        workflowId: event.workflowId,
        jobId: event.jobId,
        spanId,
        spanName: event.type,
        parentSpanId: null,
      });
    }
  }
}

export function createObservabilityPlatform(
  options: ObservabilityPlatformOptions,
): ObservabilityPlatform {
  return new ObservabilityPlatform(options);
}
