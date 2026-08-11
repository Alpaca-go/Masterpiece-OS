# Smoke Test Runtime Audit

## Answer

```text
Does the pre-P0 smoke suite represent Web production behavior?
NO
```

Before P0, real-provider smoke tests either:

- launched Electron and instantiated services from `apps/desktop/src/main` directly;
- invoked the runtime compiler and Provider endpoint directly;
- or exercised pure shared-core fixtures offline.

None entered through the browser `createWebDesktopApi()` bridge and Web RPC server. This is `CRITICAL_FALSE_GREEN`: a Desktop/Core smoke can pass while Web boot, proxy/origin, channel mapping, config, upload, or Web runtime behavior fails.

After P0, the repository has a Web structural smoke:

```bash
npm --prefix apps/desktop run smoke:web
```

It executes the actual Web boot and RPC path with an isolated user-data directory, random RPC port, no credentials, no model call, and no business-project write.

## Smoke inventory

| Test / command | Entry | Actual runtime | Production representative | Notes |
|---|---|---|---|---|
| `smoke:web` | `run-web-primary-smoke.mjs` | Web renderer + Web RPC + Desktop-hosted services | YES (structural) | Web boot/config/routes; 0 Provider calls |
| `smoke:real-provider` | `run-real-provider-smoke.mjs` → `real-provider-v6-smoke.ts` | Electron + Desktop services | NO | Legacy Compatibility Test |
| `smoke:creative-direction` / `smoke:visual-upgrade` | `real-provider-v18-1-smoke.ts` | Electron + Desktop creative services | NO | Bypasses Web API/RPC |
| `smoke:visual-decision` | `real-provider-visual-decision-smoke.ts` | Electron + Desktop analysis/vNext services | NO | Useful Core/Desktop E2E only |
| `smoke:golden-control` | `real-provider-golden-control-smoke.ts` | Electron + Desktop image service | NO | Provider/Golden control |
| `smoke:production-stability` | `real-provider-production-stability-smoke.ts` | Electron + Desktop vNext/image services | NO | Legacy compatibility despite name |
| `smoke:logo-post-composite` | `real-provider-logo-post-composite-smoke.ts` | Electron + Desktop vNext/image services | NO | Feature-specific Desktop test |
| `space-gen:test-real` | `run-space-generator-real-test.mjs` | Electron safeStorage + direct compiler/provider fetch | NO | Bypasses production Web service route |
| `space-gen:ab-test` | `run-space-generator-ab-test.mjs` | Electron safeStorage + direct compiler/provider fetch | NO | Evaluation test |
| `run-r2-b4-reference-first-smoke.mjs` | direct compiler + direct Seedream fetch | Core/Provider | NO | Reference-First semantics, not Web |
| `run-r8.6-final-smoke.mjs` | direct compiler + direct Seedream fetch | Core/Provider | NO | Frozen baseline behavior |
| `run-r85-redirect-stability-smoke.mjs` | direct compiler + direct Seedream fetch | Core/Provider | NO | Historical baseline |
| `phase-9b/run-phase-9b-smoke.mjs` | Electron + Desktop pipeline/image service | Desktop/Core | NO | Legacy compatibility |
| `space-quality-recovery/run-ab-smoke.mjs` | direct shared compiler/fixture | Shared Core | PARTIAL | No Web transport/config/provider |
| `tests/image-generation/phase9b-ab-smoke.test.js` | Node test | Shared Core | PARTIAL | Offline compiler regression |
| `verify:current-flows` | Node tests + Desktop typecheck | Shared Core/Desktop contracts | PARTIAL | Explicitly offline, no Web boot |
| `desktop:test` | TS unit/integration tests | Desktop services + pure modules | NO | Valuable but not Web acceptance |
| `test` / `test:image-generation` | Node tests | Shared packages/core | PARTIAL | Core evidence only |

Historical scripts not exposed by package commands remain evaluation/archive evidence and are `UNKNOWN/KEEP` until S0 inventory. They are not Web acceptance.

## False-green bypass matrix

| Web production layer | Old real-provider smokes | Consequence |
|---|---:|---|
| Browser renderer boot | Bypassed | UI boot/render failures invisible |
| `renderer/web-api.ts` channel mapping | Bypassed | wrong channel names invisible |
| Vite `/_masterpiece` proxy | Bypassed | port/origin/proxy errors invisible |
| Web RPC server/origin policy | Bypassed | RPC reachability failures invisible |
| Web config through RPC | Usually bypassed or called directly | Web credential/config problems invisible |
| Browser upload semantics | Bypassed | drag/drop/native dialog differences invisible |
| Actual compiler/provider core | Often exercised | Core behavior may still be well covered |

Classification: `CRITICAL_FALSE_GREEN` for using Desktop-only PASS as Masterpiece acceptance.

## New Web smoke contract

### Command

```bash
npm --prefix apps/desktop run smoke:web
```

### Path

```text
run-web-primary-smoke.mjs
→ electron-vite dev with MASTERPIECE_WEB_MODE=1
→ renderer main.tsx
→ createWebDesktopApi()
→ Vite /_masterpiece proxy
→ web-rpc-server.ts
→ main/index.ts handler map
→ existing services
```

### Checks

- Web backend boot and `/_masterpiece/health`.
- React renderer reaches a non-splash, non-error page.
- config load through `settings:get`.
- provider capability/registry resolution without credentials.
- analysis service reachability through `analysis:cancel` on a known non-active ID.
- Reference First options through `image-generation:vnext-options`.
- compiler channel reachability using an invalid, non-writing project input.
- generator channel reachability using an invalid, non-writing task input.

Expected:

```text
status=pass
providerCalls=0
businessWrites=0
```

Actual on 2026-08-11:

```text
status=pass
webBoot=true
rendererPage=true
configLoad=true
providerResolution=true
analysisServiceReachable=true
referenceFirstServiceReachable=true
compilerRouteReachable=true
generatorRouteReachable=true
providerCalls=0
businessWrites=0
```

Evidence: `.codex-smoke/web-primary-runtime/latest-result.json`.

## Audit observations from establishing the smoke

The smoke correctly exposed two infrastructure assumptions during construction:

1. a random Web RPC port must also be supplied to the Vite proxy target;
2. a valid first-run Web page can be `page settings-page` rather than `.app-shell` when no API Profile exists.

Both were resolved inside smoke infrastructure. No prompt, compiler, Reference First, generator, provider, or schema behavior was changed.

## Acceptance policy

From P0 onward:

```text
Desktop/Core smoke PASS + Web smoke FAIL = NOT ACCEPTED
Core smoke PASS + Web smoke PASS = minimum structural acceptance
```

A user-authorized real-provider E2E is still required where release policy calls for it. The structural Web smoke does not claim Provider output quality or browser upload completeness.
