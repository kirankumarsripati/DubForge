import { Skeleton } from './skeleton';

interface PageSkeletonProps {
  rows?: number;
}

export function PageSkeleton({ rows = 4 }: PageSkeletonProps): React.JSX.Element {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading content">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="bg-card border-border space-y-4 rounded-2xl border p-6">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
