import type { DubForgeApi } from '@dubforge/shared';

declare global {
  interface Window {
    dubforge?: DubForgeApi;
  }
}

export {};
