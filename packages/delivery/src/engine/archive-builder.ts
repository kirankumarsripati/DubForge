import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PROJECT_BUNDLE_VERSION } from '../domain/constants.js';
import type { ArchiveBuilderPort, ArchiveProjectBundleInput } from '../ports/delivery-ports.js';

export class ArchiveBuilder implements ArchiveBuilderPort {
  async buildProjectBundle(input: ArchiveProjectBundleInput): Promise<string> {
    const bundleRoot = input.outputDirectory.endsWith('.dubforge')
      ? input.outputDirectory
      : join(input.outputDirectory, 'project.dubforge');

    await mkdir(bundleRoot, { recursive: true });
    await mkdir(join(bundleRoot, 'artifacts'), { recursive: true });

    await writeFile(
      join(bundleRoot, 'bundle.json'),
      JSON.stringify(
        {
          version: PROJECT_BUNDLE_VERSION,
          workflowId: input.workflowId,
          jobId: input.jobId,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf8',
    );

    await writeFile(
      join(bundleRoot, 'timeline.json'),
      JSON.stringify(input.timeline, null, 2),
      'utf8',
    );
    await writeFile(
      join(bundleRoot, 'workflow.json'),
      JSON.stringify(input.workflow, null, 2),
      'utf8',
    );
    await writeFile(
      join(bundleRoot, 'settings.json'),
      JSON.stringify(input.settings, null, 2),
      'utf8',
    );
    await writeFile(
      join(bundleRoot, 'localization.json'),
      JSON.stringify(input.localization, null, 2),
      'utf8',
    );
    await writeFile(join(bundleRoot, 'report.json'), JSON.stringify(input.report, null, 2), 'utf8');
    await writeFile(
      join(bundleRoot, 'diagnostics.json'),
      JSON.stringify(input.diagnostics, null, 2),
      'utf8',
    );
    await writeFile(
      join(bundleRoot, 'export-history.json'),
      JSON.stringify(input.exportHistory, null, 2),
      'utf8',
    );

    await writeFile(
      join(bundleRoot, 'artifacts', 'manifest.json'),
      JSON.stringify(input.artifacts, null, 2),
      'utf8',
    );

    return bundleRoot;
  }
}

export function createArchiveBuilder(archivePort?: ArchiveBuilderPort): ArchiveBuilderPort {
  return archivePort ?? new ArchiveBuilder();
}
