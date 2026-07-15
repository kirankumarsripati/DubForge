import { AlertCircle } from 'lucide-react';
import { Button } from './button';

interface ErrorStateProps {
  title: string;
  description: string;
  recoveryAction?: string;
  onRetry?: () => void;
  onOpenLogs?: () => void;
}

export function ErrorState({
  title,
  description,
  recoveryAction,
  onRetry,
  onOpenLogs,
}: ErrorStateProps): React.JSX.Element {
  return (
    <div
      className="border-destructive/30 bg-destructive/5 flex flex-col items-center rounded-2xl border px-6 py-12 text-center"
      role="alert"
    >
      <div className="bg-destructive/10 mb-4 flex size-14 items-center justify-center rounded-2xl">
        <AlertCircle className="text-destructive size-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">{description}</p>
      {recoveryAction ? (
        <p className="text-muted-foreground mt-3 max-w-md text-xs">{recoveryAction}</p>
      ) : null}
      <div className="mt-6 flex gap-3">
        {onRetry ? (
          <Button onClick={onRetry} aria-label="Retry loading">
            Retry
          </Button>
        ) : null}
        {onOpenLogs ? (
          <Button variant="outline" onClick={onOpenLogs} aria-label="Open logs">
            Open Logs
          </Button>
        ) : null}
      </div>
    </div>
  );
}
