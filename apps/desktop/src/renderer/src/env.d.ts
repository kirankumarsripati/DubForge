import type { DubForgeApi } from '../../../preload/index';

declare global {
  interface Window {
    dubforge: DubForgeApi;
  }
}

export {};
