import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    const result: string = cn('px-2', 'py-2');
    expect(result).toBe('px-2 py-2');
  });

  it('resolves tailwind conflicts', () => {
    const result: string = cn('px-2', 'px-4');
    expect(result).toBe('px-4');
  });
});
