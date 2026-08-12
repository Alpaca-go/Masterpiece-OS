# A4 Freeze Manifest

**Phase:** Visual Analysis A4 — Production Freeze & Operational Baseline
**Date:** 2026-08-12
**Status:** `A4_FREEZE_MANIFEST_FROZEN`
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A4-Production-Freeze-Operational-Baseline.md` §13
**Predecessor:** A4-1 production contract freeze (`f6955fc`)
                A4-2 operational failure matrix (`2cea903`)
                A4-3 production baseline (this batch C4)
                A4-4 anti-regression guards (`5682ba5`)
                A3 `VISUAL_ANALYSIS_A3_PASS` (`2514784`)

## 1. Required fields (per A4 spec §13)

| Field | Value |
|---|---|
| **Final Commit** | _this commit_ on branch `codex/visual-analysis-a1-multi-provider` |
| **Production Default Provider** | volcengine |
| **Production Default Model** | doubao-seed-2.1-turbo (canonical id; API alias doubao-seed-2-1-turbo-260628 per A2 spec §107) |
| **Alternative/Fallback Provider** | qwen |
| **Alternative/Fallback Model** | qwen3.6-plus |
| **Provider Registry Authority** | `packages/model-runtime/src/analysis-provider-registry.js` (`createDefaultAnalysisProviderRegistry`; A2-H §9) |
| **Default Policy Authority** | `packages/runtime-core/src/application/provider-policy.js` (`getCurrentProviderPolicy()`; A3-A) |
| **Fallback Policy Authority** | `packages/runtime-core/src/application/provider-policy.js` (`isFallbackEligible` + `classifyFallbackReason`; A3-B / A3-fallback-policy.md) |
| **Canonical Analysis Contract Authority** | `packages/model-runtime/src/analysis-provider.js` (`assertCanonicalAnalysisResult`; A2-H §9 + A3-C additive `provenance`) |
| **Prompt Authority** | `apps/cli/prompts/analysis/` + `apps/cli/src/analysis-engine/creative-director/prompt-builder.js`; SHA-256 digests frozen at A2-final-freeze §6 |
| **Settings Authority** | `apps/web-runtime/src/node-settings-store.ts` (persists `PublicSettings` from `application-contracts.ts:136-151`); credentials in `apps/web-runtime/src/node-credential-store.ts` (NEVER sent to renderer per A2-H §34 / A2-I §33) |
| **Runtime Host Authority** | `apps/web-runtime/src/node-runtime-host.ts` (Node Runtime Host) + `packages/runtime-core/src/operation-registry.js` (Shared Operation Registry) |
| **Prompt Digest (rubric)** | `7220F30FF07226D1920AF085C562DD65BE2A799D816E6524960B9933E84F8C35` |
| **Prompt Digest (corpus)** | `12D1526F6CEB2BE3733532DD43CAAE266403E8E96A3013EEF33711D88D246637` |
| **Prompt Digest (manifest logical)** | `f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa` |
| **Golden Status** | 5/5 PASS + G-04 hard gate PASS (Q-01..Q-05; no Golden update during A4) |
| **Golden Digest (qwen-baseline)** | `244D83C70E1B06142E4C3138C13730690937EAF2B4F524DCBABD75BB0F3AD6D0` |
| **Golden Digest (volcengine-baseline)** | `4DBB057930B7263BA8115AB1F8D09495C126CB9BBAE1FEB6C8183DFD62A2936B` |
| **Repository Contract** | PASS (`repo:verify` 9/9 including the new `verify:a4` aggregate) |
| **Actual Web** | PASS (providerResolution=true, electronProcessCountZero=true, desktopMainProcessCountZero=true) |
| **CLI** | PASS (`tests/a3-cli-default-resolution.test.js`; 6 subprocess tests including default + explicit + unknown) |
| **Current Flow Test Count** | `npm test` 842/842 PASS (was 830 at A3-final; +12 A4 anti-regression-guards tests) |
| **Known Limitations** | see `A4-known-limitations.md` |

## 2. A4 guards in effect (per A4 spec §11)

| Guard | Script | Status |
|---|---|---|
| G-A4-01 + G-A4-09 (default authority + default/fallback separation) | `scripts/verify-a4-default-authority.mjs` | PASS (142 files, 0 violations) |
| G-A4-03 (frozen prompt) | `scripts/verify-a4-frozen-prompt.mjs` | PASS (2 digests verified, 0 drift) |
| G-A4-05 (version namespace) | `scripts/verify-a4-version-namespace.mjs` | PASS (157 files, 0 violations) |
| G-A4-06 (legacy desktop) | `scripts/verify-a4-legacy-desktop.mjs` | PASS (3 tracked dirs + package.jsons, 0 violations) |
| G-A4-07 (golden mutation) | `scripts/verify-a4-golden-mutation.mjs` | PASS (2 fixtures verified, 0 drift) |
| G-A4-10 (secret safety) | `scripts/verify-a4-secret-safety.mjs` | PASS (1697 tracked files, 0 secret-shape matches) |

`G-A4-02` (provider registry bypass), `G-A4-04` (provider-specific
downstream logic), and `G-A4-08` (provider contract) are
intentionally covered by the existing `verify:workspace-boundaries`
+ `verify:production-boundaries` + `tests/analysis-provider-contract.test.js`
+ `tests/volcengine-analysis-provider-contract.test.js` guards; A4
references them but does not duplicate them (per A4 spec §11
"consistent with the repository's existing verification
architecture").

## 3. Repository status (per A4 spec §13 + §18)

```text
Working tree                                 clean
Branch                                      codex/visual-analysis-a1-multi-provider
HEAD                                        _this commit_
A2 PASS                                     confirmed at 295f83f
A3 PASS                                     confirmed at 2514784
A4 PASS                                     recorded at _this commit_
Current Authority Conflict                  0
New Version Namespace                       0
Legacy Desktop Current Authority             0
Secret leakage                              0
Current Product Feature Lost                 0
Frozen Prompt Changed                        NO
Prompt Digest Mismatch                       0
Golden Updated                               NO
Golden 5/5 + G-04                            PASS
Repository Contract                         PASS
Actual Web                                  PASS
```

## 4. Reopening A4 (per A4 spec §16)

A4 freezes the Visual Analysis infrastructure track. Per A4
spec §16 "Infrastructure Closure Rule":

```text
After A4 PASS:
  Visual Analysis Infrastructure Track = CLOSED

Do not automatically create A5/A6 merely because further
infrastructure improvements are imaginable.

Reopen only for a concrete trigger:
  - production blocker
  - provider deprecation
  - material quality regression
  - breaking provider API change
  - security issue
  - strategically approved new provider
  - canonical contract defect

Not for:
  - "maybe cleaner"
  - "could refactor"
  - "a newer model exists"
```

Freeze means changes become deliberate, not impossible.
