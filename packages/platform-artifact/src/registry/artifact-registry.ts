import type { ArtifactRecord } from '../types.js';
import type { ArtifactRepository } from '../repository/artifact-repository.js';

export class ArtifactRegistry {
  private readonly index = new Map<string, ArtifactRecord>();

  constructor(private readonly repository: ArtifactRepository) {}

  register(record: ArtifactRecord): void {
    this.index.set(record.id, record);
  }

  get(artifactId: string): ArtifactRecord | null {
    return this.index.get(artifactId) ?? this.repository.getById(artifactId);
  }

  listByWorkflow(workflowId: string): readonly ArtifactRecord[] {
    const records = this.repository.listByWorkflow(workflowId);
    for (const record of records) {
      this.index.set(record.id, record);
    }
    return records;
  }
}
