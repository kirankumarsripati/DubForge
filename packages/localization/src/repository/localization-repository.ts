import { randomUUID } from 'node:crypto';

import type Database from 'better-sqlite3';

import {
  deserializeLocalizedDocument,
  serializeLocalizedDocument,
  type LocalizedDocument,
} from '../domain/localized-document.js';
import { LOCALIZATION_OPERATION_STATUSES } from '../domain/constants.js';
import type { LocalizationOperationKind } from '../domain/constants.js';
import type { GlossaryEntry, TranslationMemoryEntry } from '../ports/localization-ports.js';

export interface LocalizationOperationRecord {
  readonly id: string;
  readonly kind: LocalizationOperationKind;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly languageCode: string | null;
  readonly status: (typeof LOCALIZATION_OPERATION_STATUSES)[keyof typeof LOCALIZATION_OPERATION_STATUSES];
  readonly artifactPath: string | null;
  readonly durationMs: number | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
}

export class LocalizationRepository {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  saveLocalizedDocument(document: LocalizedDocument, qualityScore: number): void {
    this.db
      .prepare(
        `
        INSERT INTO localized_documents (
          id, workflow_id, job_id, source_language_code, target_language_code,
          source_transcript_id, duration_ms, document_json, quality_score, created_at
        ) VALUES (
          @id, @workflowId, @jobId, @sourceLanguageCode, @targetLanguageCode,
          @sourceTranscriptId, @durationMs, @documentJson, @qualityScore, @createdAt
        )
        ON CONFLICT(workflow_id, target_language_code) DO UPDATE SET
          id = excluded.id,
          job_id = excluded.job_id,
          source_language_code = excluded.source_language_code,
          source_transcript_id = excluded.source_transcript_id,
          duration_ms = excluded.duration_ms,
          document_json = excluded.document_json,
          quality_score = excluded.quality_score,
          created_at = excluded.created_at
      `,
      )
      .run({
        id: document.id,
        workflowId: document.workflowId,
        jobId: document.jobId,
        sourceLanguageCode: document.sourceLanguageCode,
        targetLanguageCode: document.targetLanguageCode,
        sourceTranscriptId: document.sourceTranscriptId,
        durationMs: document.durationMs,
        documentJson: serializeLocalizedDocument(document),
        qualityScore,
        createdAt: document.createdAt,
      });
  }

  getLocalizedDocument(workflowId: string, targetLanguageCode: string): LocalizedDocument | null {
    const row = this.db
      .prepare(
        `
        SELECT document_json AS documentJson
        FROM localized_documents
        WHERE workflow_id = ? AND target_language_code = ?
      `,
      )
      .get(workflowId, targetLanguageCode) as { documentJson: string } | undefined;

    if (row === undefined) {
      return null;
    }

    return deserializeLocalizedDocument(row.documentJson);
  }

  listGlossaryEntries(
    sourceLanguageCode: string,
    targetLanguageCode: string,
  ): readonly GlossaryEntry[] {
    return this.db
      .prepare(
        `
        SELECT
          id,
          source_language_code AS sourceLanguageCode,
          target_language_code AS targetLanguageCode,
          source_term AS sourceTerm,
          target_term AS targetTerm,
          case_sensitive AS caseSensitive
        FROM glossary_entries
        WHERE source_language_code = ? AND target_language_code = ?
        ORDER BY LENGTH(source_term) DESC
      `,
      )
      .all(sourceLanguageCode, targetLanguageCode)
      .map((row) => {
        const entry = row as {
          id: string;
          sourceLanguageCode: string;
          targetLanguageCode: string;
          sourceTerm: string;
          targetTerm: string;
          caseSensitive: number;
        };

        return {
          id: entry.id,
          sourceLanguageCode: entry.sourceLanguageCode,
          targetLanguageCode: entry.targetLanguageCode,
          sourceTerm: entry.sourceTerm,
          targetTerm: entry.targetTerm,
          caseSensitive: entry.caseSensitive === 1,
        };
      });
  }

  upsertGlossaryEntry(input: {
    readonly sourceLanguageCode: string;
    readonly targetLanguageCode: string;
    readonly sourceTerm: string;
    readonly targetTerm: string;
    readonly caseSensitive: boolean;
  }): GlossaryEntry {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    this.db
      .prepare(
        `
        INSERT INTO glossary_entries (
          id, source_language_code, target_language_code, source_term, target_term, case_sensitive, created_at
        ) VALUES (
          @id, @sourceLanguageCode, @targetLanguageCode, @sourceTerm, @targetTerm, @caseSensitive, @createdAt
        )
        ON CONFLICT(id) DO UPDATE SET
          source_term = excluded.source_term,
          target_term = excluded.target_term,
          case_sensitive = excluded.case_sensitive
      `,
      )
      .run({
        id,
        sourceLanguageCode: input.sourceLanguageCode,
        targetLanguageCode: input.targetLanguageCode,
        sourceTerm: input.sourceTerm,
        targetTerm: input.targetTerm,
        caseSensitive: input.caseSensitive ? 1 : 0,
        createdAt,
      });

    return {
      id,
      sourceLanguageCode: input.sourceLanguageCode,
      targetLanguageCode: input.targetLanguageCode,
      sourceTerm: input.sourceTerm,
      targetTerm: input.targetTerm,
      caseSensitive: input.caseSensitive,
    };
  }

  findTranslationMemory(input: {
    readonly sourceLanguageCode: string;
    readonly targetLanguageCode: string;
    readonly sourceText: string;
  }): TranslationMemoryEntry | null {
    const row = this.db
      .prepare(
        `
        SELECT
          id,
          source_language_code AS sourceLanguageCode,
          target_language_code AS targetLanguageCode,
          source_text AS sourceText,
          target_text AS targetText,
          created_at AS createdAt,
          last_used_at AS lastUsedAt
        FROM translation_memory
        WHERE source_language_code = ? AND target_language_code = ? AND source_text = ?
      `,
      )
      .get(input.sourceLanguageCode, input.targetLanguageCode, input.sourceText) as
      TranslationMemoryEntry | undefined;

    return row ?? null;
  }

  saveTranslationMemory(input: {
    readonly sourceLanguageCode: string;
    readonly targetLanguageCode: string;
    readonly sourceText: string;
    readonly targetText: string;
  }): TranslationMemoryEntry {
    const existing = this.findTranslationMemory(input);
    if (existing !== null) {
      return existing;
    }

    const id = randomUUID();
    const timestamp = new Date().toISOString();

    this.db
      .prepare(
        `
        INSERT INTO translation_memory (
          id, source_language_code, target_language_code, source_text, target_text, created_at, last_used_at
        ) VALUES (
          @id, @sourceLanguageCode, @targetLanguageCode, @sourceText, @targetText, @createdAt, @lastUsedAt
        )
      `,
      )
      .run({
        id,
        sourceLanguageCode: input.sourceLanguageCode,
        targetLanguageCode: input.targetLanguageCode,
        sourceText: input.sourceText,
        targetText: input.targetText,
        createdAt: timestamp,
        lastUsedAt: timestamp,
      });

    return {
      id,
      sourceLanguageCode: input.sourceLanguageCode,
      targetLanguageCode: input.targetLanguageCode,
      sourceText: input.sourceText,
      targetText: input.targetText,
      createdAt: timestamp,
      lastUsedAt: timestamp,
    };
  }

  touchTranslationMemory(id: string): void {
    this.db
      .prepare('UPDATE translation_memory SET last_used_at = ? WHERE id = ?')
      .run(new Date().toISOString(), id);
  }

  startOperation(input: {
    readonly kind: LocalizationOperationKind;
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
    readonly languageCode: string | null;
  }): LocalizationOperationRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    this.db
      .prepare(
        `
        INSERT INTO localization_operations (
          id, kind, workflow_id, job_id, node_id, language_code, status,
          artifact_path, duration_ms, created_at, completed_at
        ) VALUES (
          @id, @kind, @workflowId, @jobId, @nodeId, @languageCode, @status,
          @artifactPath, @durationMs, @createdAt, @completedAt
        )
      `,
      )
      .run({
        id,
        kind: input.kind,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        languageCode: input.languageCode,
        status: LOCALIZATION_OPERATION_STATUSES.RUNNING,
        artifactPath: null,
        durationMs: null,
        createdAt,
        completedAt: null,
      });

    return {
      id,
      kind: input.kind,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      languageCode: input.languageCode,
      status: LOCALIZATION_OPERATION_STATUSES.RUNNING,
      artifactPath: null,
      durationMs: null,
      createdAt,
      completedAt: null,
    };
  }

  completeOperation(
    operationId: string,
    artifactPath: string,
    durationMs: number,
  ): LocalizationOperationRecord {
    const completedAt = new Date().toISOString();
    this.db
      .prepare(
        `
        UPDATE localization_operations
        SET status = @status,
            artifact_path = @artifactPath,
            duration_ms = @durationMs,
            completed_at = @completedAt
        WHERE id = @id
      `,
      )
      .run({
        id: operationId,
        status: LOCALIZATION_OPERATION_STATUSES.COMPLETED,
        artifactPath,
        durationMs,
        completedAt,
      });

    return this.getOperation(operationId);
  }

  failOperation(operationId: string): LocalizationOperationRecord {
    const completedAt = new Date().toISOString();
    this.db
      .prepare(
        `
        UPDATE localization_operations
        SET status = @status,
            artifact_path = @artifactPath,
            duration_ms = @durationMs,
            completed_at = @completedAt
        WHERE id = @id
      `,
      )
      .run({
        id: operationId,
        status: LOCALIZATION_OPERATION_STATUSES.FAILED,
        artifactPath: null,
        durationMs: null,
        completedAt,
      });

    return this.getOperation(operationId);
  }

  listOperations(workflowId: string): readonly LocalizationOperationRecord[] {
    return this.db
      .prepare(
        `
        SELECT
          id,
          kind,
          workflow_id AS workflowId,
          job_id AS jobId,
          node_id AS nodeId,
          language_code AS languageCode,
          status,
          artifact_path AS artifactPath,
          duration_ms AS durationMs,
          created_at AS createdAt,
          completed_at AS completedAt
        FROM localization_operations
        WHERE workflow_id = ?
        ORDER BY created_at ASC
      `,
      )
      .all(workflowId) as LocalizationOperationRecord[];
  }

  private getOperation(operationId: string): LocalizationOperationRecord {
    const row = this.db
      .prepare(
        `
        SELECT
          id,
          kind,
          workflow_id AS workflowId,
          job_id AS jobId,
          node_id AS nodeId,
          language_code AS languageCode,
          status,
          artifact_path AS artifactPath,
          duration_ms AS durationMs,
          created_at AS createdAt,
          completed_at AS completedAt
        FROM localization_operations
        WHERE id = ?
      `,
      )
      .get(operationId) as LocalizationOperationRecord | undefined;

    if (row === undefined) {
      throw new Error(`Localization operation "${operationId}" was not found.`);
    }

    return row;
  }
}
