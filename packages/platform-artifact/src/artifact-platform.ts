import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import Database from 'better-sqlite3';

import {
  ARTIFACT_EVENTS,
  createDomainEventId,
  EXECUTION_EVENTS,
  WORKFLOW_EVENTS,
  type DomainEventBus,
  type ExecutionLifecycleEvent,
} from '@dubforge/platform-events';

import { FilesystemArtifactStorage } from './filesystem/storage.js';
import { ArtifactMigrationRunner } from './sqlite/migrations.js';
import { ArtifactRegistry } from './registry/artifact-registry.js';
import { ArtifactRepository } from './repository/artifact-repository.js';
import { ArtifactResolver } from './resolver/artifact-resolver.js';
import type { WorkflowStatePort } from './types.js';

export interface ArtifactPlatformOptions {
  readonly rootPath: string;
  readonly eventBus: DomainEventBus;
}

export interface WorkflowStatePersistence<TState> {
  readonly serialize: (state: TState) => string;
  readonly deserialize: (content: string) => TState;
  readonly getWorkflowId: (state: TState) => string;
  readonly getArtifactRoot: (state: TState) => string;
}

export class ArtifactPlatform<TState> {
  private readonly db: Database.Database;
  private readonly repository: ArtifactRepository;
  private readonly registry: ArtifactRegistry;
  private readonly resolver: ArtifactResolver;
  private readonly storage: FilesystemArtifactStorage;
  private readonly insertWorkflowState: Database.Statement;
  private readonly selectWorkflowState: Database.Statement;

  constructor(
    private readonly options: ArtifactPlatformOptions,
    private readonly persistence: WorkflowStatePersistence<TState>,
  ) {
    const databasePath = join(options.rootPath, 'artifacts.db');
    mkdirSync(options.rootPath, { recursive: true });
    this.db = new Database(databasePath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    new ArtifactMigrationRunner(this.db).migrate();

    this.repository = new ArtifactRepository(this.db);
    this.registry = new ArtifactRegistry(this.repository);
    this.resolver = new ArtifactResolver(this.registry);
    this.storage = new FilesystemArtifactStorage();

    this.insertWorkflowState = this.db.prepare(`
      INSERT INTO workflow_states (workflow_id, artifact_root, state_json, updated_at)
      VALUES (@workflowId, @artifactRoot, @stateJson, @updatedAt)
      ON CONFLICT(workflow_id) DO UPDATE SET
        artifact_root = excluded.artifact_root,
        state_json = excluded.state_json,
        updated_at = excluded.updated_at
    `);

    this.selectWorkflowState = this.db.prepare(`
      SELECT state_json AS stateJson
      FROM workflow_states
      WHERE workflow_id = ? AND artifact_root = ?
    `);

    options.eventBus.subscribeToType(EXECUTION_EVENTS.COMPLETED, (event) => {
      this.handleExecutionCompleted(event);
    });

    options.eventBus.subscribeToType(WORKFLOW_EVENTS.STATE_CHANGED, () => undefined);
  }

  getArtifactSink(): FilesystemArtifactStorage {
    return this.storage;
  }

  getResolver(): ArtifactResolver {
    return this.resolver;
  }

  getRegistry(): ArtifactRegistry {
    return this.registry;
  }

  createWorkflowStatePort(): WorkflowStatePort<TState> {
    return {
      persist: (state) => this.persistWorkflowState(state),
      restore: (workflowId, artifactRoot) => this.restoreWorkflowState(workflowId, artifactRoot),
    };
  }

  close(): void {
    this.db.close();
  }

  private persistWorkflowState(state: TState): Promise<void> {
    const workflowId = this.persistence.getWorkflowId(state);
    const artifactRoot = this.persistence.getArtifactRoot(state);
    const updatedAt = new Date().toISOString();
    const stateJson = this.persistence.serialize(state);

    const persist = this.db.transaction(() => {
      this.insertWorkflowState.run({
        workflowId,
        artifactRoot,
        stateJson,
        updatedAt,
      });
    });

    persist();

    this.options.eventBus.publish({
      id: createDomainEventId(),
      type: ARTIFACT_EVENTS.PERSISTED,
      timestamp: updatedAt,
      workflowId,
      jobId: workflowId,
      artifactId: workflowId,
      nodeId: null,
      path: artifactRoot,
    });
    return Promise.resolve();
  }

  private restoreWorkflowState(workflowId: string, artifactRoot: string): Promise<TState | null> {
    const row = this.selectWorkflowState.get(workflowId, artifactRoot) as
      { stateJson: string } | undefined;

    if (row === undefined) {
      return Promise.resolve(null);
    }

    return Promise.resolve(this.persistence.deserialize(row.stateJson));
  }

  private handleExecutionCompleted(event: ExecutionLifecycleEvent): void {
    if (event.type !== EXECUTION_EVENTS.COMPLETED) {
      return;
    }

    const artifactEntries = Object.entries(event.artifacts ?? {});
    for (const [kind, path] of artifactEntries) {
      const record = this.repository.register({
        workflowId: event.workflowId,
        jobId: event.jobId,
        nodeId: event.nodeId,
        kind,
        path,
      });

      this.registry.register(record);

      this.options.eventBus.publish({
        id: createDomainEventId(),
        type: ARTIFACT_EVENTS.REGISTERED,
        timestamp: new Date().toISOString(),
        workflowId: event.workflowId,
        jobId: event.jobId,
        artifactId: record.id,
        nodeId: event.nodeId,
        path: record.path,
      });
    }
  }
}

export function createArtifactPlatform<TState>(
  options: ArtifactPlatformOptions,
  persistence: WorkflowStatePersistence<TState>,
): ArtifactPlatform<TState> {
  return new ArtifactPlatform(options, persistence);
}
