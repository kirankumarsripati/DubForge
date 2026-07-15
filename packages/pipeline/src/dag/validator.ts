import type { DagGraph, DagNode, NodeId } from './types';

export interface GraphValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly nodeId: NodeId | null;
}

export interface GraphValidationResult {
  readonly valid: boolean;
  readonly issues: readonly GraphValidationIssue[];
}

function createIssue(
  code: string,
  message: string,
  nodeId: NodeId | null = null,
): GraphValidationIssue {
  return { code, message, nodeId };
}

function detectCycle(graph: DagGraph): NodeId[] | null {
  const visited = new Set<NodeId>();
  const visiting = new Set<NodeId>();
  const stack: NodeId[] = [];

  const visit = (nodeId: NodeId): NodeId[] | null => {
    if (visiting.has(nodeId)) {
      const cycleStart = stack.indexOf(nodeId);
      return cycleStart >= 0 ? stack.slice(cycleStart).concat(nodeId) : [nodeId];
    }

    if (visited.has(nodeId)) {
      return null;
    }

    visiting.add(nodeId);
    stack.push(nodeId);

    const node = graph.nodes.get(nodeId);
    if (node !== undefined) {
      for (const dependencyId of node.dependencies) {
        const cycle = visit(dependencyId);
        if (cycle !== null) {
          return cycle;
        }
      }
    }

    stack.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
    return null;
  };

  for (const nodeId of graph.nodes.keys()) {
    const cycle = visit(nodeId);
    if (cycle !== null) {
      return cycle;
    }
  }

  return null;
}

function validateNodeReferences(graph: DagGraph): GraphValidationIssue[] {
  const issues: GraphValidationIssue[] = [];

  for (const node of graph.nodes.values()) {
    for (const dependencyId of node.dependencies) {
      if (!graph.nodes.has(dependencyId)) {
        issues.push(
          createIssue(
            'missing-dependency',
            `Node "${node.id}" depends on missing node "${dependencyId}".`,
            node.id,
          ),
        );
      }
    }
  }

  return issues;
}

function validateRoots(graph: DagGraph): GraphValidationIssue[] {
  const issues: GraphValidationIssue[] = [];

  for (const rootId of graph.roots) {
    if (!graph.nodes.has(rootId)) {
      issues.push(createIssue('missing-root', `Root node "${rootId}" does not exist.`, rootId));
      continue;
    }

    const rootNode = graph.nodes.get(rootId);
    if (rootNode !== undefined && rootNode.dependencies.length > 0) {
      issues.push(
        createIssue('invalid-root', `Root node "${rootId}" must not have dependencies.`, rootId),
      );
    }
  }

  if (graph.roots.length === 0 && graph.nodes.size > 0) {
    issues.push(createIssue('no-roots', 'Graph must contain at least one root node.'));
  }

  return issues;
}

function validateDuplicateIds(graph: DagGraph): GraphValidationIssue[] {
  const seen = new Set<NodeId>();
  const issues: GraphValidationIssue[] = [];

  for (const nodeId of graph.nodes.keys()) {
    if (seen.has(nodeId)) {
      issues.push(createIssue('duplicate-node', `Duplicate node id "${nodeId}".`, nodeId));
    }
    seen.add(nodeId);
  }

  return issues;
}

function validateReachability(graph: DagGraph): GraphValidationIssue[] {
  const reachable = new Set<NodeId>(graph.roots);
  const queue = [...graph.roots];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === undefined) {
      break;
    }

    for (const node of graph.nodes.values()) {
      if (reachable.has(node.id)) {
        continue;
      }

      const allDependenciesReachable = node.dependencies.every((dependencyId) =>
        reachable.has(dependencyId),
      );

      if (allDependenciesReachable) {
        reachable.add(node.id);
        queue.push(node.id);
      }
    }
  }

  const issues: GraphValidationIssue[] = [];
  for (const nodeId of graph.nodes.keys()) {
    if (!reachable.has(nodeId)) {
      issues.push(
        createIssue('unreachable-node', `Node "${nodeId}" is unreachable from roots.`, nodeId),
      );
    }
  }

  return issues;
}

export function validateDagGraph(graph: DagGraph): GraphValidationResult {
  const issues: GraphValidationIssue[] = [
    ...validateDuplicateIds(graph),
    ...validateNodeReferences(graph),
    ...validateRoots(graph),
  ];

  if (issues.length === 0) {
    const cycle = detectCycle(graph);
    if (cycle !== null) {
      issues.push(
        createIssue('cycle-detected', `Cycle detected: ${cycle.join(' -> ')}.`, cycle[0] ?? null),
      );
    }
  }

  if (issues.length === 0) {
    issues.push(...validateReachability(graph));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function getReadyNodes(graph: DagGraph, completed: ReadonlySet<NodeId>): DagNode[] {
  const ready: DagNode[] = [];

  for (const node of graph.nodes.values()) {
    const allDependenciesCompleted = node.dependencies.every((dependencyId) =>
      completed.has(dependencyId),
    );

    if (allDependenciesCompleted) {
      ready.push(node);
    }
  }

  return ready;
}

export function topologicalLayers(graph: DagGraph): ReadonlyMap<NodeId, number> {
  const layers = new Map<NodeId, number>();
  const completed = new Set<NodeId>();
  let changed = true;

  while (changed) {
    changed = false;

    for (const node of graph.nodes.values()) {
      if (layers.has(node.id)) {
        continue;
      }

      const dependencyLayers = node.dependencies.map((dependencyId) => layers.get(dependencyId));
      if (dependencyLayers.some((layer) => layer === undefined)) {
        continue;
      }

      const maxDependencyLayer =
        dependencyLayers.length === 0 ? -1 : Math.max(...(dependencyLayers as number[]));
      layers.set(node.id, maxDependencyLayer + 1);
      completed.add(node.id);
      changed = true;
    }
  }

  return layers;
}
