import type { DesktopApi } from '@masterpiece/runtime-core/application-contracts.ts';

declare global {
  interface Window {
    masterpiece: DesktopApi;
  }
}

export {};
