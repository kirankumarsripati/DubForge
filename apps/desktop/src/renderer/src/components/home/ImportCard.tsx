import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dubforge/ui';
import { Upload } from 'lucide-react';
import { useHomeStore } from '../../stores/home-store';

export function ImportCard(): React.JSX.Element {
  const selectVideo = useHomeStore((state) => state.selectVideo);
  const selectedVideo = useHomeStore((state) => state.selectedVideo);

  if (selectedVideo) {
    return <></>;
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Import Video</CardTitle>
        <CardDescription>Drop a video file here or browse to select one.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="border-border hover:border-primary/40 flex flex-col items-center justify-center rounded-2xl border border-dashed px-8 py-16 transition-colors"
          role="region"
          aria-label="Video import area"
        >
          <Upload className="text-muted-foreground mb-4 size-10" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">Drag and drop MP4 or MKV files</p>
          <p className="text-muted-foreground mt-1 text-xs">Supported formats: MP4, MKV</p>
          <Button className="mt-6" onClick={selectVideo} aria-label="Browse for video file">
            Browse
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
