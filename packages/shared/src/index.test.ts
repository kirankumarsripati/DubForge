import { describe, expect, it } from 'vitest';
import { createAppId } from './index';

describe('createAppId', () => {
  it('returns a valid UUID string', () => {
    const id = createAppId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});
