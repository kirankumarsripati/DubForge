import type { Job, JobStatus } from '@dubforge/types';
import { Badge, Button, Progress } from '@dubforge/ui';
import { formatDate, formatDuration, formatLanguageCodes } from '../../lib/format';

interface JobsTableProps {
  jobs: readonly Job[];
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
}

function statusVariant(
  status: JobStatus,
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'processing':
    case 'validating':
      return 'default';
    case 'queued':
      return 'secondary';
    case 'failed':
      return 'destructive';
    case 'cancelled':
      return 'warning';
  }
}

export function JobsTable({ jobs, onRetry, onDelete }: JobsTableProps): React.JSX.Element {
  return (
    <div className="border-border overflow-x-auto rounded-2xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-card border-border border-b">
          <tr>
            <th className="px-4 py-3 font-medium" scope="col">
              Status
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Filename
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Languages
            </th>
            <th className="hidden px-4 py-3 font-medium lg:table-cell" scope="col">
              Started
            </th>
            <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">
              Duration
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Progress
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-border border-b last:border-0">
              <td className="px-4 py-3">
                <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
              </td>
              <td className="max-w-[200px] truncate px-4 py-3 font-medium">{job.filename}</td>
              <td className="text-muted-foreground px-4 py-3">
                {formatLanguageCodes(job.languages)}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 lg:table-cell">
                {job.startedAt ? formatDate(job.startedAt) : '—'}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                {job.durationSeconds ? formatDuration(job.durationSeconds) : '—'}
              </td>
              <td className="min-w-[120px] px-4 py-3">
                <Progress value={job.progress} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  {job.status === 'failed' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onRetry(job.id);
                      }}
                      aria-label={`Retry ${job.filename}`}
                    >
                      Retry
                    </Button>
                  ) : null}
                  {job.status === 'completed' && job.outputPath ? (
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Open output for ${job.filename}`}
                    >
                      Open
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onDelete(job.id);
                    }}
                    aria-label={`Delete ${job.filename}`}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
