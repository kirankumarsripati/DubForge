import type { OutputConfiguration } from '@dubforge/job-config';
import type { TranslationProfile } from '@dubforge/types';
import { NODE_KINDS, type DagGraph, type DagNode, type NodeId } from '../dag/types';

export interface WorkflowCompileInput {
  readonly workflowId: string;
  readonly jobId: string;
  readonly videoPath: string;
  readonly videoFilename: string;
  readonly durationSeconds: number;
  readonly targetLanguages: readonly string[];
  readonly profile: TranslationProfile;
  readonly output: OutputConfiguration;
  readonly outputDirectory: string;
  readonly artifactRoot: string;
}

interface NodeSpec {
  readonly id: NodeId;
  readonly kind: DagNode['kind'];
  readonly label: string;
  readonly dependencies: readonly NodeId[];
  readonly retryable: boolean;
  readonly languageCode: string | null;
}

function createNodeId(kind: DagNode['kind'], languageCode: string | null = null): NodeId {
  return languageCode === null ? kind : `${kind}:${languageCode}`;
}

function buildLinearChain(input: WorkflowCompileInput): NodeSpec[] {
  const nodes: NodeSpec[] = [
    {
      id: createNodeId(NODE_KINDS.VALIDATE),
      kind: NODE_KINDS.VALIDATE,
      label: 'Validate',
      dependencies: [],
      retryable: false,
      languageCode: null,
    },
    {
      id: createNodeId(NODE_KINDS.FINGERPRINT),
      kind: NODE_KINDS.FINGERPRINT,
      label: 'Fingerprint',
      dependencies: [createNodeId(NODE_KINDS.VALIDATE)],
      retryable: true,
      languageCode: null,
    },
    {
      id: createNodeId(NODE_KINDS.METADATA),
      kind: NODE_KINDS.METADATA,
      label: 'Metadata',
      dependencies: [createNodeId(NODE_KINDS.FINGERPRINT)],
      retryable: true,
      languageCode: null,
    },
    {
      id: createNodeId(NODE_KINDS.EXTRACT_AUDIO),
      kind: NODE_KINDS.EXTRACT_AUDIO,
      label: 'Extract Audio',
      dependencies: [createNodeId(NODE_KINDS.METADATA)],
      retryable: true,
      languageCode: null,
    },
    {
      id: createNodeId(NODE_KINDS.SPEECH_RECOGNITION),
      kind: NODE_KINDS.SPEECH_RECOGNITION,
      label: 'Speech Recognition',
      dependencies: [createNodeId(NODE_KINDS.EXTRACT_AUDIO)],
      retryable: true,
      languageCode: null,
    },
    {
      id: createNodeId(NODE_KINDS.ENGLISH_TRANSCRIPT),
      kind: NODE_KINDS.ENGLISH_TRANSCRIPT,
      label: 'English Transcript',
      dependencies: [createNodeId(NODE_KINDS.SPEECH_RECOGNITION)],
      retryable: true,
      languageCode: null,
    },
  ];

  if (input.output.generateSubtitles || input.output.exportSrt) {
    nodes.push({
      id: createNodeId(NODE_KINDS.ENGLISH_SUBTITLE),
      kind: NODE_KINDS.ENGLISH_SUBTITLE,
      label: 'English Subtitle',
      dependencies: [createNodeId(NODE_KINDS.ENGLISH_TRANSCRIPT)],
      retryable: true,
      languageCode: null,
    });
  }

  return nodes;
}

function buildLanguageNodes(
  input: WorkflowCompileInput,
  upstreamId: NodeId,
): { nodes: NodeSpec[]; terminalIds: NodeId[] } {
  const nodes: NodeSpec[] = [];
  const terminalIds: NodeId[] = [];

  for (const languageCode of input.targetLanguages) {
    let previousId = upstreamId;

    const translateId = createNodeId(NODE_KINDS.TRANSLATE, languageCode);
    nodes.push({
      id: translateId,
      kind: NODE_KINDS.TRANSLATE,
      label: `Translate (${languageCode})`,
      dependencies: [previousId],
      retryable: true,
      languageCode,
    });
    previousId = translateId;

    if (input.output.generateSubtitles || input.output.exportSrt) {
      const subtitleId = createNodeId(NODE_KINDS.SUBTITLE, languageCode);
      nodes.push({
        id: subtitleId,
        kind: NODE_KINDS.SUBTITLE,
        label: `Subtitle (${languageCode})`,
        dependencies: [previousId],
        retryable: true,
        languageCode,
      });
      previousId = subtitleId;
    }

    if (input.output.generateTranslatedAudio) {
      const speechId = createNodeId(NODE_KINDS.SPEECH, languageCode);
      nodes.push({
        id: speechId,
        kind: NODE_KINDS.SPEECH,
        label: `Speech (${languageCode})`,
        dependencies: [previousId],
        retryable: true,
        languageCode,
      });

      const alignId = createNodeId(NODE_KINDS.ALIGN, languageCode);
      nodes.push({
        id: alignId,
        kind: NODE_KINDS.ALIGN,
        label: `Align (${languageCode})`,
        dependencies: [speechId],
        retryable: true,
        languageCode,
      });
      terminalIds.push(alignId);
    } else {
      terminalIds.push(previousId);
    }
  }

  return { nodes, terminalIds };
}

function assignLayers(nodeSpecs: readonly NodeSpec[]): DagNode[] {
  const specById = new Map(nodeSpecs.map((spec) => [spec.id, spec]));
  const layers = new Map<NodeId, number>();

  let changed = true;
  while (changed) {
    changed = false;

    for (const spec of nodeSpecs) {
      if (layers.has(spec.id)) {
        continue;
      }

      const dependencyLayers = spec.dependencies.map((dependencyId) => layers.get(dependencyId));
      if (dependencyLayers.some((layer) => layer === undefined)) {
        continue;
      }

      const maxDependencyLayer =
        dependencyLayers.length === 0 ? -1 : Math.max(...(dependencyLayers as number[]));
      layers.set(spec.id, maxDependencyLayer + 1);
      changed = true;
    }
  }

  return nodeSpecs.map((spec) => {
    const layer = layers.get(spec.id);
    if (layer === undefined) {
      throw new Error(`Unable to assign layer for node "${spec.id}".`);
    }

    const dependencies = spec.dependencies.map((dependencyId) => {
      if (!specById.has(dependencyId)) {
        throw new Error(`Missing dependency "${dependencyId}" for node "${spec.id}".`);
      }
      return dependencyId;
    });

    return {
      id: spec.id,
      kind: spec.kind,
      label: spec.label,
      dependencies,
      retryable: spec.retryable,
      languageCode: spec.languageCode,
      layer,
    };
  });
}

export function compileWorkflow(input: WorkflowCompileInput): DagGraph {
  const linearNodes = buildLinearChain(input);
  const upstreamId =
    input.output.generateSubtitles || input.output.exportSrt
      ? createNodeId(NODE_KINDS.ENGLISH_SUBTITLE)
      : createNodeId(NODE_KINDS.ENGLISH_TRANSCRIPT);

  const { nodes: languageNodes, terminalIds } = buildLanguageNodes(input, upstreamId);

  const muxDependencies = terminalIds.length > 0 ? terminalIds : [upstreamId];

  const tailNodes: NodeSpec[] = [
    {
      id: createNodeId(NODE_KINDS.MUX),
      kind: NODE_KINDS.MUX,
      label: 'Mux',
      dependencies: muxDependencies,
      retryable: true,
      languageCode: null,
    },
    {
      id: createNodeId(NODE_KINDS.VERIFY),
      kind: NODE_KINDS.VERIFY,
      label: 'Verify',
      dependencies: [createNodeId(NODE_KINDS.MUX)],
      retryable: false,
      languageCode: null,
    },
    {
      id: createNodeId(NODE_KINDS.MANIFEST),
      kind: NODE_KINDS.MANIFEST,
      label: 'Manifest',
      dependencies: [createNodeId(NODE_KINDS.VERIFY)],
      retryable: true,
      languageCode: null,
    },
  ];

  const allSpecs = [...linearNodes, ...languageNodes, ...tailNodes];
  const dagNodes = assignLayers(allSpecs);
  const nodes = new Map<NodeId, DagNode>(dagNodes.map((node) => [node.id, node]));
  const roots = dagNodes.filter((node) => node.dependencies.length === 0).map((node) => node.id);

  return {
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodes,
    roots,
  };
}
