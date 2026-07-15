import type { Model, ModelCategory, ModelStatus } from '@dubforge/types';
import { Badge, Button, Progress } from '@dubforge/ui';
import { formatBytes } from '../../lib/format';

interface ModelsListProps {
  models: readonly Model[];
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string) => void;
  onVerify: (id: string) => void;
  onRepair: (id: string) => void;
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

function statusLabel(status: ModelStatus): string {
  switch (status) {
    case 'installed':
      return 'Installed';
    case 'downloading':
      return 'Downloading';
    case 'verifying':
      return 'Verifying';
    case 'missing':
      return 'Missing';
    case 'corrupted':
      return 'Corrupted';
    case 'update-available':
      return 'Update Available';
  }
}

function statusVariant(
  status: ModelStatus,
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' {
  switch (status) {
    case 'installed':
      return 'success';
    case 'downloading':
    case 'verifying':
      return 'default';
    case 'missing':
    case 'update-available':
      return 'warning';
    case 'corrupted':
      return 'destructive';
  }
}

export function ModelsList({
  models,
  onDownload,
  onDelete,
  onUpdate,
  onVerify,
  onRepair,
}: ModelsListProps): React.JSX.Element {
  const totalSize = models
    .filter((model) => model.status === 'installed')
    .reduce((sum, model) => sum + model.sizeBytes, 0);

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
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{model.name}</h3>
                <Badge variant="outline">{categoryLabel(model.category)}</Badge>
                <Badge variant={statusVariant(model.status)}>{statusLabel(model.status)}</Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                v{model.version}
                {model.latestVersion !== model.version ? ` · latest v${model.latestVersion}` : ''}
                {' · '}
                {formatBytes(model.sizeBytes)}
              </p>
              {model.checksum !== null ? (
                <p className="text-muted-foreground mt-1 truncate font-mono text-xs">
                  SHA-256: {model.checksum}
                </p>
              ) : null}
              {model.requiredBy.length > 0 ? (
                <p className="text-muted-foreground mt-1 text-sm">
                  Required by: {model.requiredBy.join(', ')}
                </p>
              ) : null}
              {(model.status === 'downloading' || model.status === 'verifying') &&
              model.downloadProgress !== null ? (
                <div className="mt-3">
                  <Progress
                    value={model.downloadProgress}
                    label={model.status === 'verifying' ? 'Verifying' : 'Downloading'}
                  />
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
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
              {model.status === 'update-available' ? (
                <Button
                  size="sm"
                  onClick={() => {
                    onUpdate(model.id);
                  }}
                >
                  Update
                </Button>
              ) : null}
              {model.status === 'corrupted' ? (
                <Button
                  size="sm"
                  onClick={() => {
                    onRepair(model.id);
                  }}
                >
                  Repair
                </Button>
              ) : null}
              {model.status === 'installed' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onVerify(model.id);
                  }}
                >
                  Verify
                </Button>
              ) : null}
              {model.status !== 'missing' &&
              model.status !== 'downloading' &&
              model.status !== 'verifying' ? (
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
