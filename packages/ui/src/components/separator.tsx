import { cn } from '../lib/utils';

function Separator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn('bg-border shrink-0', className)}
      role="separator"
      aria-orientation="horizontal"
      {...props}
    />
  );
}

export { Separator };
