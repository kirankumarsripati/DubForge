import { describe, expect, it } from 'vitest';

import { DEFAULT_OUTPUT_CONFIGURATION } from '@dubforge/job-config';

import { JsonExportProfileLoader } from '../adapters/export-profile-loader.js';
import { createPackageBuilder } from './package-builder.js';
import { DELIVERABLE_KINDS } from '../domain/constants.js';

describe('PackageBuilder', () => {
  it('builds a packaging plan before export execution', () => {
    const builder = createPackageBuilder(new JsonExportProfileLoader());
    const plan = builder.buildPlan({
      workflowId: 'wf-package',
      jobId: 'job-package',
      outputDirectory: '/tmp/output',
      output: DEFAULT_OUTPUT_CONFIGURATION,
      artifacts: { mux: '/tmp/muxed.mkv' },
      languageCodes: ['hi'],
    });

    expect(plan.deliverables.length).toBeGreaterThan(0);
    expect(plan.deliverables.some((d) => d.kind === DELIVERABLE_KINDS.MKV)).toBe(true);
    builder.validatePlan(plan, { mux: '/tmp/muxed.mkv' });
  });
});
