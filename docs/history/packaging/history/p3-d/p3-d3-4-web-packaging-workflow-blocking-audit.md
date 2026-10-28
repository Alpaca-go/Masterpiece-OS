# P3-D3.4 — Web Packaging Workflow Blocking Audit

**Date:** 2026-08-15
**Branch:** `codex/visual-analysis-a1-multi-provider`
**Start HEAD:** `1cd9f386f2fb95fbf04238483a1b12683522039d` (resolved via `git rev-parse HEAD`)
**Phase Class:** AUDIT ONLY / OFFLINE ONLY
**External Provider HTTP calls:** 0
**Production source changes:** 0
**Test source changes:** 0
**Golden:** unchanged

---

## A. Real User Reproduction (two blockers)

**Blocker A — Standard / analysis-led packaging generation:**
`PROMPT_PREFLIGHT_BLOCKED: PACKAGING_PRODUCT_ROLE_MISSING, UNSUPPORTED_PRODUCT_INVENTION, LOCKED_ASSET_OMITTED`. UI shows "这是可自动恢复的提示：直接点击【生成】即可", but generation cannot proceed after (1) direct generate, (2) restore template default + generate, (3) re-enter page + generate.

**Blocker B — Reference-First upload:**
After switching to Reference-First, clicking "上传参考图" produces no response: no file picker, no upload state, no error, no Reference assignment.

---

## B. Blocker A — Prompt Preflight Auto-Recovery (PA trace)

| Boundary | Owner | File / Function | Input | Output | Verdict |
|---|---|---|---|---|---|
| PA-01 current task state | Web UI | ShortChainGenerationWorkspace.tsx `compiled` / `taskContract` | session | compiled prompt + task | GOOD |
| PA-02 editable prompt | Web UI | `setEditedPrompt(result.compiledPrompt.editablePrompt)` | compiled | editedPrompt state | GOOD |
| PA-03 generate button | Web UI | `generate()` → `startValidatedShortChain({ taskId, editedPrompt })` | taskId + editedPrompt | RPC call | GOOD |
| PA-04 preflight invocation | Runtime | short-chain-service.ts `start()` line 444-526 | cached compilation | preflight report | GOOD |
| PA-05 preflight result | P2 gate | `gates/prompt-preflight-gate.js` `runPromptPreflightGate` | finalPrompt + packagingTranslation | blocked | **BROKEN (data gap)** |
| PA-06 recoverable classification | Web UI | `utils.ts` `errorIsAutoRecoverable` (AUTO_RECOVERABLE_CODES) | error code | "可自动恢复" hint | **BROKEN (false claim)** |
| PA-07 auto-recovery | Runtime | short-chain-service.ts line 453-515 auto-recompile | same task contract + same visualDecisionPacket | recompiled prompt | GOOD (exists) but insufficient |
| PA-08 repaired prompt | Runtime | prompt-compiler.js `buildPackagingTranslation` + normalize | visualDecisionPacket.mediaTranslations.packaging | productRoleEvidenceRefs: [] | **BROKEN (no producer)** |
| PA-09 second preflight | Runtime | line 516-526 | recompiled preflight | still blocked | **BROKEN (unchanged input)** |
| PA-10 execute input | Runtime | never reached | — | — | DOWNSTREAM CONSEQUENCE |

### Product Role Check (PACKAGING_PRODUCT_ROLE_MISSING)

- Validator: `prompt-preflight-gate.js:184` — requires `packagingTranslation.productRoleEvidenceRefs` non-empty.
- Field source: `packagingTranslation` produced by `prompt-compiler.js:449` → `creative-production-runtime/packaging-translation.js:114` (`productRoleEvidenceRefs: list(source.productRoleEvidenceRefs)`), whose `source` = `visualDecisionPacket.mediaTranslations.packaging`.
- **Root gap**: `packaging-translation-contract.ts` `normalizePackagingTranslationV2` (the canonical normalizer used by BOTH producers — `visual-decision-packet.ts:179` analysis-led and `reference-packaging-authority.ts:54` reference-first) **does not emit `productRoleEvidenceRefs` at all** (return object lines 77-99). The field is not in `missingRequiredFields` either (line 68 checks only `productAndCategoryRole`).
- Therefore `buildPackagingTranslation` always yields `productRoleEvidenceRefs: []` → the gate always blocks packaging preflight, regardless of how complete the project truth is.
- **Synthetic reproduction (real production functions, offline):** full valid packaging translation → normalize → build → `productRoleEvidenceRefs: []` → preflight `blocked` with `PACKAGING_PRODUCT_ROLE_MISSING:block, UNSUPPORTED_PRODUCT_INVENTION:block`. **Exact match to the user's error.**

### Unsupported Product Invention Check (UNSUPPORTED_PRODUCT_INVENTION)

- `prompt-preflight-gate.js:191-201`: fires when `productRoleEvidenceRefs` empty AND (`productAndCategoryRole` non-empty OR `taskContract.currentInstruction` matches 瓶/罐/管/精华/serum/bottle/jar/tube/ampoule…).
- It is a **downstream consequence** of the product-role evidence gap: any packaging task with a product/category role or a container-mentioning instruction triggers it. Safe evidence: claim category = "unconfirmed product/container invention"; source section = gate lines 191-201; authority lookup = `productRoleEvidenceRefs` (absent by construction).

### Locked Asset Omission Check (LOCKED_ASSET_OMITTED)

- `prompt-preflight-gate.js:217-224`: `projectContract.mustPreserve[].value` not present in finalPrompt → `add('LOCKED_ASSET_OMITTED', 'warn', value)`.
- **Severity is `warn`, NOT `block`** — it does not cause `status='blocked'`. It appears in the user's error banner only because `PROMPT_PREFLIGHT_BLOCKED` message concatenates ALL findings codes (line 236 `findings.map(code).join(', ')`).
- The actual blockers are the two `block` findings above. LOCKED_ASSET_OMITTED is cosmetic in this banner.

### Recoverability Contract

- `utils.ts:41-46` marks `PROMPT_PREFLIGHT_BLOCKED` as auto-recoverable and shows "直接点击「生成」即可".
- The only real recovery is `short-chain-service.ts:453-515` auto-recompile, which re-compiles with **the same task contract + same visualDecisionPacket** — it can fix fingerprint staleness and tightened-rule regressions, but **cannot fill a field no producer emits** (`productRoleEvidenceRefs`).
- Classification: **A. UI FALSE RECOVERABILITY CLAIM** (hint text over-promises) + **F. UPSTREAM PACKAGING TRUTH GAP** (`productRoleEvidenceRefs` has no producer) + **D. RECOVERY CONTRACT INSUFFICIENT** (recompile cannot repair the data gap).

### Prompt State Ownership

- UI shows `editedPrompt` (editable textarea); preflight reads `compiledPrompt.finalPrompt` + `compiledPrompt.packagingTranslation` (compile-time artifacts); execute would use `editedPrompt || finalPrompt`.
- "恢复模板默认" only updates the textarea (`setEditedPrompt`); preflight never reads the textarea — so restoring the template cannot affect the blocked preflight. **No stale-closure / cache defect found**; the block is upstream data, not prompt staleness.

---

## C. Blocker B — Reference Upload (RBW trace)

| Boundary | Owner | File / Function | Input | Output | Verdict |
|---|---|---|---|---|---|
| RBW-01 Reference-First selected | Web UI | `changeBasis('reference')` | click | generationBasis=reference | GOOD |
| RBW-02 upload button render | Web UI | ShortChainGenerationWorkspace.tsx line 825-829 | — | button | GOOD |
| RBW-03 onClick | Web UI | `uploadReferenceImage()` | click | RPC | GOOD |
| RBW-04 chooseFiles | Node host | `node-native-operations.ts:39` `projects:choose-files` → `configuredPaths('MASTERPIECE_WEB_SELECTED_FILES')` | env | **`[]` when env unset** | **BROKEN** |
| RBW-05 file picker | — | (none — no native dialog exists in Node Web Host) | — | — | DOWNSTREAM CONSEQUENCE |
| RBW-06..RBW-12 | — | not reached (`if (!chosen.length) return` at line 545) | — | — | DOWNSTREAM CONSEQUENCE |

### Root cause (RBW)

- `projects:choose-files` (`node-native-operations.ts:39`) does NOT open a file picker. It reads `process.env.MASTERPIECE_WEB_SELECTED_FILES` (JSON array or path-delimited list) and returns it. With the env unset (current state: NOT SET), it returns `[]`.
- `uploadReferenceImage` (`ShortChainGenerationWorkspace.tsx:542-593`) then hits `if (!chosen || chosen.length === 0) return;` — **silent early return**: no file picker, no upload state, no error, no reference assignment. Exactly the user's report.
- The same pattern exists in `App.tsx:247-256` `importMore` and `ProjectWizard.tsx` — the env-injection design is the architecture for file selection in the Node Web Host (no native dialog). Without the env (or a host shim that sets it), every choose-files path silently no-ops.
- Classification: **B. FILE INPUT REF BINDING DEFECT** (the button's contract is "open picker"; the RPC returns empty from env with no user feedback) — more precisely a **SILENT UI GATE DEFECT** (button appears clickable; handler silently returns).

---

## D. Last Known Good / First Broken Boundary

```
PROMPT PREFLIGHT:
  LAST KNOWN GOOD:  PA-04 (preflight invoked with correct compile artifacts)
  FIRST BROKEN:     PA-08 (packagingTranslation has no productRoleEvidenceRefs producer;
                          normalizePackagingTranslationV2 drops the field)
  Root cause:       upstream packaging truth gap — no producer emits productRoleEvidenceRefs;
                    gate requires it → structural block; auto-recompile cannot repair;
                    UI "可自动恢复" hint over-promises.

REFERENCE UPLOAD:
  LAST KNOWN GOOD:  RBW-03 (button onClick wired to uploadReferenceImage)
  FIRST BROKEN:     RBW-04 (choose-files RPC returns [] from unset env; handler silently returns)
  Root cause:       Node Web Host file selection is env-injection based
                    (MASTERPIECE_WEB_SELECTED_FILES); unset env → empty array → silent no-op.
```

---

## E. Corrective Owners (separate, NOT merged)

- **Owner A** (prompt preflight): the packaging translation producer chain — `packages/runtime-core/src/application/packaging-translation-contract.ts` (`normalizePackagingTranslationV2`) must either emit `productRoleEvidenceRefs` (from its input or from evidence-bearing structure/product facts), or the preflight gate must be reconciled with the actual contract surface. Secondary: `apps/web/src/utils.ts` recoverability hint must not claim auto-recovery for data-gap blockers.
- **Owner B** (reference upload): `apps/web-runtime/src/node-native-operations.ts` (`projects:choose-files`) + `apps/web/src/components/ShortChainGenerationWorkspace.tsx` (`uploadReferenceImage`) — the UI must surface an actionable message when `chooseFiles` returns empty (env not configured / no picker available), instead of silent return.

Both are separate narrow correctives; a single commit is NOT assumed.

---

## F. Production / Test / Provider / Golden

```
Production source changes:  0
Test source changes:        0
External Provider HTTP:     0
Image generation:           0
Golden auto-update:         NO
Golden changed:             NO
```

## G. Secret Audit

- No credential content read, printed, or recorded.
- Only env presence booleans used (MASTERPIECE_WEB_SELECTED_FILES: NOT SET).

## H. Historical / Frozen Preservation

- P2 current freeze, P3-A12, P3-B accepted history, P3-C re-freeze, P3-D3 credential history, D3.1, D3.2, D3.3, Seedream canary PASS — all preserved, none rewritten.
- If a P3-B Web defect is confirmed in a later corrective, it is recorded as POST-ACCEPTANCE CORRECTIVE REOPEN, not a rewrite of the accepted P3-B history.

## I. Working Tree / Local / Remote

- Working tree: EMPTY (after this doc commit).
- Local == Remote: MATCH (post-push).

---

## J. Final Decision

```
P3-D3.4 AUDIT:               PASS
STANDARD WORKFLOW:           BLOCKER IDENTIFIED (upstream packaging truth gap
                             + UI false recoverability claim)
REFERENCE-FIRST UPLOAD:      BLOCKER IDENTIFIED (choose-files env-injection
                             silent no-op)
P3-D3:                       HOLD — WEB WORKFLOW CORRECTIVE REQUIRED
P3-D4:                       LOCKED
P3-E:                        LOCKED
```

## K. Recommended Narrow Correctives (next phase, separate authorization)

1. **Corrective A** — reconcile `productRoleEvidenceRefs` between the packaging translation normalizer and the preflight gate (producer emits it, or gate reads the actual contract surface). Also correct the `utils.ts` recoverability hint.
2. **Corrective B** — make `projects:choose-files` / `uploadReferenceImage` surface a clear message when no file selection source is configured, instead of silent return (or wire a real picker path).
