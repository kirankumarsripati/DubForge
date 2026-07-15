import type { NodeKind } from '@dubforge/types';
import type { StageExecutionContext, StageExecutionResult } from '../stage/types';

export const PIPELINE_STAGE_CAPABILITY = 'pipeline.stage' as const;

export type PipelineStageCapabilityType = typeof PIPELINE_STAGE_CAPABILITY;

export interface PipelineStageCapabilityHandler {
  initialize(context: StageExecutionContext): Promise<void>;
  execute(context: StageExecutionContext): Promise<StageExecutionResult>;
  validate(result: StageExecutionResult): Promise<void>;
  cleanup(): Promise<void>;
}

export interface PipelineStageCapabilityDeclaration {
  readonly id: string;
  readonly type: PipelineStageCapabilityType;
  readonly key: NodeKind;
}
