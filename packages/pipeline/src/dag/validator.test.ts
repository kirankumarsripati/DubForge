import { describe, expect, it } from 'vitest';
import { NODE_KINDS, type DagGraph, type DagNode } from '../dag/types';
import { validateDagGraph } from './validator';

function createNode(id: string, dependencies: readonly string[] = []): DagNode {
  return {
    id,
    kind: NODE_KINDS.VALIDATE,
    label: id,
    dependencies,
    retryable: true,
    languageCode: null,
    layer: dependencies.length,
  };
}

function createGraph(nodes: readonly DagNode[], roots: readonly string[]): DagGraph {
  return {
    workflowId: 'wf-test',
    jobId: 'job-test',
    nodes: new Map(nodes.map((node) => [node.id, node])),
    roots,
  };
}

describe('validateDagGraph', () => {
  it('accepts a valid acyclic graph', () => {
    const graph = createGraph(
      [createNode('a'), createNode('b', ['a']), createNode('c', ['b'])],
      ['a'],
    );

    expect(validateDagGraph(graph).valid).toBe(true);
  });

  it('rejects cycles', () => {
    const graph = createGraph(
      [createNode('a', ['c']), createNode('b', ['a']), createNode('c', ['b'])],
      [],
    );

    const result = validateDagGraph(graph);
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((issue) => issue.code === 'cycle-detected' || issue.code === 'no-roots'),
    ).toBe(true);
  });

  it('rejects missing dependencies', () => {
    const graph = createGraph([createNode('a', ['missing'])], ['a']);
    const result = validateDagGraph(graph);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'missing-dependency')).toBe(true);
  });
});
