import { readFile } from 'node:fs/promises';

import { createCodec } from '../../domain/value-objects/codec.js';
import { primaryContainerFormat } from '../../domain/value-objects/container-format.js';
import { createDuration } from '../../domain/value-objects/duration.js';
import { createResolution } from '../../domain/value-objects/resolution.js';
import type { ProbeMediaInput, ProbeMediaPort, ProbeMediaResult } from '../../ports/media-ports.js';
import { randomUUID } from 'node:crypto';

export interface FixtureProbeAdapterOptions {
  readonly fixturePath: string;
}

export class FixtureProbeAdapter implements ProbeMediaPort {
  constructor(private readonly options: FixtureProbeAdapterOptions) {}

  async probe(input: ProbeMediaInput): Promise<ProbeMediaResult> {
    const fixture = JSON.parse(await readFile(this.options.fixturePath, 'utf8')) as {
      readonly container: string;
      readonly durationSeconds: number;
      readonly width: number;
      readonly height: number;
      readonly videoCodec: string;
      readonly audioTrackCount: number;
      readonly bitrateKbps: number;
    };

    const artifactPath = `${input.artifactRoot}/${input.nodeId}-metadata.json`;
    const probeJson = JSON.stringify(
      {
        adapter: 'fixture-probe',
        filePath: input.filePath,
        probe: fixture,
        probedAt: new Date().toISOString(),
      },
      null,
      2,
    );

    return {
      mediaFile: {
        id: randomUUID(),
        filePath: input.filePath,
        filename: input.filename,
        container: primaryContainerFormat(fixture.container),
        duration: createDuration(fixture.durationSeconds),
        resolution: createResolution(fixture.width, fixture.height),
        videoCodec: createCodec(fixture.videoCodec),
        audioTrackCount: fixture.audioTrackCount,
        bitrateKbps: fixture.bitrateKbps,
        probedAt: new Date().toISOString(),
        workflowId: input.workflowId,
        jobId: input.jobId,
      },
      artifactPath,
      probeJson,
      durationMs: 1,
    };
  }
}
