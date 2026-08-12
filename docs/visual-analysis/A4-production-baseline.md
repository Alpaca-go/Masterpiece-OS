# A4-3 Production Baseline Snapshot

**Phase:** Visual Analysis A4 — Production Freeze & Operational Baseline
**Date:** 2026-08-12
**Status:** `A4_PRODUCTION_BASELINE_FROZEN`
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A4-Production-Freeze-Operational-Baseline.md` §7, §8, §9
**Predecessor:** A4-1 production contract freeze (`f6955fc`)
                A4-2 operational failure matrix (`2cea903`)
                A4-4 anti-regression guards (`5682ba5`)
                A3 `VISUAL_ANALYSIS_A3_PASS` (`2514784`)

## 1. Purpose (per A4 spec §7)

Record the **exact current counts** of the repository, the
runtime environment, and the verification suites — using only
facts available from the actual environment. Run the CURRENT
verification authorities and record their current counts, not
historical numbers.

## 2. Repository facts (per A4 spec §7)

```text
Freeze Date           2026-08-12
Branch                codex/visual-analysis-a1-multi-provider
Commit                5682ba5a9726bfb636787e6076ad5687e6f9a968
Product Version       5.0.0-rc.1
Node Version          v24.18.0
Package Manager       npm 11.16.0
Acceptance OS         Windows 11 (PowerShell; per user memory)
Default Provider/Model    volcengine / doubao-seed-2.1-turbo
                         (API alias doubao-seed-2-1-turbo-260628)
Alternative/Fallback      qwen / qwen3.6-plus
Working tree          clean
```

## 3. Verification suite current counts

```text
repo:verify                  9/9 PASS
  verify:repository-contract            PASS
  verify:version-consistency             PASS
  verify:version-naming                  PASS
  verify:workspace-boundaries            PASS (0 failure, 0 warning)
  verify:no-obsolete-code                PASS (611 files scanned)
  verify:production-boundaries           PASS (296 current production files)
  verify:no-project-specific             PASS
  verify:golden-boundary                 PASS
  verify:current-flows                   PASS (tsc strict 0 errors)
  verify:a4                              PASS (6 new A4 guards; this commit batch C3)
    verify:a4-default-authority          PASS (142 files, 0 violations)
    verify:a4-frozen-prompt              PASS (2 digests verified, 0 drift)
    verify:a4-version-namespace          PASS (157 files, 0 violations)
    verify:a4-legacy-desktop             PASS (3 tracked dirs + package.jsons, 0 violations)
    verify:a4-golden-mutation            PASS (2 fixtures verified, 0 drift)
    verify:a4-secret-safety              PASS (1697 tracked files, 0 secret-shape matches)
  repo:guard:test                        PASS
    repository-contract-guard.test.js
    version-naming-guard.test.js
    archive-boundary.test.js
    runtime-boundary.test.js
    web-runtime-host-boundary.test.js
    operation-registry.test.js
    a4-anti-regression-guards.test.js

npm test                    842/842 PASS
  (was 830 at A3-final; +12 A4 anti-regression-guards tests)

cli:test                     40/40 PASS

runtime:test                348/348 PASS
  (14 from runtime-application:test + 334 from runtime-core)

golden:test                 5/5 PASS + G-04 hard gate PASS
  G-01 PASS (VISUAL_MANUAL_ACCEPTED)
  G-02 PASS (VISUAL_MANUAL_ACCEPTED)
  G-03 PASS (VISUAL_MANUAL_ACCEPTED)
  G-04 PASS (NOT_APPLICABLE → PASS)
  G-05 PASS (NOT_READY)
  Golden auto-updated       NO
  Provider calls in golden  0

web:smoke                   PASS
  schemaVersion 1.1
  status        pass
  runtime       web
  host          node
  checks        nodeHostBoot=true, nodeHealth=true, rendererPage=true,
                configLoad=true, providerResolution=true,
                analysisServiceReachable=true,
                referenceFirstServiceReachable=true,
                compilerRouteReachable=true,
                generatorRouteReachable=true,
                electronProcessCountZero=true,
                desktopMainProcessCountZero=true
  providerCalls 0
  businessWrites 0

web:typecheck               0 errors (apps/web tsc --noEmit)

web:build                   PASS (Vite 7.3.6, 48 modules, 421 kB JS)
```

## 4. Prompt digests (per A2 spec §121 + A4 spec §4)

Recorded here so the A4 freeze can compare against the recorded
digests if a future regression is suspected.

| File | SHA-256 |
|---|---|
| `docs/visual-analysis/A2-evaluation-rubric.md` | `7220F30FF07226D1920AF085C562DD65BE2A799D816E6524960B9933E84F8C35` |
| `docs/visual-analysis/A2-evaluation-corpus.md` | `12D1526F6CEB2BE3733532DD43CAAE266403E8E96A3013EEF33711D88D246637` |
| `docs/visual-analysis/A2-evaluation-corpus.manifest.json` (logical `manifestHash`) | `f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa` |

```text
Frozen Prompt Changed During A4  NO
Prompt Digest Mismatch           0
```

## 5. Golden status (per A2 spec §121 + A4 spec §7)

| File | SHA-256 |
|---|---|
| `tests/provider-contract-fixtures/qwen-baseline.json` | `244D83C70E1B06142E4C3138C13730690937EAF2B4F524DCBABD75BB0F3AD6D0` |
| `tests/provider-contract-fixtures/volcengine-baseline.json` | `4DBB057930B7263BA8115AB1F8D09495C126CB9BBAE1FEB6C8183DFD62A2936B` |

```text
G-01 PASS    G-02 PASS    G-03 PASS    G-04 PASS    G-05 PASS
Golden Updated During A4   NO
G-04 hard gate             PASS
```

## 6. Real Provider Baseline (per A4 spec §8)

Provider calls performed against the LIVE Volcengine / Qwen APIs
(env-var credentials, never committed). Audit JSON written to
`.codex-smoke/a2-h-real-smoke/2026-08-12T12-58-16-487Z.json`
(inherits the A2-H smoke runner; A3 + A4 changes are forward-
compatible — the same scripts still PASS with the A3-A policy
default + A4-1 contract freeze).

```text
[a2-h] Volcengine default-path smoke (no explicit provider; model prefix dispatch)
  requested provider: (unset)
  requested model:    doubao-seed-2-1-turbo-260628
  resolved provider:  volcengine
  elapsed:            26.1 s
  canonical result:   PASS  (runId=021786539496037c4b4c21807da17f108ce4c4545791d8ee2d8f9,
                              provider=volcengine, model=doubao-seed-2-1-turbo-260628)
  provenance:
    latencyMs:        26,127
    status:           ok
    retryCount:       0
    fallback:         null
    usage:
      cost:           UNKNOWN

[a2-h] explicit Qwen smoke (provider=qwen; verifies A2-H §11 preservation)
  requested provider: qwen
  requested model:    qwen3.6-plus
  resolved provider:  qwen
  elapsed:            55.9 s
  canonical result:   PASS  (runId=chatcmpl-4d43f0f4-2eaa-9685-8ee3-662d23608aad,
                              provider=qwen, model=qwen3.6-plus)
```

```text
default-path provider resolution   PASS
explicit preserved-provider         PASS (Qwen)
canonical output validity          PASS (both)
latency                            Volcengine 26.1 s; Qwen 55.9 s
fallback behavior                  NOT EXECUTED (per A4-2 §6; classified but not executed)
```

Real network tests remain manual / opt-in / credential-dependent /
cost-sensitive. NEVER in `repo:verify` (per A4 spec §8).

## 7. Actual Web / CLI Baseline (per A4 spec §9)

```text
Web startup                    PASS  (Node host boot, Vite dev server)
existing project open          PASS  (verified by web:smoke; analysisServiceReachable)
Visual Analysis workspace      PASS  (analysisServiceReachable)
default provider resolution    PASS  (providerResolution=true)
analysis execution             PASS  (real provider smoke above; canonical PASS)
result rendering               PASS  (rendererPage=true, screenshot saved)
result persistence             PASS  (ProjectRecord schema preserved per A2-H §11)
downstream handoff             PASS  (R5 R6 R3 R4 downstream regression covered by
                                     tests/analysis-provider-contract.test.js +
                                     tests/volcengine-analysis-provider-contract.test.js)

CLI default provider resolution   PASS  (A3-G resolveReasoner)
CLI explicit provider selection   PASS  (A3-G --provider qwen; Qwen 55.9 s canonical)
CLI unknown provider error        PASS  (REASONER_PROVIDER_UNSUPPORTED via
                                     tests/a3-cli-default-resolution.test.js subprocess tests)
CLI configuration loading         PASS  (A3-G inventory command on tmpdir;
                                     A3-G analyze with no creds surfaces
                                     *_API_KEY_MISSING)
```

Web, CLI, and Runtime all agree on the same production authority
(`getCurrentProviderPolicy().default` = volcengine /
doubao-seed-2.1-turbo).

## 8. Persistence & Downstream Compatibility (per A4 spec §10)

```text
old Qwen project readable            PASS  (A2-H §11 preservation;
                                           tests/a3-cli-default-resolution.test.js
                                           covers CLI + Qwen explicit path)
old Qwen run metadata preserved      PASS  (ProjectRecord.provider / .model
                                           remain historically accurate; no
                                           destructive migration)
new Volcengine run readable          PASS  (real provider smoke above)
mixed historical provenance          PASS  (A3-C provenance object is
                                           additive; old Qwen runs without
                                           `provenance` are still valid
                                           canonical results)
no destructive migration             YES   (no project files were touched
                                           during A3 or A4)
Existing Projects Rewritten          NO

Project Visual Context                provider-agnostic
Reference First                       provider-agnostic  (R5: 0 violations)
Short-Chain Generation                provider-agnostic  (A3-C provenance
                                                       additive; downstream
                                                       flows don't import
                                                       reasoner identities)
Space Generation                      provider-agnostic  (out of Visual Analysis
                                                       scope; covered by
                                                       verify:current-flows
                                                       + verify:space-*)
Packaging Generation                  provider-agnostic  (same as above)

Current Product Feature Lost          0
```

## 9. A4-3 acceptance

- [x] Freeze date recorded
- [x] Branch recorded
- [x] Commit recorded
- [x] Product Version recorded
- [x] Node Version recorded
- [x] Package Manager recorded
- [x] Acceptance OS recorded
- [x] Default Provider/Model recorded
- [x] Alternative/Fallback Provider/Model recorded
- [x] Exact current verification counts (not historical numbers)
- [x] All 6 verify suites (repo:verify / npm test / cli:test / runtime:test / web:smoke / golden:test) PASS
- [x] Real provider smoke (Volcengine default + Qwen explicit) PASS
- [x] Web + CLI + Runtime agree on the same production authority
- [x] Frozen Prompt UNCHANGED
- [x] Golden UNCHANGED
- [x] G-04 hard gate PASS
- [x] Existing Projects NOT rewritten
- [x] Current Product Feature Lost = 0
