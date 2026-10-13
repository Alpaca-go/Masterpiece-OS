# Configuration Baseline

## Runtime-affecting configuration

| Area | Source/key | Baseline meaning |
|---|---|---|
| Product | `/VERSION` | unique product version source |
| Web mode | `MASTERPIECE_WEB_MODE=1` | hosts renderer plus HTTP RPC bridge |
| Web RPC | `MASTERPIECE_WEB_RPC_PORT`, `MASTERPIECE_WEB_RPC_URL` | local RPC binding/proxy target |
| Browser launch | `MASTERPIECE_WEB_OPEN_BROWSER` | optional browser opening only |
| Profiles | `apps/web-runtime/src/node-settings-store.ts` | encrypted local provider credentials and defaults |
| Model registry | `packages/model-registry/src/index.js` | model/protocol responsibility validation |
| Analysis prompt | `MASTERPIECE_PROMPT_ROOT` | default `apps/cli/prompts/analysis` via `apps/web-runtime/src/runtime-paths.ts` |
| Direct CLI | `--provider`, `MASTERPIECE_PROVIDER` | direct CLI reasoner selection |
| Space compiler | `MASTERPIECE_SPACE_COMPILER_MODE` | `r8_6_golden`, alias `phase9b_quality`, fallback `vnext_legacy` |
| Reference policy | Product Policy + adapter capability | explicit refs, effective count, role controls |
| Wan compatibility | `MASTERPIECE_DASHSCOPE_API_KEY` | legacy environment fallback |

## Runtime requirements

- Node.js 20.9 or newer.
- Root workspace and single root `package-lock.json`.
- Web backend is the Node host in `apps/web-runtime/`. Desktop/Electron was removed in S5. This tip has no `apps/desktop/` tree.
- A valid analysis profile is required for real analysis; a valid Seedream profile is required for current real generation.

Only key names and semantics are frozen. Secret values, credential paths and user-specific IDs are excluded.
