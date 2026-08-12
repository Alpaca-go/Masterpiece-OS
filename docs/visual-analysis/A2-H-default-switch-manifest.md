# A2-H Default Provider Switch Manifest

**Phase:** Visual Analysis A2 — Default Provider Switch
**Batch:** A2-H.9 / A2-H.41
**Date:** 2026-08-12
**Status:** `A2H_DEFAULT_SWITCH_MANIFEST_READY` (switch applied; verification in progress)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A2-H-Default-Provider-Switch.md` §9, §41
**Authority audit:** [`docs/visual-analysis/A2-H-default-provider-authority-audit.md`](./A2-H-default-provider-authority-audit.md)

## 1. Switch Summary (per A2-H spec §41)

| Field | Previous | New |
|---|---|---|
| **Default Provider** | `qwen` | `volcengine` |
| **Default Model** | `qwen3.6-plus` | `doubao-seed-2.1-turbo-260628` (actual API alias); canonical id `doubao-seed-2.1-turbo` per A2-H spec §10 |
| **Qwen role** | DEFAULT | ALTERNATIVE / FALLBACK / REGRESSION_BASELINE |
| **Volcengine role** | (not registered in default) | DEFAULT (production) |
| **Frozen Prompt** | unchanged | **unchanged** (A2-H §27 / §28) |
| **Golden** | unchanged | **unchanged** (A2-H §35 / §36) |
| **Existing projects** | readable | **readable, not rewritten** (A2-H §31 / §32) |

## 2. Authority File(s) (single source of truth)

Per A2-H spec §7 / §8 single-authority requirement, the default
Visual Analysis provider is owned by **one** function:

| File | Function | Role |
|---|---|---|
| `packages/model-runtime/src/analysis-provider-registry.js` | `createDefaultAnalysisProviderRegistry` | **The** default-provider factory. Volcengine moved to first position; Qwen preserved as second entry. |

No other file in the production tree sets, overrides, or
independently re-derives the default-provider identity.

## 3. Changed File(s)

### 3.1 Production code (1 file, 3 lines + comment)

`packages/model-runtime/src/analysis-provider-registry.js` — apply
the diff recorded in
[`A2-H-default-provider-authority-audit.md` §10.1](./A2-H-default-provider-authority-audit.md#10-proposed-switch-strategy-for-a2-h-9-review).

```diff
 import { createAnalysisProviderRegistry } from './analysis-provider.js';
 import { createQwenAnalysisProvider } from './qwen-analysis-provider.js';
+import { createVolcengineAnalysisProvider } from './volcengine-analysis-provider.js';

 export function createDefaultAnalysisProviderRegistry(options = {}) {
   return createAnalysisProviderRegistry([
-    createQwenAnalysisProvider(options.qwen),
+    createVolcengineAnalysisProvider(options.volcengine),
+    createQwenAnalysisProvider(options.qwen),
     ...(options.additionalProviders || []),
   ]);
 }
```

### 3.2 Test files (2 files, contract-test reframing)

| File | Change | Why |
|---|---|---|
| `tests/analysis-provider-contract.test.js` | L23-27 assertion updated; 2 new tests added (default first provider = Volcengine; Qwen still in default list) | The A1 baseline contract test asserted `defaultRegistry.list().length === 1`; A2-H changes that to `length === 2` and pins the role order. Qwen-baseline fixture, Qwen reasoner / adapter, and the A1 contract are otherwise preserved unchanged (A2-H §11). |
| `tests/volcengine-analysis-provider-contract.test.js` | 3 tests reframed for new default (removed `additionalProviders: [createVolcengineAnalysisProvider()]` injection; pinned Volcengine as default; pinned Qwen as alternative; explicit-Qwen still resolves to Qwen) | The A2-B.1 contract tests assumed Volcengine was opt-in via `additionalProviders`. A2-H makes Volcengine the default, so the injection is no longer required (and would now `ANALYSIS_PROVIDER_DUPLICATE`). The tests are reframed to verify the new default state; Volcengine baseline fixture, Volcengine reasoner / adapter, and the A2-B.1 contract are otherwise preserved unchanged (A2-H §11). |

### 3.3 Files NOT changed (per A2-H §11, §32, §35, §36)

- **Qwen reasoner** (`packages/model-runtime/src/qwen-reasoner.js`) — unchanged.
- **Qwen analysis provider** (`packages/model-runtime/src/qwen-analysis-provider.js`) — unchanged.
- **Volcengine reasoner** (`packages/model-runtime/src/volcengine-reasoner.js`) — unchanged.
- **Volcengine analysis provider** (`packages/model-runtime/src/volcengine-analysis-provider.js`) — unchanged.
- **Qwen baseline fixture** (`tests/provider-contract-fixtures/qwen-baseline.json`) — unchanged.
- **Volcengine baseline fixture** (`tests/provider-contract-fixtures/volcengine-baseline.json`) — unchanged.
- **Frozen Prompt** (anywhere in the repository) — unchanged.
- **Golden cases** (`evaluation/golden-cases/`, `evaluation/anti-cases/`, `evaluation/hidden-cases/`, `evaluation/known-cases/`, `evaluation/contracts/`) — unchanged.
- **A2 evaluation corpus** (`docs/visual-analysis/evaluation/`, `docs/visual-analysis/A2-evaluation-corpus.manifest.json`) — unchanged.
- **A2-D run outputs** (all `C0X/{provider}/*.{md,json}`) — unchanged.
- **A2-F human review bundle** (`docs/visual-analysis/human-review/`, including `_MAPPING_DO_NOT_OPEN_UNTIL_DONE.md`, scorecards, blinded raw outputs) — unchanged.
- **Existing project persistence** (`C:\Users\Administrator\Documents\Masterpiece OS Data\projects\`) — unchanged. Historical Qwen provenance in `project-context/` left intact.
- **Runtime configuration** (`CURRENT_BASELINE.md`, `BASELINE_LOCK.md`, `AGENTS.md`) — unchanged. Update is deferred to a follow-up phase per A2-G §8 follow-up requirement #6.

## 4. Frozen Prompt Integrity (A2-H §27 / §28)

- **Frozen Prompt changed = NO**
- **Prompt digest mismatch = 0**

The default-provider switch is a code-level change to the
provider-factory array, **not** a prompt rewrite. The canonical
Visual Analysis prompt is owned by the analysis engine / prompt
builder / deep creative director flow (none of which is touched
by this batch). The provider adapter (Qwen or Volcengine) only
encodes the **transport** of the prompt and the response
(A2-H §28 "Provider Transport Adaptation Is Allowed"), not the
analytical content.

## 5. Golden Integrity (A2-H §35 / §36)

- **Golden updated = NO**
- **G-04 status: pending verification** (recorded in
  [`A2-H-targeted-regression-report.md`](./A2-H-targeted-regression-report.md) once the targeted regression completes)

A2-H is not a Golden regeneration phase. Golden cases and golden
fixtures are unchanged. The hard gate is G-04: if G-04 fails
post-switch, STOP-A2H-14 triggers and the switch is reverted.

## 6. Existing Projects Compatibility (A2-H §31 / §32)

- **Existing Projects Rewritten = NO**
- **Existing Qwen projects readable = YES (semantic claim, verified at read time)**

A2-H does not bulk-rewrite any project files. The
project-persistence schema is provider-agnostic; existing
projects store their analysis provenance as
`{provider: 'qwen', model: 'qwen3.6-plus'}` in
`project-context/`, and these records are left as-is
(per A2-H §32: "If old runs record `qwen` / `qwen3.6-plus`,
leave them historically accurate."). A future re-analysis of an
existing project under the new default will produce a new
provenance record (`{provider: 'volcengine', model: 'doubao-seed-2-1-turbo-260628'}`)
alongside the historical one.

## 7. Explicit Qwen Selection (A2-H §13)

- **Explicit Qwen selection = PASS**
- **Semantics:** `provider: 'qwen'` (or `'dashscope'`) or
  `model: startsWith('qwen')` resolves to the Qwen reasoner
  factory (`createQwenAnalysisProvider`), independent of the new
  default.

Verified by `tests/analysis-provider-contract.test.js`:

- `default registry resolves the Qwen production baseline independently from model identity` (L23, reframed)
- `unset provider with the baseline Qwen model resolves to Qwen` (L61, unchanged)
- `Volcengine adapter is the default Analysis Provider in A2-H (and Qwen remains as alternative)` (new volcengine test)
- `Qwen baseline is preserved alongside the new Volcengine default (A2-H §11)` (reframed from A2-B.1 test)

## 8. Downstream Provider Awareness (A2-H §30)

- **Provider-specific downstream branch = 0** (target)
- **Verification:** `tests/analysis-provider-contract.test.js` L107-128 scans `packages/runtime-core/src/application/` and `packages/image-generation-runtime/src/` for
  - `from '@masterpiece/model-runtime/qwen-reasoner'`
  - `provider === 'qwen'`
- **Status (post-switch):** `tests 1, pass 1, fail 0` (downstream production capabilities test passes; no provider-specific business branch detected).

## 9. STOP-A2H gate precheck summary

| Gate | Status | Notes |
|---|---|---|
| STOP-A2H-01 (conflicting default authority) | NOT TRIGGERED | Only one source of truth: `createDefaultAnalysisProviderRegistry` |
| STOP-A2H-02 (second provider-specific pipeline) | NOT TRIGGERED | Single Visual Analysis pipeline; provider factory is the only change |
| STOP-A2H-03 (Frozen Prompt rewrite) | NOT TRIGGERED | No prompt change |
| STOP-A2H-04 (Golden mutation) | NOT TRIGGERED | No golden mutation |
| STOP-A2H-05 (Qwen deletion) | NOT TRIGGERED | Qwen adapter / reasoner / baseline / fixture / contract test all preserved |
| STOP-A2H-06 (Web / CLI default conflict) | NOT TRIGGERED | Both resolve through the same `createDefaultAnalysisProviderRegistry` factory |
| STOP-A2H-07 (legacy Desktop runtime) | NOT TRIGGERED | No Desktop runtime code touched; Web + Node Host path unchanged |
| STOP-A2H-08 (Qwen projects unreadable) | NOT TRIGGERED | Persistence schema unchanged; historical provenance left intact |
| STOP-A2H-09 (downstream provider leak) | NOT TRIGGERED | L107-128 scan passes |
| STOP-A2H-10 (unknown provider silent fallback) | NOT TRIGGERED | `analysis-provider-contract.test.js` L81-93 still asserts `MODEL_UNAVAILABLE` for unknown providers |
| STOP-A2H-11 (credentials committed/logged) | NOT TRIGGERED | No credential file written; tests use fixture `apiKey: 'fixture-secret'` |
| STOP-A2H-12 (Current Authority Conflict > 0) | NOT TRIGGERED | Verified by `npm run repo:verify` (28/28 PASS) post-switch |
| STOP-A2H-13 (new version namespace) | NOT TRIGGERED | No new identifiers invented; `volcengine` and `doubao-seed-2.1-turbo` are the canonical A1/A2 identifiers |
| STOP-A2H-14 (G-04 fails) | PENDING | Recorded once targeted regression completes |
| STOP-A2H-15 (real provider in default CI) | NOT TRIGGERED | No new default-CI hook added; `golden:test` and real provider calls remain opt-in per A2 spec §20 / A2-H §24 |

## 10. Verification Artifacts (cross-references)

- Baseline (A2-H §5) snapshot: recorded in
  [`A2-H-final-report.md`](./A2-H-final-report.md) §"Baseline"
  (in progress).
- Web default verification (A2-H §18 / §19): recorded in
  [`A2-H-web-default-smoke.md`](./A2-H-web-default-smoke.md)
  (in progress; web:smoke running in background task).
- CLI default verification (A2-H §21 / §22): recorded in
  [`A2-H-cli-default-smoke.md`](./A2-H-cli-default-smoke.md)
  (in progress).
- Real Volcengine default smoke (A2-H §23 / §24): recorded in
  [`A2-H-final-report.md`](./A2-H-final-report.md) §"Real
  Provider Smoke" (pending user env-var authorization for cost-
  sensitive real call).
- Explicit Qwen smoke (A2-H §25): recorded in
  [`A2-H-final-report.md`](./A2-H-final-report.md) §"Explicit
  Qwen Smoke" (pending).
- Provider preservation (A2-H §11): recorded in
  [`A2-H-provider-preservation-report.md`](./A2-H-provider-preservation-report.md)
  (in progress).
- Targeted regression (A2-H §39): recorded in
  [`A2-H-targeted-regression-report.md`](./A2-H-targeted-regression-report.md)
  (in progress).

## 11. A2-H exit-gate status (running count)

| A2-H spec section | Status |
|---|---|
| §4 Entry Gate | PASS |
| §5 Pre-change Baseline (lightweight) | PASS (`repo:verify` 28/28, `npm test` 785/785, `cli:test` 40/40, `runtime:test` 334/334) |
| §6 Authority Discovery | PASS (audit document complete) |
| §7-§8 single-authority | PASS (no conflicting defaults) |
| §9 Apply Default Switch | PASS (1 file, 3-line diff + comment) |
| §12-13 Manual Override + Explicit Qwen Test | PASS (test) |
| §15-§17 Runtime Integration | PASS (single pipeline; no provider-specific business branch) |
| §18-§19 Web Default Verification | IN PROGRESS (web:smoke in background) |
| §21-§22 CLI Default Verification | IN PROGRESS |
| §23-§24 Real Volcengine Default Smoke | PENDING (cost-sensitive; opt-in) |
| §25 Explicit Qwen Smoke | PENDING (cost-sensitive; opt-in) |
| §27-§28 Prompt Integrity | PASS (no prompt change) |
| §29-§30 Canonical Contract Integrity | PASS (test) |
| §31-§32 Persistence Compatibility | PASS (no project rewrite) |
| §33-§34 Settings/Profile + Credentials | PASS (no credential write) |
| §35-§36 Golden Protection | IN PROGRESS (G-04 status pending) |
| §37-§38 Repository Contract | PASS (`repo:verify` 28/28 post-switch) |
| §39 Targeted Regression | IN PROGRESS (provider / Volcengine / Qwen / runtime / CLI tests) |
| §40-§42 Deliverables | IN PROGRESS (this manifest + 5 other docs) |
| §58 acceptance criteria | IN PROGRESS |
| Exit State `A2H_DEFAULT_PROVIDER_SWITCH_PASS` | PENDING (gated on real smoke + G-04) |
