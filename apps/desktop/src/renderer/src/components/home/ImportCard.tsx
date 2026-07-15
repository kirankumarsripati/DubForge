import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@dubforge/ui';
import { Upload } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useHomeStore } from '../../stores/home-store';

export function ImportCard(): React.JSX.Element {
  const selectVideo = useHomeStore((state) => state.selectVideo);
  const inspectDroppedFile = useHomeStore((state) => state.inspectDroppedFile);
  const isImporting = useHomeStore((state) => state.isImporting);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);

      const file = event.dataTransfer.files.item(0);
      if (file === null) {
        return;
      }

      void inspectDroppedFile(file);
    },
    [inspectDroppedFile],
  );

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Import Video</CardTitle>
        <CardDescription>Drop a video file here or browse to select one.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={[
            'border-border flex flex-col items-center justify-center rounded-2xl border border-dashed px-8 py-16 transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'hover:border-primary/40',
          ].join(' ')}
          role="region"
          aria-label="Video import area"
          aria-busy={isImporting}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isImporting ? (
            <div className="flex w-full max-w-sm flex-col items-center gap-4">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          ) : (
            <>
              <Upload className="text-muted-foreground mb-4 size-10" aria-hidden="true" />
              <p className="text-muted-foreground text-sm">Drag and drop MP4 or MKV files</p>
              <p className="text-muted-foreground mt-1 text-xs">Supported formats: MP4, MKV</p>
              <Button
                className="mt-6"
                onClick={() => {
                  void selectVideo();
                }}
                aria-label="Browse for video file"
              >
                Browse
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
