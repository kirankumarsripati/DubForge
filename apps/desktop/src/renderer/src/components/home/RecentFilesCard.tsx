import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dubforge/ui';
import type { RecentVideoFile } from '@dubforge/types';
import { Clock, Film } from 'lucide-react';
import { formatDate, formatDuration } from '../../lib/format';

interface RecentFilesCardProps {
  readonly files: readonly RecentVideoFile[];
  readonly onOpen: (id: string) => void;
}

export function RecentFilesCard({ files, onOpen }: RecentFilesCardProps): React.JSX.Element {
  if (files.length === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Recent Files</CardTitle>
          <CardDescription>Imported videos will appear here for quick access.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex flex-col items-center gap-3 py-8 text-center text-sm">
            <Film className="size-8" aria-hidden="true" />
            <p>No recent files</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg">Recent Files</CardTitle>
        <CardDescription>Open a recently imported video.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {files.map((file) => (
            <li key={file.id}>
              <Button
                variant="ghost"
                className="h-auto w-full justify-start gap-3 px-3 py-3"
                onClick={() => {
                  onOpen(file.id);
                }}
                aria-label={`Open ${file.filename}`}
              >
                <div className="bg-muted flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                  {file.thumbnailUrl ? (
                    <img
                      src={file.thumbnailUrl}
                      alt=""
                      className="size-full object-cover"
                      aria-hidden="true"
                    />
                  ) : (
                    <Film className="text-muted-foreground size-5" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate font-medium">{file.filename}</p>
                  <p className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" aria-hidden="true" />
                      {formatDuration(file.durationSeconds)}
                    </span>
                    <span>{formatDate(file.importedAt)}</span>
                  </p>
                </div>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
