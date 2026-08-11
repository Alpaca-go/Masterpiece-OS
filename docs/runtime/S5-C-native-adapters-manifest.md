# S5-C Desktop Native Adapters Manifest

## Removed

- `apps/desktop/src/main/settings-store.ts`: Electron settings and
  `safeStorage` credential adapter.

The remaining dialog, shell and path adapter code is embedded in the legacy
Electron Main lifecycle and is removed with S5-E, after its Node replacement
has been verified.

## Current equivalents

| Desktop capability | Current owner |
|---|---|
| API profile settings | `apps/web-runtime/src/node-settings-store.ts` |
| API Key encryption | `apps/web-runtime/src/node-credential-store.ts` (AES-256-GCM) |
| file/folder selection inputs | `apps/web-runtime/src/node-native-operations.ts` |
| report/document/reference export | `apps/web-runtime/src/node-native-operations.ts` |
| open output folder | `apps/web-runtime/src/node-native-operations.ts` |

Node native operation coverage remains 11 operations; Shared Registry
business coverage remains 136 operations.

