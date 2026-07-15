import type { Model, ModelCategory, ModelStatus } from '@dubforge/types';
import { Badge, Button, Progress } from '@dubforge/ui';
import { formatBytes } from '../../lib/format';

interface ModelsListProps {
  models: readonly Model[];
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string) => void;
}

function categoryLabel(category: ModelCategory): string {
  switch (category) {
    case 'speech-to-text':
      return 'Speech Recognition';
    case 'translation':
      return 'Translation';
    case 'speech':
      return 'Speech Generation';
  }
}

function statusVariant(
  status: ModelStatus,
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' {
  switch (status) {
    case 'ready':
    case 'installed':
      return 'success';
    case 'downloading':
    case 'updating':
      return 'default';
    case 'missing':
      return 'warning';
  }
}

export function ModelsList({
  models,
  onDownload,
  onDelete,
  onUpdate,
}: ModelsListProps): React.JSX.Element {
  const totalSize = models
    .filter((m) => m.status === 'installed' || m.status === 'ready')
    .reduce((sum, m) => sum + m.sizeBytes, 0);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Disk usage: <span className="text-foreground font-medium">{formatBytes(totalSize)}</span>
      </p>
      <div className="space-y-3">
        {models.map((model) => (
          <div
            key={model.id}
            className="bg-card border-border flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{model.name}</h3>
                <Badge variant="outline">{categoryLabel(model.category)}</Badge>
                <Badge variant={statusVariant(model.status)}>{model.status}</Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                v{model.version} · {formatBytes(model.sizeBytes)}
              </p>
              {model.status === 'downloading' && model.downloadProgress !== null ? (
                <div className="mt-3">
                  <Progress value={model.downloadProgress} label="Downloading" />
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              {model.status === 'missing' ? (
                <Button
                  size="sm"
                  onClick={() => {
                    onDownload(model.id);
                  }}
                >
                  Download
                </Button>
              ) : null}
              {(model.status === 'installed' || model.status === 'ready') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onUpdate(model.id);
                  }}
                >
                  Update
                </Button>
              )}
              {model.status !== 'missing' && model.status !== 'downloading' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onDelete(model.id);
                  }}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
