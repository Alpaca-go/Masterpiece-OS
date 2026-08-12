# A4 Known Limitations

**Phase:** Visual Analysis A4 — Production Freeze & Operational Baseline
**Date:** 2026-08-12
**Status:** `A4_KNOWN_LIMITATIONS_FROZEN`
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A4-Production-Freeze-Operational-Baseline.md` §15
**Predecessor:** A4-1 + A4-2 + A4-3 + A4-4
                A3 `VISUAL_ANALYSIS_A3_PASS` (`2514784`)

## 1. Purpose (per A4 spec §15)

Record only limitations **supported by current evidence**. Do not
invent limitations to fill the file. Classify each as one of:

```text
BUG                       — actual defect in current code
OPERATIONAL               — manual / cost-sensitive / opt-in
A3 FOLLOW-UP              — explicitly out of A3 scope; candidate A3.x or A4 follow-up
FUTURE PROVIDER           — new model / provider; not a current limitation
PRODUCT FEATURE           — deliberate product decision
NON-BLOCKING              — known observation; not a defect; not a follow-up
```

## 2. Limitations (current evidence)

### 2.1 Cost visibility incomplete (A3 FOLLOW-UP / NON-BLOCKING)

**Evidence:** A2-I §47 / §75 + A3-final-freeze §9.1 + A3
real provider smoke audit
(`.codex-smoke/a2-h-real-smoke/2026-08-12T12-58-16-487Z.json`).
The reasoner exposes `provenance.usage.inputTokens /
outputTokens / totalTokens / raw` (A3-E), but
`provenance.usage.cost` is `UNKNOWN` because no explicit
pricing source exists in the repository (per A2 spec §56 + A3
observability-report §2.3). Real provider smoke audit shows:

```text
provenance.usage:
  inputTokens:  317
  outputTokens: 794
  totalTokens:  1111
  cost:         UNKNOWN
```

**Why NOT a BUG:** A2 spec §56 explicitly forbids estimating
cost. A4 does not introduce a pricing source because no
explicit pricing source exists in the current repository.

**Follow-up:** A3.x or A4 follow-up — add an explicit pricing
source (URL or doc ref) and populate `provenance.usage.cost`
accordingly.

### 2.2 Context capability partially verified (A3 FOLLOW-UP / NON-BLOCKING)

**Evidence:** A2-B.2 capability probe (PASS for Vision /
Multi-image / Structured; Context = UNKNOWN). Re-confirmed in
A2-D observation. A2-G §8 follow-up requirement #5 (larger-n
re-evaluation) is a candidate A3 follow-up.

**Why NOT a BUG:** The capability probe returned UNKNOWN for
context; we do not estimate it.

**Follow-up:** A3.x — run a larger-n re-evaluation if the
context capability becomes a hard requirement.

### 2.3 Fallback covers only selected error classes (A3 FOLLOW-UP / NON-BLOCKING)

**Evidence:** A3-B `isFallbackEligible` + `classifyFallbackReason`
classify errors into the 4 eligible categories
(TEMPORARY_PROVIDER_UNAVAILABLE / RATE_LIMIT / TRANSPORT_FAILURE
/ TIMEOUT); the 6 excluded categories (AUTH_ERROR / MODEL_NOT_FOUND
/ REQUEST_INVALID / RESPONSE_INVALID / CONTRACT_VALIDATION_FAILED
/ USER_CANCELLED) are NOT eligible. The A3-B classification is
implemented; the **executor** (the code that re-issues the
request against the alternative provider) is **NOT** implemented
(per A3-final-freeze §9.2 + A4-2 §6 + A4-2 §3.14 / §3.15).

**Why NOT a BUG:** A3 explicitly stops at classification; the
executor is a separate decision. A4-2 freezes the actual A3
behavior; A4 does not expand it (per A4 spec §6 "do not
expand").

**Follow-up:** A3.x or A4 follow-up — implement the executor
behind a feature flag; the policy + classification are already in
place.

### 2.4 Real provider tests remain manual / opt-in (OPERATIONAL)

**Evidence:** The a2-h-real-smoke.mjs script and the
a3-provider-health-probe.mjs script are both **manual / opt-in**
and are **NEVER in `repo:verify`** (per A2-H spec §24 + A3
spec §21 + A4 spec §8). They require live API credentials
(env vars only, never committed).

**Why NOT a BUG:** This is the design intent. A2-H §24
explicitly mandates manual / opt-in; A3 §21 reinforces it; A4
§8 reaffirms it. Real provider tests are cost-sensitive; the
test surface must not depend on paid external calls.

**Follow-up:** NONE. The manual / opt-in nature is the
intentional contract.

### 2.5 Provider SLA not guaranteed (NON-BLOCKING)

**Evidence:** A2-E and A2-I re-confirm that Volcengine is
~2.4–2.7× slower than Qwen. A4-3 §6 real provider smoke audit
shows Volcengine 26.1 s vs Qwen 55.9 s in this run (varies per
prompt; the precise ratio depends on payload + prompt).

**Why NOT a BUG:** The provider SLA is not part of the
contract; we record latency via `provenance.latencyMs` (A3-D)
and surface it to the user. The Web `ProviderBadge` displays
the current provider + model; the run progress is shown in the
Analysis workspace.

**Follow-up:** NONE. SLA enforcement is a product / business
decision, not a Visual Analysis architecture decision.

### 2.6 A3-D aggregate timing not yet aggregated (A3 FOLLOW-UP / NON-BLOCKING)

**Evidence:** A3-observability-report §1.4 recommends aggregating
`analysisTotalMs` / `retryMs` / `fallbackMs` at the CLI
run-logger + Web pipeline-service level. The per-call
`provenance.latencyMs` is exposed; the aggregated run-logger
fields exist (`creativeDirectorTimeMs`, `actualModelTimeMs`,
`modelCallsThisRun`) but the explicit A3-D aggregate
(`analysisTotalMs` / `retryMs` / `fallbackMs`) is not yet a
field on the run report.

**Why NOT a BUG:** A3-D §1.3 / §1.4 documents this as a
recommended observability field; A3 does not introduce a new
aggregator (per A3-observability-report §1.4). The
`creativeDirectorTimeMs` field on the CLI run report is
sufficient for the current product UI.

**Follow-up:** A3.x or A4 follow-up — add the explicit
`analysisTotalMs` / `retryMs` / `fallbackMs` fields to the run
report (additive, no contract change).

### 2.7 Health cache is process-local (OPERATIONAL)

**Evidence:** A3-F `provider-health.js` uses a module-level
`Map` for the cache. The cache is process-local; cross-process
state is not persisted.

**Why NOT a BUG:** A3 spec §21 + A3-observability-report §3.2
explicitly design the cache as process-local; consumers needing
cross-process state can layer a persistent store on top of
`setProviderHealth`.

**Follow-up:** NONE — the process-local nature is the
intentional design.

### 2.8 On-disk untracked `apps/desktop/` orphan (OPERATIONAL)

**Evidence:** `apps/desktop/` exists on disk but is not in
`git ls-tree HEAD` (verified by `scripts/verify-a4-legacy-desktop.mjs`).
The directory was removed from git in S5 (commit
`fd577ed refactor(runtime): remove Desktop compatibility paths`)
but the on-disk orphan remains.

**Why NOT a BUG:** The A4-06 guard scans `git ls-tree HEAD`
(TRACKED paths), not the on-disk tree. The existing
`tests/runtime-boundary.test.js` + `tests/archive-boundary.test.js`
handle the boundary at the runtime / archive level. The on-disk
orphan is out of A4 scope (per A4 spec §11 G-A4-06 "Prevent
removed Desktop runtime from becoming CURRENT authority
again" — the canonical authority is the tracked tree, not the
on-disk tree).

**Follow-up:** Operational cleanup (out of A4 scope). The
user can `mavis-trash apps/desktop/` (or remove the directory
manually) at their convenience. The A4-06 guard continues to
PASS because the tracked tree is clean.

## 3. Items NOT recorded (intentionally)

Per A4 spec §15 "Do not invent limitations to fill the file",
the following are NOT recorded here:

- Hypothetical performance issues
- Hypothetical provider failures
- Hypothetical UI / UX improvements
- Hypothetical refactor opportunities
- Hypothetical new features

These are explicitly out of scope per A4 spec §16
"Infrastructure Closure Rule":

```text
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
```

## 4. A4-5 acceptance

- [x] Limitations recorded with current evidence
- [x] Each limitation classified (BUG / OPERATIONAL / A3 FOLLOW-UP / FUTURE PROVIDER / PRODUCT FEATURE / NON-BLOCKING)
- [x] No invented limitations
- [x] No blocking limitations
- [x] A4-final-report §6 cross-references this document
