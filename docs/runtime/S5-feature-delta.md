# S5 Feature Delta

Status: `COMPLETE`

| Current product capability | Before | Required after | Evidence |
|---|---|---|---|
| Web UI | Web renderer | unchanged | actual browser state / Web build |
| Project storage/access | Shared Runtime via Node | unchanged | Node Host project tests/smoke |
| Visual Analysis | Shared Runtime | unchanged | Runtime + current flows |
| Document Context | Shared Runtime | unchanged | retained application tests |
| Reference First | Shared Runtime | unchanged | Unit/Golden/Web Smoke |
| Standard Space | Shared Runtime | unchanged | Unit/Golden/Web Smoke |
| Continuation | Shared Runtime | unchanged | retained application tests |
| Packaging | Shared Runtime | unchanged | Unit/Golden |
| Settings/credentials | Node adapters | unchanged | Node adapter tests |
| File selection/export/open | Node native operations | unchanged local-Web equivalent | Node native/RPC registration |

Removed legacy-only features: Electron window lifecycle, IPC/preload bridge,
Desktop packaging/portable executable, `safeStorage` adapter code, and
Desktop-only smoke/build commands.

Current product features lost: `0`. User data and credential data touched:
`NO`. Credential behavior remains available through the Node encrypted store;
file selection/export/open operations remain available through 11 Node-native
operations.
