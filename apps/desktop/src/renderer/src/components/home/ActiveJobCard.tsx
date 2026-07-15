import type { Job } from '@dubforge/types';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Progress } from '@dubforge/ui';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import type { PipelineStageStatus } from '@dubforge/types';
import { GraphTimelineSection } from '../jobs/GraphTimeline';

interface ActiveJobCardProps {
  job: Job;
  onCancel: () => void;
}

function StageIcon({ status }: { status: PipelineStageStatus }): React.JSX.Element {
  if (status === 'completed') {
    return <CheckCircle2 className="size-4 text-emerald-400" aria-hidden="true" />;
  }
  if (status === 'running') {
    return <Loader2 className="text-primary size-4 animate-spin" aria-hidden="true" />;
  }
  if (status === 'failed') {
    return <XCircle className="text-destructive size-4" aria-hidden="true" />;
  }
  return <Circle className="text-muted-foreground size-4" aria-hidden="true" />;
}

export function ActiveJobCard({ job, onCancel }: ActiveJobCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">{job.filename}</CardTitle>
          <Badge variant="secondary" className="mt-2">
            {job.status}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={job.progress} label="Overall progress" />
        <ol className="space-y-2" aria-label="Pipeline stages">
          {job.stages.map((stage) => (
            <li key={stage.name} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm">
              <StageIcon status={stage.status} />
              <span
                className={
                  stage.status === 'running'
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                }
              >
                {stage.label}
              </span>
              {stage.status === 'running' ? (
                <span className="text-muted-foreground ml-auto text-xs">{stage.progress}%</span>
              ) : null}
            </li>
          ))}
        </ol>
        <GraphTimelineSection job={job} />
      </CardContent>
    </Card>
  );
}
