import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

import { MediaMigrationRunner } from './sqlite/migrations.js';
import { MediaRepository } from './media-repository.js';
import { MEDIA_OPERATION_KINDS } from '../domain/constants.js';

describe('MediaRepository', () => {
  it('persists media files and operations', () => {
    const db = new Database(':memory:');
    new MediaMigrationRunner(db).migrate();
    const repository = new MediaRepository(db);

    const mediaFile = repository.createMediaFile({
      filePath: '/tmp/sample.mp4',
      filename: 'sample.mp4',
      container: 'mp4',
      durationSeconds: 10,
      width: 1280,
      height: 720,
      videoCodec: 'H.264',
      audioTrackCount: 1,
      bitrateKbps: 1200,
      workflowId: 'wf-1',
      jobId: 'job-1',
    });

    const operation = repository.startOperation({
      kind: MEDIA_OPERATION_KINDS.PROBE,
      mediaFileId: mediaFile.id,
      workflowId: 'wf-1',
      jobId: 'job-1',
      nodeId: 'metadata',
    });

    const completed = repository.completeOperation(operation.id, '/tmp/metadata.json', 12);
    const found = repository.findMediaFileByWorkflow('wf-1');
    const operations = repository.listOperationsByWorkflow('wf-1');

    expect(found?.filename).toBe('sample.mp4');
    expect(completed.status).toBe('completed');
    expect(operations).toHaveLength(1);
    db.close();
  });
});
