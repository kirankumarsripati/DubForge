import { statfs } from 'node:fs';
import { promisify } from 'node:util';
import os from 'node:os';

import {
  createDomainEventId,
  RESOURCE_EVENTS,
  type DomainEventBus,
} from '@dubforge/platform-events';

const statfsAsync = promisify(statfs);

export interface ResourceSnapshot {
  readonly timestamp: string;
  readonly cpuPercent: number;
  readonly memoryUsedMb: number;
  readonly memoryTotalMb: number;
  readonly gpuPercent: number | null;
  readonly diskUsedGb: number;
  readonly diskTotalGb: number;
}

export interface ResourceThresholds {
  readonly cpuPercent?: number;
  readonly memoryPercent?: number;
  readonly diskPercent?: number;
}

export interface ResourcePlatformOptions {
  readonly eventBus: DomainEventBus;
  readonly thresholds?: ResourceThresholds;
  readonly workflowId?: string;
  readonly jobId?: string;
}

export class CpuMonitor {
  sample(): number {
    const load = os.loadavg()[0] ?? 0;
    const cores = os.cpus().length;
    return Math.min(100, Math.round((load / cores) * 100));
  }
}

export class MemoryMonitor {
  sample(): { readonly usedMb: number; readonly totalMb: number } {
    const totalMb = Math.round(os.totalmem() / (1024 * 1024));
    const freeMb = Math.round(os.freemem() / (1024 * 1024));
    return { usedMb: totalMb - freeMb, totalMb };
  }
}

export class GpuMonitor {
  sample(): number | null {
    return null;
  }
}

export class DiskMonitor {
  async sample(path: string): Promise<{ readonly usedGb: number; readonly totalGb: number }> {
    const stats = await statfsAsync(path);
    const totalBytes = stats.blocks * stats.bsize;
    const freeBytes = stats.bfree * stats.bsize;
    const usedBytes = totalBytes - freeBytes;
    return {
      usedGb: Math.round(usedBytes / (1024 * 1024 * 1024)),
      totalGb: Math.round(totalBytes / (1024 * 1024 * 1024)),
    };
  }
}

export class ResourcePlatform {
  private readonly cpuMonitor = new CpuMonitor();
  private readonly memoryMonitor = new MemoryMonitor();
  private readonly gpuMonitor = new GpuMonitor();
  private readonly diskMonitor = new DiskMonitor();

  constructor(private readonly options: ResourcePlatformOptions) {}

  async captureSnapshot(diskPath: string): Promise<ResourceSnapshot> {
    const timestamp = new Date().toISOString();
    const cpuPercent = this.cpuMonitor.sample();
    const memory = this.memoryMonitor.sample();
    const gpuPercent = this.gpuMonitor.sample();
    const disk = await this.diskMonitor.sample(diskPath);

    const snapshot: ResourceSnapshot = {
      timestamp,
      cpuPercent,
      memoryUsedMb: memory.usedMb,
      memoryTotalMb: memory.totalMb,
      gpuPercent,
      diskUsedGb: disk.usedGb,
      diskTotalGb: disk.totalGb,
    };

    this.options.eventBus.publish({
      id: createDomainEventId(),
      type: RESOURCE_EVENTS.SNAPSHOT,
      timestamp,
      workflowId: this.options.workflowId ?? 'system',
      jobId: this.options.jobId ?? 'system',
      cpuPercent: snapshot.cpuPercent,
      memoryUsedMb: snapshot.memoryUsedMb,
      memoryTotalMb: snapshot.memoryTotalMb,
      gpuPercent: snapshot.gpuPercent,
      diskUsedGb: snapshot.diskUsedGb,
      diskTotalGb: snapshot.diskTotalGb,
    });

    this.evaluateThresholds(snapshot);
    return snapshot;
  }

  private evaluateThresholds(snapshot: ResourceSnapshot): void {
    const thresholds = this.options.thresholds;
    if (thresholds === undefined) {
      return;
    }

    if (thresholds.cpuPercent !== undefined && snapshot.cpuPercent > thresholds.cpuPercent) {
      this.publishThreshold('cpu', snapshot.cpuPercent, thresholds.cpuPercent, snapshot.timestamp);
    }

    const memoryPercent = Math.round((snapshot.memoryUsedMb / snapshot.memoryTotalMb) * 100);
    if (thresholds.memoryPercent !== undefined && memoryPercent > thresholds.memoryPercent) {
      this.publishThreshold('memory', memoryPercent, thresholds.memoryPercent, snapshot.timestamp);
    }

    const diskPercent =
      snapshot.diskTotalGb === 0
        ? 0
        : Math.round((snapshot.diskUsedGb / snapshot.diskTotalGb) * 100);
    if (thresholds.diskPercent !== undefined && diskPercent > thresholds.diskPercent) {
      this.publishThreshold('disk', diskPercent, thresholds.diskPercent, snapshot.timestamp);
    }
  }

  private publishThreshold(
    resource: string,
    value: number,
    threshold: number,
    timestamp: string,
  ): void {
    this.options.eventBus.publish({
      id: createDomainEventId(),
      type: RESOURCE_EVENTS.THRESHOLD_EXCEEDED,
      timestamp,
      workflowId: this.options.workflowId ?? 'system',
      jobId: this.options.jobId ?? 'system',
      resource,
      value,
      threshold,
    });
  }
}

export function createResourcePlatform(options: ResourcePlatformOptions): ResourcePlatform {
  return new ResourcePlatform(options);
}
