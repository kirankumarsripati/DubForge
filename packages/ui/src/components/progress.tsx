import { cn } from '../lib/utils';

interface ProgressProps {
  value: number;
  className?: string;
  label?: string;
}

function Progress({ value, className, label }: ProgressProps): React.JSX.Element {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <div className="text-muted-foreground mb-2 flex justify-between text-xs">
          <span>{label}</span>
          <span>{Math.round(clamped)}%</span>
        </div>
      ) : null}
      <div
        className="bg-muted h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="bg-primary h-full rounded-full transition-all duration-200"
          style={{ width: `${String(clamped)}%` }}
        />
      </div>
    </div>
  );
}

export { Progress };
