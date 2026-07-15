import * as React from 'react';

import { cn } from '../lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'border-input bg-card ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm',
        'placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
