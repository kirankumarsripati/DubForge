import { describe, expect, it } from 'vitest';
import { compileWorkflow } from '../compiler/workflow-compiler';
import { validateDagGraph } from '../dag/validator';
import { DEFAULT_OUTPUT_CONFIGURATION } from '@dubforge/job-config';

describe('compileWorkflow', () => {
  it('builds a valid DAG for multiple target languages', () => {
    const graph = compileWorkflow({
      workflowId: 'wf-1',
      jobId: 'job-1',
      videoPath: '/tmp/video.mp4',
      videoFilename: 'video.mp4',
      durationSeconds: 600,
      targetLanguages: ['hi', 'te'],
      profile: 'balanced',
      output: DEFAULT_OUTPUT_CONFIGURATION,
      outputDirectory: '/tmp/output',
      artifactRoot: '/tmp/artifacts/job-1',
    });

    const validation = validateDagGraph(graph);
    expect(validation.valid).toBe(true);
    expect(graph.nodes.size).toBeGreaterThan(10);
    expect(graph.nodes.has('translate:hi')).toBe(true);
    expect(graph.nodes.has('translate:te')).toBe(true);
    expect(graph.nodes.has('mux')).toBe(true);
  });

  it('omits speech nodes when translated audio is disabled', () => {
    const graph = compileWorkflow({
      workflowId: 'wf-2',
      jobId: 'job-2',
      videoPath: '/tmp/video.mp4',
      videoFilename: 'video.mp4',
      durationSeconds: 120,
      targetLanguages: ['hi'],
      profile: 'fast',
      output: {
        ...DEFAULT_OUTPUT_CONFIGURATION,
        generateTranslatedAudio: false,
      },
      outputDirectory: '/tmp/output',
      artifactRoot: '/tmp/artifacts/job-2',
    });

    expect(graph.nodes.has('speech:hi')).toBe(false);
    expect(graph.nodes.has('align:hi')).toBe(false);
    expect(graph.nodes.has('translate:hi')).toBe(true);
  });
});
