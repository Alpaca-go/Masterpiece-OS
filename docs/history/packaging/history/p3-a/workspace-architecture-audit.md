# P3-A1 — Workspace Architecture Audit

> **Document Type**: Development Audit (P3-A1 deliverable)
> **Product**: Masterpiece OS / 妙作
> **Capability**: Packaging Generator
> **Phase**: P3-A — Workspace Architecture & Integration Contract
> **Sub-Step**: P3-A1 — Existing Web / Runtime Integration Audit
> **Date**: 2026-08-13
> **Rule**: Phase names describe history. Capability names describe software.
> **Status**: AUDIT COMPLETE — pre-implementation report
> **Frozen semantic baseline**: `335405342951fedae5d4d6816444c2b4d2402787` (P2-I Scanner Closure #2)
> **Accepted docs head**: `fbb703ca618c06358c6422545068f2bfbbc66cd8` (P2-J History Clarification)

---

## 0. Purpose

P3-A1 is the **pre-implementation audit** required by P3-A spec §47 and §57.
No production code, no test code, no runtime code is changed by this commit.
Only this audit document is added.

P3-A1 answers ten architectural questions and produces a final
"intended integration point" recommendation for the P3-A2 → P3-A6
production-code sub-steps. It explicitly does not invent a second
architecture.

---

## 1. Audit Method

Audit is read-only. The following files were inspected
(no modification, no side effect):

```text
apps/web/src/App.tsx
apps/web/src/main.tsx
apps/web/src/web-api.ts
apps/web/src/global.d.ts
apps/web/src/components/*.tsx
apps/web/src/continuation/ui-state.js
apps/web/src/reference-first/state.js

apps/web-runtime/src/local-rpc-server.ts
apps/web-runtime/src/node-runtime-host.ts
apps/web-runtime/src/node-native-operations.ts
apps/web-runtime/src/node-credential-store.ts
apps/web-runtime/src/node-settings-store.ts
apps/web-runtime/src/runtime-paths.ts
apps/web-runtime/src/current-operation-graph.ts

packages/runtime-core/src/application/runtime-services.ts
packages/runtime-core/src/application/image-generation/service.ts
packages/runtime-core/src/operations/image-generation-operations.js
packages/runtime-core/src/shared/types.ts
packages/runtime-core/src/application-contracts.ts

packages/image-generation-runtime/src/core/packaging-generation-core.js
packages/image-generation-runtime/src/core/space-generation-core.js
```

Total ~30 files reviewed. The audit is the **authoritative inventory** of
all existing wiring; any future P3-A work that wants to introduce a new
wiring must justify why the existing one cannot be reused.

---

## 2. Layer Map (Current Frozen State)

The current production code is already strictly layered. P3-A must not
break this layering.

```text
[Browser]
  apps/web/src/components/*.tsx              ← React UI components
  apps/web/src/web-api.ts                    ← RPC proxy (kebab-cased channel)
  apps/web/src/global.d.ts                   ← window.masterpiece: RuntimeApi

[HTTP Boundary]
  apps/web-runtime/src/local-rpc-server.ts   ← local RPC HTTP server
  apps/web-runtime/src/node-runtime-host.ts  ← composes runtime + RPC

[Shared Runtime Authority]
  packages/runtime-core/src/operations/*.js  ← RPC operations (image-generation, etc.)
  packages/runtime-core/src/application/     ← services
  packages/runtime-core/src/shared/types.ts  ← shared type re-exports
  packages/runtime-core/src/application-contracts.ts
                                             ← RuntimeApi contract (UI ↔ Runtime)

[Domain Packs]
  packages/image-generation-runtime/src/core/ ← Shared Core facades
    packaging-generation-core.js              ← Packaging-specific Shared Core facade
    space-generation-core.js                  ← Space-specific Shared Core facade
  packages/image-generation-runtime/src/      ← V1-V3 image generation production
    task-builder.js                           ← compileImageGenerationTask
    deliverables/                             ← fingerprint / deliverable
    gates.js                                  ← evaluateArtifactGate etc.
    policies.js                               ← capability presets
    redact.js                                 ← secret-safety redaction
    download-verify.js                        ← Provider image download
```

---

## 3. The Ten Audit Questions

### 3.1 Apps/web Current Feature Architecture

**Authority layer**: `apps/web/src/`.

**Component inventory** (existing):

| File | Responsibility |
|---|---|
| `App.tsx` | Root shell, role dispatch |
| `main.tsx` | Vite entrypoint |
| `web-api.ts` | `createWebRuntimeApi()` — RPC proxy via `fetch` + `EventSource` |
| `global.d.ts` | `window.masterpiece: RuntimeApi` |
| `utils.ts` | error cleanup helper |
| `components/AnalysisModeTabs.tsx` | Analysis feature tabs |
| `components/AnalysisView.tsx` | Analysis feature view |
| `components/AppErrorBoundary.tsx` | Top-level error boundary |
| `components/ContextIntegrationPanel.tsx` | Context integration panel |
| `components/DocumentContextWorkspace.tsx` | Document context workspace |
| `components/ImageGenerationWorkspace.tsx` | Legacy / generic image generation workspace |
| `components/ProjectWizard.tsx` | Project creation wizard |
| `components/ProviderBadge.tsx` | Provider status badge |
| `components/ReferenceAnchorWorkspace.tsx` | Reference anchor workspace |
| `components/ReportView.tsx` | Analysis report view |
| `components/SettingsPanel.tsx` | API profiles + settings panel |
| `components/ShortChainGenerationWorkspace.tsx` | Short-Chain generation workspace (current "V1" image generation UI) |
| `components/VisualAssetUploader.tsx` | Asset uploader |
| `continuation/ui-state.js` | UI-state helper |
| `reference-first/state.js` | Reference-first state helper |

**No `PackagingWorkspace` component currently exists.**
The closest existing UI is `ShortChainGenerationWorkspace.tsx`, which is
65 KB and is the Short-Chain visual generation workspace. It is **not** a
Packaging workspace.

**P3-A1 finding**: There is no existing Packaging workspace. The P3-A
integration layer must add a *new* `PackagingWorkspace` (P3-B concern) and
a *new* `packaging-integration` capability that the workspace imports
(P3-A2..A6 concern). No existing component may be repurposed as the
Packaging workspace because none of them carries the frozen
"Workspace does not own Packaging semantics" boundary (P3-A spec §5).

---

### 3.2 Current Workspace / Task Flow

**Existing flow** (UI-side, all via `window.masterpiece.<namespace>`):

```text
UI click → window.masterpiece.imageGeneration.<method>(...)
        → apps/web/src/web-api.ts namespaceProxy(method) → resolveWebRpcChannel()
        → fetch('POST /_masterpiece/rpc/<channel>')
        → apps/web-runtime/src/local-rpc-server.ts receive + invoke
        → shared runtime registry.execute(channel, args, { host: 'node-web' })
        → imageGeneration-operations.js → imageGeneration service.<method>
        → service.ts → Shared Core facade → packaging/compiler.js etc.
```

**P3-A1 finding**: The wiring is already uniform and stable. P3-A does not
need to add a new transport; it must add a new *capability namespace* on
top of the existing transport.

---

### 3.3 Web Runtime Calling image-generation-runtime Entry Point

**Entry point chain** (production):

| Layer | File | Function |
|---|---|---|
| UI binding | `apps/web/src/global.d.ts` | `window.masterpiece: RuntimeApi` |
| UI proxy | `apps/web/src/web-api.ts` | `createWebRuntimeApi()` |
| Channel map | `apps/web/src/web-api.ts` | `WEB_RPC_CHANNEL_OVERRIDES` (kebab-case) |
| HTTP server | `apps/web-runtime/src/local-rpc-server.ts` | `startLocalRpcServer({invoke})` |
| Host composer | `apps/web-runtime/src/node-runtime-host.ts` | `startNodeRuntimeHost({...})` |
| Operations registry | `apps/web-runtime/src/current-operation-graph.ts` | `createCurrentBusinessOperations(services, settings)` |
| Image generation operations | `packages/runtime-core/src/operations/image-generation-operations.js` | `createImageGenerationOperations({service, shortChainService})` |
| Image generation service | `packages/runtime-core/src/application/image-generation/service.ts` | `createImageGenerationService({...})` |
| Shared Core facade | `packages/image-generation-runtime/src/core/packaging-generation-core.js` | `compileImageGenerationTask`, `createCompileFingerprint`, etc. |
| Production modules | `packages/image-generation-runtime/src/packaging/*.js` | Translation, Compiler, Reference Policy, Provider Capability / Adapter, Metadata, Generation Service |

**P3-A1 finding**: The entry point is **already** a thin facade. The
P2-frozen `packaging/generation-service.js` exposes exactly the
`preparePackagingGeneration` / `executePackagingGeneration` /
`runPackagingGeneration` surface that P3-A spec §8.3 / §8.4 require.

**Critical**: P3-A spec §8 explicitly forbids the Workspace from calling
`createPackagingTranslation` / `compilePackagingPrompt` /
`buildPackagingProviderPayload` / `createPackagingMetadata`. The current
service.ts `compile` method is a generic-purpose Image Generation compile,
not a Packaging compile. The P2-frozen `preparePackagingGeneration` is
the *only* sanctioned Packaging entry. P3-A2 must expose it via a new
RPC channel (or repurpose an existing one in a way that is forbidden by
spec §43).

**Implication**: P3-A must add a new `packaging` RPC namespace, backed by
a new Shared Core integration layer that wraps
`preparePackagingGeneration` / `executePackagingGeneration`. This is a
new capability, not a reuse of an existing one.

---

### 3.4 Current Project State Authority

**Project state authority**: `packages/runtime-core/src/application/project-store.ts`
(`createProjectStore`). Exposed to UI as `window.masterpiece.projects.*`.

**Locked-Asset authority**: `packages/runtime-core/src/application/locked-assets-service.ts`
(`createLockedAssetsService`). Exposed via `window.masterpiece.creativeSession.getWorkspace`
which returns `{session, creativeDirection, styleProfile, visualCanon, runs}`. The
locked assets themselves live inside `creativeDirection` / `styleProfile` /
`visualCanon` / session records.

**P3-A1 finding**: There is exactly **one** project state authority
(`projects`) and one **creative session workspace** authority
(`creativeSession.getWorkspace`). P3-A6 ("Locked Asset readonly" exit)
must consume the existing locked-asset surface; it must not introduce a
second locked-asset store.

---

### 3.5 Asset Picker / Local Asset Resolution

**UI-side asset picker**: `window.masterpiece.referenceAnchor.chooseReferenceAssets`
and `window.masterpiece.projects.chooseFiles`.

**Native-side resolver**: `apps/web-runtime/src/node-native-operations.ts` —
reads from `process.env.MASTERPIECE_WEB_SELECTED_REFERENCES` /
`MASTERPIECE_WEB_SELECTED_FILES` and dispatches into
`referenceAnchor` / `projects` services.

**Shared Core asset resolution**: `compileImageGenerationTask` /
reference policy layer in `packages/image-generation-runtime/`. The UI
must only emit `assetId` / `role` / `source` (P3-A spec §15, §51); the
actual `fs.readFile` is done in Shared Core, not in Workspace.

**P3-A1 finding**: The asset-resolution authority is already correctly
layered. P3-A6 must not introduce a new asset resolver. The Workspace
must produce only `assetId` / `role` / `source` (P3-A spec §15) and
delegate resolution to the existing `referenceAnchor` /
`compileImageGenerationTask` chain.

---

### 3.6 Provider / Model Selector

**UI-side**: `window.masterpiece.imageGeneration.getCapabilities(apiProfileId?)`
returns `ImageProviderCapabilities`. `getPresetCapabilities()` returns
the registry's preset capabilities.

**Production authority**: `packages/image-generation-runtime/src/packaging/provider-capability.js`
(`evaluatePackagingCapability` / `resolvePackagingProviderCapability`),
called via the P2-frozen Generation Service.

**P3-A1 finding**: There is exactly **one** provider capability authority:
the Production Registry. P3-A spec §24 / §25 forbids UI from doing
`if provider == Seedream: enable Packaging`. The Workspace must call
the frozen `preparePackagingGeneration`, which internally calls
`resolvePackagingProviderCapability` (P2-E closure).

---

### 3.7 API Profile Selector

**UI-side**: `window.masterpiece.settings.*` (get, save, saveProfile, etc.).
Profiles live in `apps/web-runtime/src/node-settings-store.ts`.

**Production authority**: `adapters.readCredentials(profileId)` in
`node-runtime-host.ts` → `apps/web-runtime/src/node-credential-store.ts`.

**P3-A1 finding**: There is exactly **one** API profile authority: the
existing `settings` namespace. P3-A's `apiProfileId` field in the
Workspace intent is consumed by the existing `imageGeneration` /
`packaging` services; P3-A must not introduce a second profile store.

---

### 3.8 Generation Result Persistence

**Result storage**: `packages/runtime-core/src/application/image-generation/run-store.ts`
(`RunStoreError` + `run-store` writers). Result directory is derived by
`runRoot(runId)`.

**UI-side read**: `window.masterpiece.imageGeneration.getRun(runId)`,
`getImageDataUrl(runId, imageId)`, `openFolder(runId)`.

**Path rule** (P3-A spec §39): the Workspace must not persist absolute
paths. The current `RunStoreError` returns structured error codes, and
`openFolder` only resolves a *server-side* path; the UI never receives an
absolute path. This is already compliant.

**P3-A1 finding**: The persistence authority is already correctly
boundary-respecting. P3-A must not introduce a `localStorage` project
source-of-truth (P3-A spec §50); it must use the existing
`runRoot(runId)` pattern.

---

### 3.9 Existing State Manager

**Existing UI state managers**:

| Manager | File | Use |
|---|---|---|
| React `useState` / `useEffect` | various `.tsx` | local component state |
| `continuation/ui-state.js` | `apps/web/src/continuation/ui-state.js` | Document context continuation state |
| `reference-first/state.js` | `apps/web/src/reference-first/state.js` | Reference-first state (legacy) |

There is **no global state manager** (no Redux / Zustand / etc.) in the
Web UI. All shared state flows through the Shared Runtime via RPC.

**P3-A1 finding**: This is a deliberate architectural choice and P3-A
must respect it. P3-A's "Workspace state machine" (spec §9) is a
**pure data** state machine, persisted into the existing
`run-store` via the P2-frozen Generation Service — *not* a UI-state
manager like Redux. The UI may keep its own React `useState` mirror, but
the source of truth is always the Shared Runtime.

---

### 3.10 Existing Validation UI Patterns

**Existing validation UI**:
- `ImageGenerationWorkspace.tsx` displays `STATUS_LABELS` and
  `STATUS_TONE` from `ImageGenerationRunStatus`.
- `ShortChainGenerationWorkspace.tsx` displays
  `getCapabilities` / `getPresetCapabilities` results.
- `ProviderBadge.tsx` is a small reusable provider-status badge.

**Error mapping** (P3-A spec §35): canonical source codes are preserved
in `ImageGenerationBlockingError` and `ImageGenerationWarning` already
defined in `application-contracts.ts`. The `cleanError` helper in
`apps/web/src/utils.ts` is a thin UI-side error wrapper.

**P3-A1 finding**: There is no existing scoring validator UI (P3-C
concern). The current `STATUS_LABELS` pattern is reusable for P3-A's
"Workspace status" mirror. P3-A must not introduce a second error
mapping.

---

## 4. Intended Integration Point

After completing the audit, the only sane integration point for P3-A is:

```text
[NEW] apps/web/src/features/packaging/         ← Packaging Workspace UI (P3-B)
       ↓
[NEW] packages/runtime-core/src/operations/packaging-operations.js
       ← RPC operations (createPackagingSession, preparePackagingGeneration,
                          executePackagingGeneration, applyWorkspaceEdit,
                          resetPackagingPreparation, getPackagingReadiness)
       ↓
[NEW] packages/runtime-core/src/application/packaging/
       workspace-service.js                    ← Thin state machine
       view-model.js                           ← UI-safe projection
       stale-tracker.js                        ← Semantic edit detection
       ← (all of these are capability-oriented, NOT P3-named)
       ↓
[EXISTING] packages/image-generation-runtime/src/packaging/
       generation-service.js                   ← FROZEN P2 pipeline
       (preparePackagingGeneration / executePackagingGeneration /
        runPackagingGeneration / getPackagingGenerationServiceFingerprint /
        verifyFinalMetadata)
       ↓
[EXISTING] @masterpiece/image-generation-runtime/core/packaging-generation-core.js
       (Shared Core facade)
       ↓
[EXISTING] Shared Runtime
```

**No second runtime, no second credential stack, no second Provider
network stack, no second Reference role authority, no second precedence
engine.** P3-A only adds a thin integration layer on top of the
frozen P2 production layer.

---

## 5. Frozen Module Protection (P3-A spec §53 / §54)

P3-A **must not modify**:

```text
packages/image-generation-runtime/src/packaging/
packages/image-generation-runtime/src/core/packaging-generation-core.js
packages/image-generation-runtime/src/redact.js
packages/image-generation-runtime/src/deliverables/compile-fingerprint.js
packages/image-generation-runtime/src/policies.js
packages/image-generation-runtime/src/gates.js
packages/image-generation-runtime/src/task-builder.js
packages/image-generation-runtime/src/download-verify.js
```

P3-A **may** add new files outside these directories. Specifically:

- New: `packages/runtime-core/src/operations/packaging-operations.js`
- New: `packages/runtime-core/src/application/packaging/`
  - `workspace-service.js`
  - `view-model.js`
  - `stale-tracker.js`
  - `reference-assignments.js`
  - `lock-assets-projection.js`
- New: `apps/web/src/features/packaging/` (P3-A itself only adds the
  integration layer hooks; the actual UI is P3-B concern and is not
  produced by P3-A).
- New: `tests/image-generation/packaging-workspace-integration-contract.test.js`
  (P3-A7 deliverable; 12 test groups A-L per P3-A spec §64).

**If a real frozen-contract gap is found during P3-A2..A6**: STOP-P3-A
must be reported (P3-A spec §53). The audit confirms there is **no
foreseeable gap** that would require touching the frozen P2 production
modules. The P2-frozen `preparePackagingGeneration` / `executePackagingGeneration`
/ `verifyFinalMetadata` / `getPackagingGenerationServiceFingerprint`
surface is sufficient to satisfy every P3-A §8.x contract.

---

## 6. P3-A1 Exit Checklist (P3-A spec §57)

```text
[x] existing UI architecture mapped       (§3.1, §3.2)
[x] web runtime authority identified      (§3.3)
[x] project state authority identified    (§3.4)
[x] provider selection authority identified (§3.6)
[x] asset resolution authority identified (§3.5)
[x] persistence authority identified      (§3.8)
[x] no guessed duplicate layer            (§4)
```

All seven P3-A1 exit items satisfied by this audit. No production code
or test code is changed by this commit.

---

## 7. STOP-P3-A Conditions (P3-A spec §55) — pre-implementation

| STOP | Status (pre-P3-A2) | Note |
|---|---|---|
| STOP-P3-A-01 Workspace must deep-import Compiler | **NOT TRIGGERED** | audit shows no current deep-import; P3-A2..A6 will forbid it. |
| STOP-P3-A-02 Workspace must construct Provider Payload | **NOT TRIGGERED** | audit shows Workspace only uses RPC. |
| STOP-P3-A-03 Workspace must read credential secret | **NOT TRIGGERED** | credential access is in `node-credential-store.ts` + Shared Core. |
| STOP-P3-A-04 Workspace must modify Frozen P2 contract | **NOT TRIGGERED** | frozen module list above. |
| STOP-P3-A-05 Workspace must introduce 2nd Reference role mapping | **NOT TRIGGERED** | `evaluatePackagingCapability` is single source. |
| STOP-P3-A-06 Workspace must introduce 2nd precedence engine | **NOT TRIGGERED** | `reference-policy.js` is single source. |
| STOP-P3-A-07 Workspace execute cannot fail-closed on stale | **NOT TRIGGERED** | P3-A5 will own this. |
| STOP-P3-A-08 Workspace persistence saves absolute path / secret | **NOT TRIGGERED** | persistence uses `runRoot(runId)` server-side. |
| STOP-P3-A-09 Web UI direct Provider network call | **NOT TRIGGERED** | all calls via `/_masterpiece/rpc/`. |
| STOP-P3-A-10 P3-A causes Space regression | **NOT TRIGGERED** | no P2 / P3 freeze changes. |
| STOP-P3-A-11 P3-A causes Visual Analysis regression | **NOT TRIGGERED** | no Visual Analysis changes. |
| STOP-P3-A-12 `repo:verify` regression | **NOT TRIGGERED** | no production code change in this commit. |

12/12 NOT TRIGGERED at the end of P3-A1.

---

## 8. Reporting Cadence

Per P3-A spec §56 / §71, after each P3-A sub-step:

```text
P3-A1 (audit)            ← THIS COMMIT
P3-A2 (API)              ← next
P3-A3 (state machine)
P3-A4 (view model)
P3-A5 (stale/prepare/execute)
P3-A6 (ref / locked)
P3-A7 (architecture guards)
P3-A8 (regression)
P3-A9 (freeze report)
```

After each sub-step the agent must:
- run focused tests
- report
- STOP if contract conflict appears

After P3-A full verification:
- commit
- push
- STOP — do not enter P3-B.

---

## 9. Known Limitations After P3-A1 (alone)

P3-A1 by itself provides no user-facing capability. It is a
**pre-implementation audit** establishing the integration point.

P3-A1 does **not** yet provide:
- Workspace Application API surface (P3-A2)
- Workspace state machine (P3-A3)
- UI-safe view model (P3-A4)
- Stale / Prepare / Execute contract (P3-A5)
- Reference / Locked Asset contract (P3-A6)
- Architecture guard tests (P3-A7)
- Full regression (P3-A8)
- Freeze report (P3-A9)

P3-A1 is the *first* of nine P3-A sub-steps. The remaining eight
sub-steps will be performed in subsequent commits.

---

## 10. Recommendation: Proceed

P3-A1 recommends proceeding to **P3-A2 — Workspace Application
Contract**. The audit identified no architectural conflict between
P3-A's spec requirements and the existing production code. The
P2-frozen `preparePackagingGeneration` / `executePackagingGeneration`
surface is sufficient. No STOP-P3-A condition is triggered.

P3-A1 does **not** enter P3-A2..A9 in this commit. P3-A2..A9 will be
proposed in subsequent commits after user authorization to proceed past
P3-A1.

---
