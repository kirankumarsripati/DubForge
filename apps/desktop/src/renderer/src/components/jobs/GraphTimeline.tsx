import type { Job, WorkflowNodeStatus, WorkflowTimelineNode } from '@dubforge/types';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@dubforge/ui';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';

interface GraphTimelineProps {
  readonly timeline: readonly WorkflowTimelineNode[];
}

function NodeStatusIcon({ status }: { status: WorkflowNodeStatus }): React.JSX.Element {
  if (status === 'completed') {
    return <CheckCircle2 className="size-3.5 text-emerald-400" aria-hidden="true" />;
  }
  if (status === 'running') {
    return <Loader2 className="text-primary size-3.5 animate-spin" aria-hidden="true" />;
  }
  if (status === 'failed') {
    return <XCircle className="text-destructive size-3.5" aria-hidden="true" />;
  }
  return <Circle className="text-muted-foreground size-3.5" aria-hidden="true" />;
}

function statusLabel(status: WorkflowNodeStatus): string {
  return status.replace('-', ' ');
}

function groupByLayer(
  timeline: readonly WorkflowTimelineNode[],
): ReadonlyMap<number, WorkflowTimelineNode[]> {
  const layers = new Map<number, WorkflowTimelineNode[]>();

  for (const node of timeline) {
    const existing = layers.get(node.layer) ?? [];
    existing.push(node);
    layers.set(node.layer, existing);
  }

  return layers;
}

export function GraphTimeline({ timeline }: GraphTimelineProps): React.JSX.Element {
  const layers = groupByLayer(timeline);
  const sortedLayers = [...layers.entries()].sort(([left], [right]) => left - right);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Workflow Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div
            className="grid min-w-max gap-4"
            role="list"
            aria-label="Workflow graph timeline"
            style={{
              gridTemplateColumns: `repeat(${String(Math.max(sortedLayers.length, 1))}, minmax(180px, 1fr))`,
            }}
          >
            {sortedLayers.map(([layer, nodes]) => (
              <div key={layer} className="space-y-3" role="listitem">
                <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Layer {String(layer + 1)}
                </div>
                <div className="space-y-2">
                  {nodes.map((node) => (
                    <div
                      key={node.id}
                      className="border-border bg-card/60 rounded-lg border px-3 py-2"
                      aria-label={`${node.label}, ${statusLabel(node.status)}`}
                    >
                      <div className="flex items-center gap-2">
                        <NodeStatusIcon status={node.status} />
                        <span className="text-sm font-medium">{node.label}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {node.kind}
                        </Badge>
                        {node.status === 'running' ? (
                          <span className="text-muted-foreground text-xs">{node.progress}%</span>
                        ) : node.durationMs !== null ? (
                          <span className="text-muted-foreground text-xs">
                            {(node.durationMs / 1000).toFixed(1)}s
                          </span>
                        ) : null}
                      </div>
                      {node.dependencies.length > 0 ? (
                        <p className="text-muted-foreground mt-2 text-[11px]">
                          Depends on {node.dependencies.length} node
                          {node.dependencies.length === 1 ? '' : 's'}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface GraphTimelineSectionProps {
  readonly job: Job;
}

export function GraphTimelineSection({ job }: GraphTimelineSectionProps): React.JSX.Element | null {
  if (job.timeline.length === 0) {
    return null;
  }

  return <GraphTimeline timeline={job.timeline} />;
}
