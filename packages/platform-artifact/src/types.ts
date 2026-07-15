export interface ArtifactSink {
  writeText(path: string, content: string): Promise<void>;
}

export interface ArtifactRecord {
  readonly id: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string | null;
  readonly kind: string;
  readonly path: string;
  readonly checksum: string | null;
  readonly sizeBytes: number | null;
  readonly createdAt: string;
}

export interface RegisterArtifactInput {
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string | null;
  readonly kind: string;
  readonly path: string;
  readonly checksum?: string | null;
  readonly sizeBytes?: number | null;
}

export interface ArtifactResolveQuery {
  readonly workflowId: string;
  readonly nodeId?: string;
  readonly kind?: string;
}

export interface WorkflowStatePort<TState> {
  persist(state: TState): Promise<void>;
  restore(workflowId: string, artifactRoot: string): Promise<TState | null>;
}
