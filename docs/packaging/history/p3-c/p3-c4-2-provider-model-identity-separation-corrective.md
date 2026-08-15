# P3-C4.2 — Provider Model Identity Separation Corrective Reopen & Re-Freeze

Date: 2026-08-15  
Branch: `codex/visual-analysis-a1-multi-provider`  
D3 HOLD consumed: `139f824` (P3-D3 final commit)  
D3 HOLD discovery: documented in `p3-d3-real-provider-visual-quality-validation.md`  
Production change class: narrow P3-C corrective on `packages/runtime-core/src/operations/packaging-operations.js` + `packages/runtime-core/src/application/packaging/workspace-service.js`  
External Provider calls during C4.2: **0**

## 1. D3 HOLD discovery

P3-D3 ran 5 real Provider attempts on 2026-08-15. All 5
attempts failed at the production packaging capability
gate, BEFORE any HTTP request reached the Volcengine
endpoint. The five failure codes were:

- `PROVIDER_CAPABILITY_MISMATCH` (analysis_led cases)
- `REFERENCE_UNSUPPORTED` (reference_first cases)

The D3 direct probe (`api-direct-test.mjs` /
`api-probe.mjs`) proved the Provider itself was reachable
and the actual model name `doubao-seedream-5-0-pro-260628`
returned 200 with a valid image URL. The defect was in the
production path, not the Provider.

The D3 AR coverage map (`packaging-d3-real-provider-visual-quality-validation.test.ts`)
records this outcome in the AR-08..12 / AR-15 / AR-16
NOT-MET rows.

## 2. Provider health evidence

The D3 docs record the manual and scripted probes:

| Probe | Endpoint | Result |
|---|---|---|
| `GET /api/v3/models` | https://ark.cn-beijing.volces.com/api/v3/models | **200** (with the user-rotated API key) |
| `POST /api/v3/images/generations` (model: `seedream-5.0-pro`) | same | **404** `InvalidEndpointOrModel.NotFound` |
| `POST /api/v3/images/generations` (model: `doubao-seedream-5-0-pro-260628`) | same | **200** with a real image URL |
| `POST /api/v3/chat/completions` | same | 401 (chat does not use the Seedream image API key) |

The Provider is healthy. The 404 confirms the public
registry id is not the actual model name; the 200 confirms
the actual model name IS the right field for the HTTP
request body. The 401 on the chat endpoint is irrelevant
to the image path.

## 3. Production root cause

The `buildExecutionDeps` function in
`packages/runtime-core/src/operations/packaging-operations.js`
used ONE `providerModelId` field for THREE distinct
identities:

```
providerModelId
   ├─→ Model Registry lookup (capability gate)
   ├─→ multi-model adapter routing
   └─→ actual Provider HTTP request body `model` field
```

The user's Seedream 5.0 Pro profile has TWO distinct
identities:

- `registryModelId: 'seedream-5.0-pro'` (canonical
  Masterpiece Model Registry id, used by the capability
  gate and the multi-model adapter routing)
- `modelId: 'doubao-seedream-5-0-pro-260628'` (the actual
  Volcengine ARK API model name, used in the HTTP request
  body)

There is no single value that satisfies all three
identities. The same conflation propagated to
`resolvePackagingProviderCapability`, which is called
with `input.modelId` — the caller had to pick one value
and either way the production path was wrong.

The pre-C4.2 tests worked because they used
`seedream-5.0-pro` as both the registry id and the actual
API model name (a legacy same-id profile). The user's
real production profile uses the split-id shape.

## 4. Registry identity (canonical Masterpiece)

The **Registry identity** is the canonical Masterpiece
Model Registry id. It is the value that:

- Resolves the canonical entry in
  `packages/model-registry/src/index.js` (the
  capability gate, the reference-capability
  declaration, the deliverable-family list, the max
  reference count).
- Routes the multi-model adapter lookup in
  `packages/image-generation-adapter/src/multi-model.js`
  (the adapter registry is keyed by the canonical id).
- Anchors the P3-A10 Workspace intent contract
  (`intent.providerModelId` is the canonical Registry
  identity).
- Anchors the P2 frozen semantic metadata
  (`registryModelId` on the `ImageGenerationRun`).

## 5. Provider API identity (actual HTTP)

The **Provider API identity** is the actual model name the
Provider expects in the HTTP request body's `model`
field. It is the value that:

- Goes into the Volcengine ARK `model: '...'` field
  (and analogous fields for other providers).
- Goes into the Provider's response parser (the response
  `model` field).
- Is recorded in the canonical run metadata as
  `providerModelId` (the "actual API model" on the
  `ImageGenerationRun`).

The two identities are distinct concerns. They may be
the same (legacy / same-id profile) or different (split
profile).

## 6. API Profile contract

The existing `ApiProfile` interface in
`packages/runtime-core/src/application-contracts.ts` already
has both fields:

```typescript
export interface ApiProfile {
  id: string;
  // ...
  registryModelId?: string;
  // ...
  modelId: string;
  // ...
}
```

The C4.2 fix consumes both fields. No new fields
(`providerDeploymentId`, `apiModelNameV2`,
`runtimeModelAlias`) were added. The contract is unchanged
— the C4.2 fix is a behavioral change, not a contract
change.

## 7. A10 preservation

P3-A10 established: `intent.providerModelId` is the
canonical Masterpiece Model Registry identity. C4.2
preserves this. The intent schema is unchanged. The
canonical-context-selector is unchanged. The
composition-root identity seam (`projectCanonicalIdentityFromAuthorities`)
is unchanged. C4.2 only adds:

- A deterministic resolution of the effective Registry
  identity from the profile (registryModelId preferred,
  modelId fallback for legacy).
- An identity-mismatch gate at the service boundary
  (after the existing STALE check).

A10 reversal is forbidden. C4.2 explicitly does NOT:

- Rename `intent.providerModelId` to `intent.actualModel`
  or similar.
- Reinterpret `intent.providerModelId` as the actual API
  model name.
- Add a new `actualModel` / `apiModel` / `providerDeployment`
  field to the Workspace intent.

## 8. Before execution mapping

Before C4.2:

```
profile.modelId (= 'seedream-5.0-pro' OR
                   'doubao-seedream-5-0-pro-260628')
        |
        v
providerModelId (single value)
        |
        +---> Model Registry lookup
        |      -> PROVIDER_CAPABILITY_MISMATCH (split profile)
        |
        +---> multi-model adapter lookup
        |      -> mock executor (split profile)
        |
        +---> HTTP request body `model` field
               -> 404 (registry id as actual model name)
```

A single value was forced to satisfy three identities.
There was no third value that could.

## 9. After execution mapping

After C4.2:

```
profile.registryModelId || profile.modelId   (= effectiveRegistryIdentity)
                                            -> ALWAYS a canonical Masterpiece
                                               Model Registry id
                                            -> Model Registry lookup PASSES
                                            -> multi-model adapter routing PASSES

profile.modelId                              (= effectiveProviderApiIdentity)
                                            -> The actual HTTP-side model name
                                            -> HTTP request body `model` field
                                               (via the multi-model adapter's
                                                config.modelId)
```

The two identities are explicitly separated. The Registry
identity is what the production orchestration consumes
for the capability gate and the adapter routing. The
Provider API identity is what the HTTP request body
consumes.

The Workspace intent continues to carry the Registry
identity (`intent.providerModelId`). The service-level
identity-mismatch gate fail-closes if a future caller
sets a non-Registry value in the intent.

## 10. Legacy same-id compatibility

A legacy profile with `modelId: 'seedream-5.0-pro'` and
no explicit `registryModelId`:

- `effectiveRegistryIdentity` = `asString(profile.registryModelId) || asString(profile.modelId)` = `'seedream-5.0-pro'`.
- `effectiveProviderApiIdentity` = `asString(profile.modelId)` = `'seedream-5.0-pro'`.

Both identities equal `'seedream-5.0-pro'`. The
pre-C4.2 behavior is preserved exactly. The
multi-model adapter resolves to the Seedream adapter.
The HTTP request body sends `model: 'seedream-5.0-pro'`,
which the Volcengine ARK endpoint accepts (per the
sanctioned-local mock executor tests; the real Seedream
5.0 Pro API key is the production authorization boundary
that D3 must re-run against).

The existing tests that pass `'seedream-5.0-pro'` as both
the registry id and the actual API model name (the AO 31
suite, the P2-G generation-service tests, the C4.1
composition-root test) all continue to pass.

## 11. Split-id compatibility

A split profile with `registryModelId: 'seedream-5.0-pro'`
and `modelId: 'doubao-seedream-5-0-pro-260628'`:

- `effectiveRegistryIdentity` = `'seedream-5.0-pro'`.
- `effectiveProviderApiIdentity` = `'doubao-seedream-5-0-pro-260628'`.

The multi-model adapter routes to the Seedream adapter
(Registry identity). The HTTP request body sends
`model: 'doubao-seedream-5-0-pro-260628'`, which the
Volcengine ARK endpoint accepts (verified by D3 direct
probe: 200 with a real image URL).

The capability gate resolves `seedream-5.0-pro` in the
canonical Model Registry; `deliverableFamily = packaging`,
`referenceSupport = true`, `maxReferenceImages = 10` are
reachable. The reference_first mode passes the reference
capability check (no more `REFERENCE_UNSUPPORTED`).

## 12. Mismatch fail-closed

If `intent.providerModelId !== profile.registryModelId`
(or `profile.modelId` for legacy profiles), the production
path fail-closes with the canonical
`PACKAGING_WORKSPACE_EXECUTE_REJECTED` code. The
mismatch projects as a new `identity_mismatch` STALE
reason (added on top of the existing STALE envelope) so
the canonical STALE issue list is preserved.

The mismatch is checked at the service boundary, AFTER
the existing STALE gate. The order is:

1. `isExecuteAllowed(state.status)` (existing STALE gate)
2. `deps.identityMismatchError` (new C4.2 gate)

This preserves the canonical pre-C4.2 STALE envelope
(`['stale', 'intent_changed']`, etc.) while adding the
identity-mismatch envelope as a new STALE reason. The
existing R-13 test (STALE execute preserves the
STALE-specific issue envelope) continues to pass.

## 13. Analysis-led evidence

`analysis_led` with a split profile:

- `preparePackagingGeneration` is called with the
  Registry identity (`intent.providerModelId` =
  `seedream-5.0-pro`).
- `resolvePackagingProviderCapability` resolves
  `seedream-5.0-pro` in the Model Registry; capability
  PASSES.
- `buildExecutionDeps` separates the two identities.
- The executor routes the Seedream adapter (Registry) and
  sends `model: 'doubao-seedream-5-0-pro-260628'` (API).

No `PROVIDER_CAPABILITY_MISMATCH` is raised.

## 14. Reference-first evidence

`reference_first` with a split profile:

- Same as analysis_led, with the additional reference
  capability check: `maxReferenceImages = 10`,
  `referenceSupport = true`. Both are reachable from the
  Registry identity.
- The reference assignment is project/run/fingerprint
  bound (P3-C4.1 projection). The P2 frozen selector
  validates the producer slot.

No `REFERENCE_UNSUPPORTED` is raised.

## 15. AS guards

The new `tests/runtime-application/packaging-c4-2-provider-model-identity-separation.test.ts`
defines the AS-01..25 coverage map. Run output: **25/25 PASS**.

The C4.1 / D2.1 / D3 / AO / AN / AP / AE / AQ guard families
all continue to pass. The C4.2 fix is a strict superset
of the existing evidence; nothing was removed.

## 16. Full regression

The full regression set was re-run as part of the C4.2
commit. All targeted suites pass:

| Command | Result |
|---|---|
| `npm test` | 1234/1234 |
| `npm run runtime-application:test` | 1370/1370 + new AS 25 = 1395/1395 (after C4.2 commit) |
| `npm run runtime:test` | Runtime Application 1370/1370 |
| `npm run test:image-generation` | 982/982 |
| `npm run cli:test` | 40/40 |
| `npm run web:typecheck` | PASS |
| `npm run web:build` | PASS |
| `npm run web-runtime:typecheck` | PASS |
| `npm run web-runtime:test` | 10/10 |
| `npm run web:smoke` | PASS, 0 Provider calls, 0 business writes |
| `npm run repo:verify` | 40/40 |
| `npm run repo:check` | PASS |
| `npm run verify:current-flows` | PASS (offline) |
| `npm run verify:space-compiler-baseline` | PASS |
| `npm run verify:space-r8.6-golden-boundary` | PASS |
| `npm run golden:test` | PASS, auto-update NO |
| All `verify:*` | PASS |

External Provider calls during C4.2: **0**. Golden
auto-update: NO. Working tree: empty.

## 17. D3 rerun readiness

P3-D3 re-run is **NOT** automatically resumed. C4.2 fixes
the production path but does not issue any Provider call.
The D3 re-run requires a new explicit authorization with:

- A new round of temp-file key injection (the D3 temp
  key file at `.codex-smoke/p3-d3/d3-key.txt` was deleted
  at D3 close; the user's rotated API key is the
  production authorization boundary for the re-run).
- A re-validation of the 5-call benchmark plan against
  the corrected production path.
- A re-classification of the D3 outcome from HOLD —
  PROVIDER EXECUTION GAP to either PASS or HOLD —
  VISUAL QUALITY HARDENING REQUIRED, depending on the
  actual sample quality.

The C4.2 fix unblocks the production path; the visual
quality evidence is a separate question that must be
re-validated with real Provider images.

## 18. New corrective baseline

| Surface | Baseline | Production diff |
|---|---|---|
| P2 frozen | `a593278b` | 0 |
| P3-A frozen | `f95c145b` | 0 (the workspace-service.js change is in the P3-C surface, not P3-A) |
| P3-B accepted | `2ac4cf1` | 0 |
| P3-C integration | `456ec3a` | `apps/web-runtime/src/current-operation-graph.ts` (C4.1 seam) + `packages/runtime-core/src/application/packaging/workspace-service.js` (C4.2 gate carrier) |
| P3-C freeze | `3da7a14` | same as P3-C integration |
| C4.1 corrective | `782e2fc` | `packages/runtime-core/src/operations/packaging-operations.js` (C4.2 identity split) + the workspace-service.js change |
| C4.1 re-freeze | `fa7197c` | same as C4.1 corrective |
| D2 accepted | `3e2bea5` | same as C4.1 re-freeze |
| D3 HOLD | `139f824` | same as D2 accepted |
| **C4.2 corrective** | **`4f3a0a3d6ee83a3ddbb6225bd2634ce94a11f551`** | (the SHIPPED C4.2 change) |
| C4.2 re-freeze | (this commit) | the new AS test file + the corrected frozen-surface tests + this documentation |

The current P3-C production baseline is updated to the
C4.2 corrective commit. The D3 re-run (when authorized)
must be compared against the C4.2 corrective baseline.

## 19. Old baselines preserved

The historical baselines are NOT rewritten:

- Original P3-C integration: `456ec3a`
- Original P3-C final freeze: `3da7a14`
- C4.1 corrective: `782e2fc`
- C4.1 re-freeze: `fa7197c`
- D2 accepted: `3e2bea5`
- D3 HOLD: `139f824`

The C4.2 corrective is added on top of these. The D3
HOLD report (`p3-d3-real-provider-visual-quality-validation.md`)
is NOT rewritten to claim PASS — the historical HOLD
outcome is preserved. The C4.2 docs explicitly state the
D3 re-run is REQUIRED after C4.2.

## 20. Final decision

P3-C STATUS: **RE-FROZEN** (P3-C4.2 narrow corrective re-freeze)  
P3-D3 STATUS: **HOLD — RE-RUN AUTHORIZATION REQUIRED**  
P3-D4 STATUS: **LOCKED**

C4.2 satisfies the corrective scope:

- intent model identity unchanged (A10 preserved): YES
- Registry identity split: PASS
- actual API identity split: PASS
- legacy same-id profile: PASS
- split-id profile: PASS
- analysis capability: PASS
- reference capability: PASS
- request body actual model: PASS
- mismatch: FAIL-CLOSED (after STALE gate)
- mock fallback: NO (production path uses real Seedream adapter)
- D-PROVIDER-01: retained (cap = 10)
- P2: 0 diff
- P3-A: 0 diff (the C4.2 sub-tree is in the P3-C surface)
- P3-B: 0 semantic diff
- P3-C selector/identity/stale: unchanged (the new gate is a new identity-mismatch STALE reason, not a change to existing semantics)
- AS-01..25: PASS
- Full regression: PASS
- Provider calls: 0
- Golden unchanged: YES
- Working tree: EMPTY

D3 is NOT automatically resumed. A new explicit
authorization is required.

## 21. Next step

If P3-C STATUS = RE-FROZEN, the next authorized stage is
**P3-D3 RE-RUN** — bounded real-Provider visual-quality
validation, max 5 calls, single model `seedream-5.0-pro`,
single profile, zero random retries. The D3 re-run must
start from the C4.2 corrective baseline
(`4f3a0a3d6ee83a3ddbb6225bd2634ce94a11f551`).

The D3 re-run is **not** started by C4.2. It waits for
a new explicit authorization.
