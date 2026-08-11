# S5-I Dead Reference Sweep Manifest

## Result

- tracked `apps/desktop` files: 0
- current production imports from Desktop: 0
- current production imports from Electron: 0
- exact Electron/electron-vite/electron-builder lock entries: 0
- Node Host -> Desktop/Electron imports: 0
- Web Renderer -> Desktop/Electron imports: 0
- Shared Runtime/Core -> Desktop/Electron imports: 0

`electron-to-chromium` remains as Vite/browser compatibility data; it is not
an Electron runtime and has no Electron executable or host dependency.

## Remaining match classification

| Location | Classification | Reason |
|---|---|---|
| S4/S4.1/S4.2/S4.1R reports and manifests | `HISTORICAL_DOC` | preserve repository migration truth |
| archive/evaluation/baseline documents | `HISTORICAL_DOC` | frozen evidence, not current Runtime |
| Web smoke process-tree checks | `TEST_GUARD` | prove Electron/Desktop Main process count remains zero |
| architecture/boundary tests | `TEST_GUARD` | prevent removed dependencies from returning |
| production/version verification scripts | `RELEASE_GUARD` | assert removed workspace/dependencies remain absent |
| `.codex-smoke/electron-polluted-backup` warning in `AGENTS.md` | `SAFETY_COMMENT` | prevents retracking a historical local binary |

Current README, Roadmap, AGENTS, architecture, ownership, version, production
boundary and current-flow documents/scripts were updated to the Web + Node
topology. No historical report was rewritten for grep cleanliness.

