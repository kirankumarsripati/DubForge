import { Button, Card, CardContent, CardHeader, CardTitle } from '@dubforge/ui';
import type { VideoMetadata } from '@dubforge/types';
import { Film, FolderOpen } from 'lucide-react';
import { formatBytes, formatDuration } from '../../lib/format';

interface VideoInfoCardProps {
  video: VideoMetadata;
  outputDirectory: string;
  onChangeVideo: () => void;
}

export function VideoInfoCard({
  video,
  outputDirectory,
  onChangeVideo,
}: VideoInfoCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Video Information</CardTitle>
        <Button variant="outline" size="sm" onClick={onChangeVideo}>
          Change
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="bg-muted flex size-20 shrink-0 items-center justify-center rounded-xl">
            <Film className="text-muted-foreground size-8" aria-hidden="true" />
          </div>
          <dl className="grid flex-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Filename</dt>
              <dd className="font-medium">{video.filename}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="font-medium">{formatDuration(video.durationSeconds)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Resolution</dt>
              <dd className="font-medium">{video.resolution}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Codec</dt>
              <dd className="font-medium">{video.codec}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Audio Tracks</dt>
              <dd className="font-medium">{video.audioTracks}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">File Size</dt>
              <dd className="font-medium">{formatBytes(video.fileSizeBytes)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Output Folder</dt>
              <dd className="flex items-center gap-2 font-medium">
                <FolderOpen className="text-muted-foreground size-4" aria-hidden="true" />
                {outputDirectory}
              </dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
