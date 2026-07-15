import { randomUUID } from 'node:crypto';

import type Database from 'better-sqlite3';

import type { ArtifactRecord, RegisterArtifactInput } from '../types.js';

interface ArtifactRow {
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

function mapRow(row: ArtifactRow): ArtifactRecord {
  return {
    id: row.id,
    workflowId: row.workflowId,
    jobId: row.jobId,
    nodeId: row.nodeId,
    kind: row.kind,
    path: row.path,
    checksum: row.checksum,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
  };
}

export class ArtifactRepository {
  private readonly insertArtifact: Database.Statement;
  private readonly selectByWorkflow: Database.Statement;
  private readonly selectById: Database.Statement;
  private readonly deleteWorkflowArtifacts: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.insertArtifact = db.prepare(`
      INSERT INTO artifacts (
        id, workflow_id, job_id, node_id, kind, path, checksum, size_bytes, created_at
      ) VALUES (
        @id, @workflowId, @jobId, @nodeId, @kind, @path, @checksum, @sizeBytes, @createdAt
      )
    `);

    this.selectByWorkflow = db.prepare(`
      SELECT
        id, workflow_id AS workflowId, job_id AS jobId, node_id AS nodeId,
        kind, path, checksum, size_bytes AS sizeBytes, created_at AS createdAt
      FROM artifacts WHERE workflow_id = ? ORDER BY created_at ASC
    `);

    this.selectById = db.prepare(`
      SELECT
        id, workflow_id AS workflowId, job_id AS jobId, node_id AS nodeId,
        kind, path, checksum, size_bytes AS sizeBytes, created_at AS createdAt
      FROM artifacts WHERE id = ?
    `);

    this.deleteWorkflowArtifacts = db.prepare('DELETE FROM artifacts WHERE workflow_id = ?');
  }

  register(input: RegisterArtifactInput): ArtifactRecord {
    const record: ArtifactRecord = {
      id: randomUUID(),
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      kind: input.kind,
      path: input.path,
      checksum: input.checksum ?? null,
      sizeBytes: input.sizeBytes ?? null,
      createdAt: new Date().toISOString(),
    };

    this.insertArtifact.run({
      id: record.id,
      workflowId: record.workflowId,
      jobId: record.jobId,
      nodeId: record.nodeId,
      kind: record.kind,
      path: record.path,
      checksum: record.checksum,
      sizeBytes: record.sizeBytes,
      createdAt: record.createdAt,
    });

    return record;
  }

  getById(artifactId: string): ArtifactRecord | null {
    const row = this.selectById.get(artifactId) as ArtifactRow | undefined;
    return row === undefined ? null : mapRow(row);
  }

  listByWorkflow(workflowId: string): readonly ArtifactRecord[] {
    const rows = this.selectByWorkflow.all(workflowId) as ArtifactRow[];
    return rows.map(mapRow);
  }

  deleteByWorkflow(workflowId: string): void {
    this.deleteWorkflowArtifacts.run(workflowId);
  }
}
