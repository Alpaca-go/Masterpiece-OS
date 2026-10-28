# P3-A10 — Model Identity Translation Corrective Reopen and Re-Freeze

## 1. Decision

| Field | Status |
|---|---|
| P3-A | **RE-FROZEN** |
| P3-B | **HOLD — awaiting P3-B6.2 production-flow revalidation** |
| P3-C | **LOCKED** |
| Corrective production baseline | `b1716db7322f51939958ff2b1c97dc0a8b97fb9a` |
| Corrective freeze record | P3-A10 docs-only commit containing this document |
| P2 frozen baseline | `335405342951fedae5d4d6816444c2b4d2402787` |

P3-A10 repaired one translation-boundary defect. It did not perform P3-B6.2,
accept P3-B, or unlock P3-C.

## 2. Why P3-A Was Reopened

P3-B6.1 restored the Web Renderer and then exercised the real Packaging
production route. `Prepare` failed before capability resolution with:

```text
PACKAGING_WORKSPACE_PREPARE_FAILED:
PROVIDER_CAPABILITY_MISMATCH: modelId is required
```

The Workspace intent retained its historical `providerModelId` selection, but
`projectIntentToTranslationInput()` omitted the P2-required `modelId` field.
The corrective authorization covered only this loss of model identity at the
P3-A application translation boundary.

## 3. Root Cause and Authority Audit

The P2 service validates `input.modelId` before translation, then passes it to
`resolvePackagingProviderCapability()`. That authority resolves the ID through
`@masterpiece/model-registry` and returns the canonical capability record.

P2 deliberately separates that registry identity from the concrete model sent
to an external Provider. During execution, `resolveExecutionConfig()` resolves
the selected API Profile and returns a concrete `providerModelId`. The final
result and execution fingerprint preserve both identities separately.

The Workspace field name is historical. Existing P3-A intent tests and the Web
selection contract use values such as `seedream-5.0-pro` and `gpt-image-2`,
which are Masterpiece registry IDs. At the prepare boundary this value must be
projected into P2's `modelId` input. It is not copied into a second Workspace
field and is not treated as the concrete Provider payload model.

## 4. Model Identity Matrix

| Field | Owner | Meaning | Example | Consumed by |
|---|---|---|---|---|
| Workspace `intent.providerModelId` | P3-A Workspace intent | Historical user-editable model-selection field; carries the selected Masterpiece registry ID at prepare time | `seedream-5.0-pro` | P3-A translation projection and stale equality |
| P2 input `modelId` | P2 generation-service input contract | Canonical registry/capability lookup identity | `seedream-5.0-pro` | P2 validation and provider-capability authority |
| `capability.modelId` / result `registryModelId` | Model Registry and P2 capability result | Normalized Masterpiece registry identity | `seedream-5.0-pro` | compiler metadata, adapter routing, result audit |
| execution `providerModelId` | API Profile / execution-config seam | Concrete model identifier sent to the external Provider | `doubao-seedream-5-0-pro-260628` | multi-model adapter and Provider request |
| `adapterId` | Shared image-generation adapter | Adapter routing identity; not Provider vendor identity or payload model | `seedream-5.0-pro` | adapter construction and result audit |
| `provider` / persisted `providerId` | Registry capability / canonical run contract | External Provider vendor identity | `volcengine` | protocol compatibility and run registration |
| `apiProfileId` | Settings/Profile authority | Selects endpoint, protocol, credentials, and concrete Provider model | `profile-seedream` | runtime execution-config resolution |

Provider, registry model, concrete Provider model, protocol, adapter, and API
Profile remain separate concepts.

## 5. Translation Shape

Before P3-A10:

```js
{
  schemaVersion: '1.0',
  target: 'packaging',
  generationMode: intent.generationMode,
  // model identity lost here
}
```

After P3-A10:

```js
{
  schemaVersion: '1.0',
  target: 'packaging',
  modelId: intent.providerModelId,
  generationMode: intent.generationMode,
}
```

This is a deterministic compatibility projection between two existing names
for the selected registry identity. No `modelId` or `registryModelId` field was
added to the Workspace intent schema, Web payload, or RPC contract.

## 6. Prepare Evidence

Before the correction, a real Workspace service call with
`providerModelId=seedream-5.0-pro` reproducibly returned:

```json
{
  "code": "PROVIDER_CAPABILITY_MISMATCH",
  "causeMessage": "PROVIDER_CAPABILITY_MISMATCH: modelId is required"
}
```

After the correction, AF-01 passes through the P3-A projection and the real
frozen P2 capability/compiler seam. The session reaches `READY`, capability
identity is `seedream-5.0-pro`, and P2 produces its canonical
`metadata.compileFingerprint`.

## 7. Negative and Stale Cases

AF guards prove:

- missing and whitespace-only model selections still fail closed with the
  canonical `PROVIDER_CAPABILITY_MISMATCH: modelId is required`;
- an unsupported model continues to be rejected by the P2 capability
  authority as unregistered;
- `apiProfileId` remains an execution-only selector and is not duplicated into
  the P2 translation input;
- changing `providerModelId` after `READY` still produces `STALE` with
  `intent_changed`;
- execute from `STALE` remains fail-closed and never calls P2 execute.

## 8. Fingerprint and Other Authorities

- P2 `metadata.compileFingerprint` remains the only generation fingerprint
  authority.
- Workspace adds no hash, registry, model enum, Provider capability table, or
  execution identity.
- Reference roles and precedence remain owned by frozen P2.
- Locked Assets remain owned by the upstream Locked Assets service.
- Credentials and API Profiles remain owned by their existing stores.
- Artifact persistence and canonical run registration are unchanged.

## 9. Changed Frozen Surface

Exactly one P3-A production file changed:

```text
packages/runtime-core/src/application/packaging/workspace-service.js
```

The production delta is one `modelId` projection plus its explanatory comment.
State-machine, stale tracker, intent schema, reference assignment, Locked Asset,
view-model, and public-barrel production files are unchanged.

P2 protected-surface diff from
`335405342951fedae5d4d6816444c2b4d2402787`: **0 files**.

## 10. Corrective Guards

New AF — Model Identity Translation guards: **14/14 PASS**.

They cover the P3-A-to-P2 mapping, real P2 prepare/capability seam, semantic
truthfulness, absence of Web/RPC duplication, absence of a second registry or
fingerprint, stale behavior, missing/blank/unsupported models, API Profile
separation, and P2 frozen integrity.

Historical P3-B freeze guards were bounded to their actual accepted endpoint
commits. They still prove that P3-B4, P3-B5.3, P3-B5.3.1, P3-B5.3.2, P3-B6,
and P3-B6.1 did not modify the then-frozen P3-A surface; they no longer
incorrectly prohibit an explicitly authorized later corrective reopen.

## 11. Regression Evidence

### P3-A acceptance surface

| Phase | Result |
|---|---|
| A2 application contract | 40/40 PASS |
| A3 state machine | 120/120 PASS |
| A4 view model | 81/81 PASS |
| A5/A5.1 stale/prepare/execute | 86/86 PASS |
| A6 reference/Locked Assets | 75/75 PASS |
| A7 architecture A–L plus authority guards | 71/71 PASS |
| AF model identity corrective | 14/14 PASS |

### P3-B guards

| Group | Result |
|---|---|
| W | 10/10 PASS |
| T | 3/3 PASS |
| X | 20/20 PASS |
| Y | 20/20 PASS |
| Z | 42/42 PASS (41 canonical cases plus retained legacy-labelled Z-40) |
| AA | 15/15 PASS |
| AB | 10/10 PASS |
| AC | 10/10 PASS |
| AD | 18/18 PASS |
| AE | 11/11 PASS |
| AF | 14/14 PASS |

### Repository regression

| Command/surface | Result |
|---|---|
| `npm test` | 1224/1224 PASS |
| `npm run runtime-application:test` | 1102/1102 PASS |
| `npm run runtime:test` | PASS |
| `npm run test:image-generation` | 972/972 PASS |
| `npm run cli:test` | 40/40 PASS |
| `npm run web:typecheck` | PASS |
| `npm run web:build` | PASS |
| `npm run web-runtime:typecheck` | PASS |
| `npm run web-runtime:test` | 4/4 PASS |
| `npm run web:smoke` | PASS; 0 Provider calls; 0 business writes |
| `npm run repo:verify` | PASS |
| `npm run verify:space-compiler-baseline` | PASS |
| `npm run verify:space-r8.6-golden-boundary` | PASS |

`repo:verify` includes and passed version consistency/naming, workspace and
production boundaries, obsolete-code, tracked-runtime-assets,
project-specific-rule, Golden boundary, current flows, A4, and repository
guard checks. `verify:current-flows` passed the current Visual Analysis/shared
runtime paths with zero external Provider calls.

## 12. Canonical STOP-P3-A Matrix

| Condition | Result |
|---|---|
| STOP-P3-A-01 Workspace deep-imports Compiler | NOT TRIGGERED |
| STOP-P3-A-02 Workspace constructs Provider payload | NOT TRIGGERED |
| STOP-P3-A-03 Workspace reads credentials | NOT TRIGGERED |
| STOP-P3-A-04 correction requires modifying P2 | NOT TRIGGERED |
| STOP-P3-A-05 second Reference role authority | NOT TRIGGERED |
| STOP-P3-A-06 second precedence engine | NOT TRIGGERED |
| STOP-P3-A-07 stale execution is not fail-closed | NOT TRIGGERED |
| STOP-P3-A-08 unsafe persistence or secret leakage | NOT TRIGGERED |
| STOP-P3-A-09 Web calls Provider directly | NOT TRIGGERED |
| STOP-P3-A-10 Space regression | NOT TRIGGERED |
| STOP-P3-A-11 Visual Analysis regression | NOT TRIGGERED |
| STOP-P3-A-12 repository verification regression | NOT TRIGGERED |

**12/12 NOT TRIGGERED.**

## 13. Baseline History

| Record | Commit | Meaning |
|---|---|---|
| Original P3-A Production Baseline | `dd4570a` | Original frozen P3-A production surface |
| Original P3-A Freeze Record | `71490c7` | Historical P3-A9 docs-only freeze declaration |
| P3-A Corrective Production Baseline | `b1716db7322f51939958ff2b1c97dc0a8b97fb9a` | Model identity translation correction plus corrective guards |
| P3-A Corrective Freeze / Acceptance Record | P3-A10 docs-only commit containing this document | Current re-freeze declaration |

The original baseline is retained as history. The current P3-A production
baseline is the P3-A10 corrective production commit, not `dd4570a`.

## 14. Next Step

The only unlocked next step is:

```text
P3-B6.2 — Production Flow Revalidation & Final Acceptance
```

P3-B6.2 was not started by P3-A10. P3-C remains locked.
