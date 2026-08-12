# A2-H Default Provider Authority Audit

**Phase:** Visual Analysis A2 — Default Provider Switch
**Batch:** A2-H.1 — Default Authority Discovery
**Date:** 2026-08-12
**Status:** `A2H_AUTHORITY_AUDIT_READY` (authority identified; switch not yet applied)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A2-H-Default-Provider-Switch.md` §6, §7, §8
**Previous Gate:** A2-G `CHANGE_DEFAULT_TO_VOLCENGINE` (06e3162)
**Source of truth:** the file path + line numbers cited below. **This is a code-audit document, not a spec.**

## 0. Audit Objective (per A2-H spec §6)

Identify the exact CURRENT authority responsible for the default
Visual Analysis provider; distinguish:

- **Authority** (the single source of truth that owns the default)
- **Consumer** (reads the authority; does not redefine it)
- **Compatibility field** (legacy storage the new default must remain
  compatible with)
- **Fixture** (test-only default; preserved as historical record)
- **Test-only default** (test uses an in-test default not derived
  from the production authority)
- **Historical residue** (e.g. past evaluation provenance that
  records a previous provider; must NOT be rewritten per A2-H §32)

The audit must NOT guess (A2-H §7). All findings are bound to file
path + line number, verified against the current `HEAD` of branch
`codex/visual-analysis-a1-multi-provider` (commit `632b46e`).

## 1. Headline Finding

There is **one semantic default-provider authority** (per A2-H §8
single-authority requirement). It is:

- **File:** `packages/model-runtime/src/analysis-provider-registry.js`
- **Function:** `createDefaultAnalysisProviderRegistry(options)`
- **Lines:** 4–9
- **Current state:** Qwen is hard-coded as the first (and only
  default) entry. Volcengine is opt-in via
  `options.additionalProviders`.

All other code paths (Web, CLI, runtime, downstream) are
**Consumers** of this authority, not independent default sources.

## 2. The Authority (in detail)

### 2.1 Source file

```
packages/model-runtime/src/analysis-provider-registry.js
```

```js
// L1-9
import { createAnalysisProviderRegistry } from './analysis-provider.js';
import { createQwenAnalysisProvider } from './qwen-analysis-provider.js';

export function createDefaultAnalysisProviderRegistry(options = {}) {
  return createAnalysisProviderRegistry([
    createQwenAnalysisProvider(options.qwen),
    ...(options.additionalProviders || []),
  ]);
}
```

### 2.2 Authority role

- This is the **only code path** that constructs a default
  analysis-provider registry with no caller-supplied list.
- All callers that want to customize the provider list do so
  via the `options.additionalProviders` opt-in (A2-B.1 contract,
  locked since commit `d6717e8`).
- The function name itself (`createDefaultAnalysisProviderRegistry`)
  is the published contract; renaming it would be a breaking
  change to the A1 provider abstraction (out of A2-H scope per
  A2-H §3).

### 2.3 Why the array order matters (and when it does NOT)

`createAnalysisProviderRegistry` (in `analysis-provider.js`) does
NOT do first-match-wins by position. It uses a `supports(configuration)`
filter, then:

- 0 matches → throw `AnalysisProviderError(MODEL_UNAVAILABLE)`
- 1 match → select it
- > 1 match → throw `Error(ANALYSIS_PROVIDER_AMBIGUOUS)`

So the **default is determined by `configuration`, not by array
order** — specifically, the `provider` field (when set) and the
`model` prefix (when `provider` is unset). See §3.

**Implication for A2-H:** simply reordering the array (Volcengine
first, Qwen second) does **not** change the dispatch outcome for
existing callers, because Qwen and Volcengine `supports()`
predicates are disjoint on the model-prefix path. The switch
must therefore target a code path that is reached when
`configuration.provider` is unset and `configuration.model` is
unset — i.e. callers that hand the registry a "no explicit
choice" configuration.

## 3. Provider-dispatch mechanism

### 3.1 Qwen dispatch (preserved)

`packages/model-runtime/src/qwen-analysis-provider.js` L12–20:

```js
supports(configuration = {}) {
  const provider = normalized(configuration.provider);
  const protocol = normalized(configuration.protocol || 'openai-chat-multimodal');
  const model = normalized(configuration.model);
  if (protocol !== 'openai-chat-multimodal') return false;
  if (provider === 'qwen' || provider === 'dashscope') return true;
  if (provider === 'openai-compatible' || !provider) return model.startsWith('qwen');
  return false;
}
```

- Explicit `provider: 'qwen'` or `'dashscope'` → Qwen
- `provider: 'openai-compatible'` or unset (`!provider`) →
  `model.startsWith('qwen')` → Qwen

### 3.2 Volcengine dispatch (already wired)

`packages/model-runtime/src/volcengine-analysis-provider.js` L38–50:

```js
supports(configuration = {}) {
  const provider = normalized(configuration.provider);
  const protocol = normalized(configuration.protocol || 'openai-chat-multimodal');
  const model = normalized(configuration.model);
  if (!SUPPORTED_PROTOCOLS.includes(protocol)) return false;
  if (provider === 'volcengine' || provider === 'ark') return true;
  if (provider === 'openai-compatible' || !provider) {
    return model.startsWith('doubao-');
  }
  return false;
}
```

- Explicit `provider: 'volcengine'` or `'ark'` → Volcengine
- `provider: 'openai-compatible'` or unset → `model.startsWith('doubao-')` → Volcengine

### 3.3 Dispatch summary (the actual "default" decision)

| `provider` field | `model` field | Resolves to |
|---|---|---|
| `qwen` / `dashscope` | (any) | Qwen |
| `volcengine` / `ark` | (any) | Volcengine |
| `openai-compatible` | starts with `qwen` | Qwen |
| `openai-compatible` | starts with `doubao-` | Volcengine |
| unset | starts with `qwen` | Qwen |
| unset | starts with `doubao-` | Volcengine |
| any other explicit | (any) | `ANALYSIS_PROVIDER_UNSUPPORTED` (per A2-H §14) |

**The "default" therefore is whatever the caller passes for
`configuration.provider` + `configuration.model`.** The registry
does not independently pick a default.

## 4. Consumers (do not own the default)

### 4.1 `packages/runtime-core/src/application/pipeline-service.ts`

- L104: imports `createDefaultAnalysisProviderRegistry`
- L388: `analysisProviders = createDefaultAnalysisProviderRegistry()`
  — **the only production call site**
- L137: `error.message` contains a `Qwen 请求失败` prefix strip
  (this is a reasoner error-message normalization, **not** a
  default-provider decision; the strip applies to whatever
  reasoner throws)

This is the **only production code** that constructs the default
analysis-provider registry without arguments.

### 4.2 `apps/cli/src/analysis-engine/bootstrap.js`

- `runAnalysisPipeline(input, options = {})` accepts
  `options.deepCreativeDirectorReasoner` and
  `options.deepCreativeDirectorReasonerFactory` as
  reasoner-injection points (L117–120).
- The CLI **does not** call `createDefaultAnalysisProviderRegistry`.
  The CLI caller is responsible for the provider choice.
- The CLI is therefore a **Consumer at the callsite level**; the
  default is supplied by whatever harness invokes the CLI.

### 4.3 `apps/web-runtime/` and `apps/web/`

- **No `qwen` / `volcengine` / `qwen3.6-plus` references** in
  `apps/web/src` (verified by `Select-String` for `qwen|qwen3\.6-plus`).
- The Web runtime reads from `@masterpiece/runtime-core` (which
  calls `createDefaultAnalysisProviderRegistry` once at
  pipeline-service construction).
- The Web UI surfaces provider identity via `getSettings()` and
  `getProviderCredentials()` (`node-settings-store.ts` and
  `node-credential-store.ts`), both of which are profile-driven
  and provider-agnostic (the profile stores `provider` + `modelId`
  + `baseUrl` fields, but does not hardcode any particular
  provider as "the default").
- **Web's "default" is therefore the user-selected `defaultProfileId`
  in the API Profile store.** The runtime then assembles a
  `configuration` from that profile, and the registry's
  `supports()` predicate dispatches to the matching provider.

### 4.4 Test files

- `tests/analysis-provider-contract.test.js` L11, L23–83 — A1
  baseline contract tests (LOCKED per A1; preserved per A2-H §11)
- `tests/volcengine-analysis-provider-contract.test.js` L11,
  L25–142 — A2-B.1 contract tests (NEW in A2-B.1; preserved per
  A2-H §11)

These tests are **test-only** uses of the default registry; they
do NOT flow into production. See §6.

## 5. Compatibility Fields

These fields store existing user state. The new default must
remain compatible with all of them (per A2-H §31, §32, §33).

### 5.1 `apps/web-runtime/src/node-settings-store.ts`

- `StoredSettings.profiles: ApiProfile[]` — user-saved API
  profiles; each has `provider`, `protocol`, `modelId`, `baseUrl`,
  `credentialKey`, `isDefault`, `isEnabled`
- `StoredSettings.defaultProfileId: string | null` — points to
  the user's chosen default profile
- `migrateLegacy()` L131–169 — converts a legacy single-provider
  settings blob to a single `profile-default` profile (default
  provider / model are inherited from legacy values)
- `getProviderCredentials()` L377–397 — resolves
  `profileId || defaultProfileId || firstEnabled`; returns
  `provider`, `model`, `baseUrl`, `apiKey` to the caller

The new default must:
- Leave existing Qwen profiles readable (per A2-H §31, §32)
- Not silently rewrite a user's explicit Qwen profile into a
  Volcengine profile (per A2-H §33)
- Continue to honor `defaultProfileId` and `isDefault` /
  `isEnabled` semantics (no contract change)

### 5.2 `apps/web-runtime/src/node-credential-store.ts`

- Stores encrypted API keys per `profileId` (`aes-256-gcm`,
  master key in `master.key`, 0o600 file mode)
- Environment-variable override: `MASTERPIECE_API_KEY_<PROFILE_ID>`
  (uppercased, non-alphanumeric replaced with `_`) and the
  shared `MASTERPIECE_API_KEY` fallback (L38–40)
- **No provider identity is hard-coded in this module.** The
  store is provider-agnostic.

### 5.3 Project persistence

- Existing projects in `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\`
  were analyzed under Qwen. Their `project-context/` artifacts
  record `provider` / `model` provenance historically.
- Per A2-H §32, **historical provenance is left intact** —
  old `qwen` / `qwen3.6-plus` records remain accurate to the
  run that produced them.

## 6. Test-only Defaults (preserved as fixtures)

These are NOT production authorities. They are test fixtures
locked by A1 (Qwen) and A2-B.1 (Volcengine). They are preserved
unchanged per A2-H §11.

- `tests/provider-contract-fixtures/qwen-baseline.json` — A1
  baseline (regression control for the Qwen adapter)
- `tests/provider-contract-fixtures/volcengine-baseline.json` —
  A2-B.1 baseline (secondary control for the Volcengine adapter)
- `tests/analysis-provider-contract.test.js` — A1 contract
  contract test for the default registry; its assertion
  `defaultRegistry.resolve(...).id === baseline.providerId` is
  bound to the Qwen baseline fixture
- `tests/volcengine-analysis-provider-contract.test.js` — A2
  contract test for the Volcengine adapter; its
  `defaultRegistry.list().length === 1` assertion encodes the
  current "default = Qwen only" invariant

**A2-H §15 cross-check:** changing the default-provider authority
may change the assertion outcome of
`tests/analysis-provider-contract.test.js` (the
"default registry resolves the Qwen production baseline" test
and "unset provider with the baseline Qwen model resolves to
Qwen" test). These tests encode the A1 baseline contract. Per
A2-H §11, **the Qwen baseline must be preserved**, but the test
assertions about "default = Qwen" may need to be reframed to
"explicit Qwen resolves to Qwen" while "default" is reframed
to "Volcengine".

## 7. Historical Residue (left intact, per A2-H §32)

These files record past provider identity for past runs. They
are NOT modified by A2-H.

- `docs/visual-analysis/evaluation/C0X/qwen/*.md` and
  `docs/visual-analysis/evaluation/C0X/qwen/*.json` — A2-D raw
  outputs of the Qwen candidate (locked, frozen)
- `docs/visual-analysis/evaluation/C0X/volcengine/*.md` and
  `docs/visual-analysis/evaluation/C0X/volcengine/*.json` —
  A2-D raw outputs of the Volcengine candidate
- `docs/visual-analysis/evaluation/evaluation-matrix.json` —
  A2-D run record (provider identity per (Case, Run))
- `docs/visual-analysis/A2-production-model-decision.md` §5 —
  Qwen role = `ALTERNATIVE / FALLBACK` (decision record)
- `docs/visual-analysis/A2-model-character-profiles.md` §2 —
  Qwen profile (decision record)

## 8. Model Registry vs Provider Registry

Two distinct registries exist; this audit confirms they are
**non-overlapping in scope** and the A2-H switch targets only
the **Provider Registry**.

### 8.1 `@masterpiece/model-registry` (`packages/model-registry/src/index.js`)

- **Purpose:** capability metadata for image-generation and
  analysis models (display name, provider, protocol,
  capabilities, `enabledByDefault`, `referenceSupport`)
- **Current entries (frozen list `MODELS`):**
  - `qwen3.6-plus` (provider `dashscope`, `analysis`,
    `enabledByDefault: true`)
  - `gpt-image-2` (provider `openai`, `image_generation`,
    `enabledByDefault: true`)
  - `nano-banana` (provider `google`, `image_generation`,
    `enabledByDefault: true`)
  - `seedream-5.0-pro` (provider `volcengine`,
    `image_generation`, `enabledByDefault: true`) — **this is
    an image-generation model, NOT the analysis model**
  - `wan2.7-image-pro` (provider `dashscope`,
    `image_generation`, `enabledByDefault: false`,
    `legacyCompatible: true`)
- **Does NOT contain:** the Volcengine **analysis** model
  (`doubao-seed-2-1-turbo-260628`). Only the Volcengine
  image-generation model (`seedream-5.0-pro`) is registered.
- **Therefore:** the A2-H default switch does NOT need to add
  the Volcengine analysis model to `@masterpiece/model-registry`
  to succeed. The analysis-side default dispatch is in
  `createDefaultAnalysisProviderRegistry`, not in model-registry.
- **Caveat (informational, not blocking):** A future A2.x phase
  may wish to register the Volcengine analysis model here for
  capability introspection / UI display. That is out of A2-H
  scope per A2-H §10 (no new version namespace; no new
  invented identifiers).

### 8.2 `createDefaultAnalysisProviderRegistry` (Provider Registry)

- **Purpose:** the actual HTTP/SDK reasoner factory used to
  execute a Visual Analysis request.
- **Current entries:** Qwen (default, hard-coded); Volcengine
  (opt-in via `additionalProviders`).
- **This is the A2-H switch target.**

## 9. Pre-Switch Snapshot (current state)

To be filled in as part of A2-H §5 baseline run, but the
*authority* snapshot is fixed:

| Item | Current value |
|---|---|
| Default Analysis Provider authority | `createDefaultAnalysisProviderRegistry` in `packages/model-runtime/src/analysis-provider-registry.js` |
| Default Provider (in authority) | Qwen (`qwen3.6-plus`) |
| Volcengine in default registry | No (opt-in only) |
| Default model in `qwen3.6-plus` capability | 131,072 context, 32,768 output (`packages/model-runtime/src/model-capabilities.js` L15-16) |
| `doubao-seed-2-1-turbo-260628` in model-registry | No |
| `doubao-seed-2-1-turbo-260628` in analysis-provider-registry | Yes (when `additionalProviders` includes it) |
| Qwen provider registration | Health (Qwen adapter + reasoner + tests + baseline + fixture all present) |
| Volcengine provider registration | Health (Volcengine adapter + reasoner + 19 contract tests + baseline + fixture all present) |
| Qwen references in Web / Web-runtime | 0 (verified by `Select-String` against `apps/web/src` and `apps/web-runtime/src`) |
| Conflicting default authorities | 0 (single source of truth) |

## 10. Proposed Switch Strategy (for A2-H §9 review)

The minimum required change to flip the default to Volcengine
while honoring A2-H §8 (single authority), §10 (canonical
provider/model identifiers), and §11 (Qwen preservation):

### 10.1 Code change (single file)

`packages/model-runtime/src/analysis-provider-registry.js`:

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

### 10.2 Rationale

- **Single semantic default authority** preserved (A2-H §8):
  the function is still the one source of truth; the array
  contents change but the dispatch mechanism
  (`supports(configuration)`) is unchanged.
- **Qwen preserved** (A2-H §11): Qwen remains registered; it
  resolves to Qwen when the caller explicitly selects Qwen
  (`provider: 'qwen'` or model starts with `qwen`).
- **No new version namespace** (A2-H §10): no new identifiers
  invented. `volcengine` and `doubao-seed-2.1-turbo` /
  `doubao-seed-2-1-turbo-260628` are the canonical A1/A2
  identifiers.
- **No duplicate pipeline** (A2-H §16): the `Visual Analysis
  Pipeline` remains one pipeline; the `Provider Contract`
  interface is unchanged.
- **No provider-specific business branch** (A2-H §17): the
  only code change is the array of provider factories; downstream
  business logic continues to be provider-agnostic.
- **A2-D baselines preserved** (A2-H §11): Qwen baseline
  fixture, Volcengine baseline fixture, A1 contract test, A2-B.1
  contract test all remain unchanged as test-only defaults.

### 10.3 Pre-Switch STOP-A2H-01 precheck

Per A2-H §43 STOP-A2H-01, the switch is blocked if more than one
**conflicting** default authority is discovered. This audit
finds:

- **Conflicting default authorities = 0** (only one source of
  truth: `createDefaultAnalysisProviderRegistry`).
- STOP-A2H-01 does NOT trigger.

### 10.4 Pre-Switch STOP-A2H-12 precheck

Per A2-H §54 STOP-A2H-12, the switch is blocked if a repository
guard reports `Current Authority Conflict > 0`. This is verified
post-switch in A2-H §14 / §37.

## 11. Items that need A2-H actions beyond the code change

These are not part of the audit per se but are listed here so
A2-H can track them:

1. **A2-H §5 baseline run** — `npm run repo:verify`, `npm test`,
   `npm run cli:test`, `npm run runtime:test`, `npm run web:smoke`,
   `npm run golden:test` (or current equivalents per AGENTS.md);
   record results in the A2-H §5 baseline snapshot.
2. **A2-H §9 apply the §10.1 diff above** + commit.
3. **A2-H §12 / §13 explicit-Qwen test** — verify that
   `createDefaultAnalysisProviderRegistry()` followed by
   `.resolve({ provider: 'qwen', ... })` returns Qwen, not
   Volcengine. This proves the array reorder does not break
   explicit selection.
4. **A2-H §15 runtime integration** — verify
   `pipeline-service.ts` constructs a registry that resolves
   Volcengine for unset-provider / unset-model configurations
   (after the switch).
5. **A2-H §18 / §19 Web verification** — launch actual Web
   (not Desktop smoke) and verify the UI surfaces
   "default profile → Volcengine" without introducing stage
   names (A2-H §19).
6. **A2-H §21 / §22 CLI verification** — verify
   `runAnalysisPipeline` with no `options.deepCreativeDirectorReasoner`
   resolves to Volcengine (or, since CLI does not call the
   default registry, verify that the harness's default
   resolution matches).
7. **A2-H §23 / §24 real Volcengine default smoke** — run a
   real Visual Analysis request without explicit provider
   selection, confirm `resolved.provider = 'volcengine'`,
   `resolved.model = 'doubao-seed-2-1-turbo-260628'`, valid
   canonical result. Manual / opt-in / cost-sensitive.
8. **A2-H §25 explicit Qwen smoke** — run one explicit
   Qwen request, confirm canonical result is still valid.
9. **A2-H §27 / §28 prompt integrity** — verify `frozen prompt`
   unchanged (the prompt is provider-agnostic; no change
   required by the switch).
10. **A2-H §29 / §30 downstream provider-awareness audit** —
    grep for `provider === 'volcengine'` /
    `model === 'doubao-seed-2-1-turbo'` /
    `provider === 'qwen'` in business analysis logic; target
    `new provider-specific business branches = 0`.
11. **A2-H §31 / §32 persistence compatibility** — read an
    existing Qwen-era project under the post-switch runtime;
    confirm the analysis is still readable, and the historical
    `qwen` / `qwen3.6-plus` provenance in the project's
    `project-context/` is unchanged.
12. **A2-H §33 settings/profile compatibility** — confirm a
    user with an explicit Qwen profile does not silently
    migrate to Volcengine.
13. **A2-H §35 / §36 Golden protection** — Golden must NOT
    be updated by A2-H. G-04 is a hard gate; if G-04 fails
    post-switch, STOP-A2H-04 / STOP-A2H-14 trigger.
14. **A2-H §37 / §38 repository contract** — re-run the
    `verify:*` guards after the switch; target
    `Current Authority Conflict = 0`, `New Version Namespace = 0`.
15. **A2-H §39 targeted regression** — provider registry
    tests, provider selection tests, Volcengine adapter
    tests, Qwen adapter tests, runtime analysis tests, CLI
    provider tests, Web smoke, Golden, repository guards.
16. **A2-H §40 / §42 deliverables** — the 6 markdown
    documents required by A2-H §40 plus §42 final report.

## 12. Outstanding items for A2-H.1

This audit document itself is the A2-H.1 deliverable. The next
A2-H step is **A2-H.5** (pre-change baseline) followed by
**A2-H.2** (apply the switch), but per user direction the
switch is gated on:

- Pre-change baseline run completion (so we can compare
  before/after).
- User sign-off on the §10.1 proposed diff.
- Real-Provider smoke consent (cost-sensitive; per A2-H §24,
  manual / opt-in / credential-dependent).

These gates are tracked in the project todo list; A2-H does
not auto-proceed past them.

## 13. Audit Sign-off

- **Authority identified:** `createDefaultAnalysisProviderRegistry` in `packages/model-runtime/src/analysis-provider-registry.js` L4–9.
- **Conflicting default authorities:** 0.
- **STOP-A2H-01 triggered:** NO.
- **A2-H.1 status:** `A2H_AUTHORITY_AUDIT_READY`.
- **Next gate:** A2-H.5 (pre-change baseline) → A2-H.2 (apply switch), subject to user sign-off.
