import type { ArtifactRecord, ArtifactResolveQuery } from '../types.js';
import type { ArtifactRegistry } from '../registry/artifact-registry.js';

export class ArtifactResolver {
  constructor(private readonly registry: ArtifactRegistry) {}

  resolve(query: ArtifactResolveQuery): readonly ArtifactRecord[] {
    const records = this.registry.listByWorkflow(query.workflowId);

    return records.filter((record) => {
      if (query.nodeId !== undefined && record.nodeId !== query.nodeId) {
        return false;
      }

      if (query.kind !== undefined && record.kind !== query.kind) {
        return false;
      }

      return true;
    });
  }

  resolvePath(query: ArtifactResolveQuery): string | null {
    const matches = this.resolve(query);
    return matches[0]?.path ?? null;
  }
}
