import type { RuntimeApi } from '@masterpiece/runtime-core/application-contracts.ts';

declare global {
  interface Window {
    masterpiece: RuntimeApi;
  }
}

export {};
