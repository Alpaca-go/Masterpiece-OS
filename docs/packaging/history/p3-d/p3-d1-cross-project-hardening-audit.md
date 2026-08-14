# P3-D1 — Cross-Project Production Validation Matrix & Hardening Audit

Date: 2026-08-14  
Branch: `codex/visual-analysis-a1-multi-provider`  
Starting HEAD / P3-C freeze: `3da7a14424074b85d5fd3a735d006749cd5f03a9`  
Change class: audit, validation contract and deterministic guards only  
Production changes: **0**  
Real Provider validation: **NOT YET AUTHORIZED**

## 1. P3-D objective

P3-D validates that the frozen Packaging Generator generalizes beyond its acceptance fixture. It does not create a new architecture. D1 defines the corpus, coverage matrices, quality rubric, failure taxonomy, STOP conditions, cost boundary and D2 execution scope. It does not repair a discovered production issue.

## 2. Frozen baselines consumed

| Surface | Frozen record |
|---|---|
| P2 Packaging semantics and geometry | `a593278b55e437fac59d768c5cee734d9a9fc201` |
| P3-A Workspace and stale authority | `f95c145b9b1e37430ac68315c9e039f1f3262ae4` |
| P3-B accepted UI semantics | `2ac4cf1cc18156d1e4a508382b4563298d69c014` |
| P3-C production integration baseline | `456ec3a9d0273b599ed15bcd424fde1f36b8ce1b` |
| P3-C final freeze | `3da7a14424074b85d5fd3a735d006749cd5f03a9` |

`PackagingTranslationV2`, the two Project Visual Context slots, explicit active Reference authority, producer fingerprint ownership, `generationMode`, the canonical selector/projector, Locked Assets, Shot Contracts, stale tracking, run store and artifact lifecycle remain frozen.

## 3. Real-project corpus

The local project environment was inspected read-only. Names and IDs below are existing user-owned project records, not repository fixtures. No project content is committed and no project-specific value enters production code.

| Project | Project ID | Recorded category | Assets | Visual Analysis | Packaging translations | Active Reference | Locked Assets | Safe use in D2 |
|---|---|---|---:|---|---|---|---|---|
| 一剂良方 | `a13d6c09-99f7-4ff9-b499-3b9f8a1df31b` | Pending confirmation | 35 ready images | Context `2.0`, v1, source refs 34 | None | None | legacy `mustPreserve` only; no canonical store | Read-only audit now; copied/sanctioned run only after upstream rebuild |
| 九州美学 | `590eadf2-76cb-4042-a034-db93481b06c9` | Pending confirmation | 28 ready images | Context `2.0`, v11, source refs 28 | None | None | legacy `mustPreserve` only; no canonical store | Read-only audit now; copied/sanctioned run only after upstream rebuild |
| 冯烫烫 | `dca9b7d4-f233-46ff-b4df-44a890f13c4f` | Pending confirmation | 10 ready images | Context `2.0`, v5; project status cancelled | None | None | legacy `mustPreserve` only; no canonical store | Read-only audit only until status and upstream truth are re-established |

Real Project count: **3**. End-to-end Packaging-ready real project count: **0**.

The repository must not infer industry, product, structure or brand type from the names or filenames. Those fields remain `UNCONFIRMED`. All three projects predate the P3-A11 translation slots, so D1 does not represent them as successful Packaging validations. This is a `D-TRANSLATION` corpus-readiness gap owned by the upstream Project Visual Context production flow, not permission for Packaging to synthesize or fall back.

## 4. Sanctioned synthetic validation corpus

Synthetic cases are explicit technical fixtures. They are not called real projects and cannot supply visual-quality evidence.

| ID | Archetype | Structure | Locked truth | Translation richness | Modes | Primary shot evidence |
|---|---|---|---|---|---|---|
| SYN-D1-01 | botanical serum | single bottle/container | complete | rich both-slot | both | HERO; existing AL lifecycle evidence |
| SYN-D1-02 | premium folding carton | carton/box | partial but valid | minimal analysis-led | analysis-led | HERO planned |
| SYN-D1-03 | presentation set | open gift box with tray | complete | rich reference-first only | reference-first | GIFT-OPEN planned |
| SYN-D1-04 | three-SKU family | grouped/series | complete | rich both-slot | both | SERIES-GROUP planned |
| SYN-D1-05 | flexible refill pouch | bag/pouch | missing required truth | minimal | both attempted | fail-closed / compatibility audit |

Only SYN-D1-01 has completed the full sanctioned-local lifecycle in P3-C. SYN-D1-02–05 are D2 matrix definitions, not completed results.

## 5. Project diversity matrix

| Dimension | Real corpus evidence | Synthetic completion | D1 conclusion |
|---|---|---|---|
| Brand language | Three distinct real visual source sets | restrained botanical, carton, gift, series, pouch | Real diversity exists; semantic labels require upstream confirmation |
| Product category | Unconfirmed in all real records | five explicit validation archetypes | Must not infer from filenames |
| Structure | Unconfirmed in real contexts | container, carton, gift/open, series, pouch | Adequate planned structural diversity |
| Locked completeness | legacy partial only | complete, partial-valid, missing | Required matrix covered by plan |
| Translation richness | no Packaging translation | minimal/rich, optional absent/present | Required matrix covered by plan |
| Reference availability | image candidates exist; no active authority | none/one/multiple and independent reference-first | Required matrix covered by plan |

## 6. Packaging structure matrix

`SUPPORTED` means the frozen contract/runtime has direct technical evidence. `UNTESTED` means no incompatibility is asserted, but D2 evidence is required. `UNSUPPORTED` means a current contract explicitly rejects the case.

| Structure | Status | Evidence / boundary |
|---|---|---|
| single container / bottle / jar | SUPPORTED | SYN-D1-01 passed full local lifecycle; HERO contract proves one primary package |
| carton / box | UNTESTED | Generic structure strings are accepted; no distinct real-project lifecycle evidence |
| gift box / open-box | SUPPORTED CONTRACT / UNTESTED PROJECT | `PKG-GIFT-OPEN` formally requires outer/inner/tray/opening logic; D2 must validate an applicable project |
| series / grouped packaging | SUPPORTED CONTRACT / UNTESTED PROJECT | `PKG-SERIES-GROUP` formally requires multiple differentiated family SKUs |
| bag / pouch | UNTESTED | No dedicated prohibition or dedicated structure semantic; do not claim support without evidence |
| new structure semantics | UNSUPPORTED / DEFERRED | Requires a separately authorized feature if current generic translation cannot represent it |

## 7. Shot Contract matrix

| Contract | Ratio | Applicable when | Prepare | Execute | Visual plausibility | Structure compatibility |
|---|---|---|---|---|---|---|
| `PKG-HERO-SINGLE` | `4:5` | one primary closed/resting package | Proven for SYN-D1-01 | Proven locally for SYN-D1-01 | Requires real image | Bottle/container proven; others D2 |
| `PKG-SERIES-GROUP` | `16:9` | multiple differentiated SKUs in one family | D2 required | D2 required | Requires real image | Only series/group cases |
| `PKG-GIFT-OPEN` | `4:3` | open outer/inner/tray hierarchy | D2 required | D2 required | Requires real image | Only physically plausible open structures |

Inapplicable shots are `NOT APPLICABLE`, never silent success. A shot's existence does not make it applicable to every project.

## 8. Generation mode matrix

| Corpus class | Mode | Upstream context | Prepare/execute/artifact/preview | STALE/re-Prepare | Quality |
|---|---|---|---|---|---|
| Current real projects (3) | analysis-led | Missing `analysisLed` slot | Expected fail-closed; D2 must rebuild upstream first | Not applicable yet | Not scored |
| Current real projects (3) | reference-first | Missing slot and active authority | Expected fail-closed; no analysis fallback | Not applicable yet | Not scored |
| SYN-D1-01 | analysis-led | Available | Full local lifecycle PASS | PASS | Local executor cannot score quality |
| SYN-D1-01 | reference-first | Available independently | Full local lifecycle PASS | PASS | Local executor cannot score quality |
| SYN-D1-02–05 | both as applicable | Explicit fixture truth | D2 required | D2 required | Not scored |

Reference-first must work with the analysis slot absent. Mode switching must retain the old result as stale evidence and require explicit re-Prepare.

## 9. Reference coverage matrix

| Coverage | Expected behavior | D2 evidence |
|---|---|---|
| 0 references, analysis-led | Legal; no implicit insertion | Required |
| 0 references, reference-first | `REFERENCE_REQUIRED` fail-closed | Required |
| 1 reference | Legal when role and provider support are valid | Product identity, style and structure cases required |
| multiple references | Legal within effective Provider limit; duplicate asset IDs fail | 2, 6 and boundary-count cases required |
| over Provider limit | Provider-capability failure before network call | Required after cap authority is reconciled |

Canonical roles remain: `high_fidelity_visual_reference`, `structure_reference`, `material_reference`, `composition_reference`, `style_reference`, `product_identity_reference`. No D1 role mutation is authorized.

## 10. Locked Assets matrix

| Case | Expected result | Evidence status |
|---|---|---|
| complete Locked Assets | Proceed; identical across modes | Existing AL evidence; repeat cross-project in D2 |
| partial but valid | Proceed without invented fields | D2 required |
| missing required locked truth | Fail closed with actionable safe error | D2 required; current real corpus exposes readiness gap |
| upstream visual conflicts with locked truth | Locked truth wins or preparation fails | D2 required |
| Reference conflicts with locked truth | Locked truth wins; no Reference override | D2 required |

## 11. Visual-context richness matrix

| Richness | Required case | Rule |
|---|---|---|
| minimal valid | required | Every required `PackagingTranslationV2` field valid; optional arrays may be empty |
| rich analysis-led | required | Multiple structures/material/color/photography/evidence entries |
| rich reference-first | required | Independent producer source and active fingerprint authority |
| optional absent | required | No fallback or synthetic defaults beyond existing contract |
| optional present | required | Preserved without raw upstream object leakage into run records |

## 12. Model matrix

| Registry identity | Provider | Protocol | Packaging capability | References | Geometry | Current Packaging testability |
|---|---|---|---|---|---|---|
| `qwen3.6-plus` | DashScope-compatible analysis | `openai-chat-multimodal` | No; analysis only | Analysis multimodal only | N/A | Upstream analysis, not Packaging generation |
| `gpt-image-2` | OpenAI | `openai-image-generation` | No (`space/product/poster`) | Adapter max 16 | universal adapter ratios include all 3 Packaging ratios | Ineligible at Packaging capability gate |
| `nano-banana` | Google | `google-gemini-image` | No | Adapter max 10 | universal adapter ratios include all 3 | Ineligible at Packaging capability gate |
| `seedream-5.0-pro` | Volcengine | `seedream-image` | **Yes** | Registry says supported; adapter max 10 | `4:5`, `16:9`, `4:3` accepted | Current production Packaging model; offline local executor available |
| `wan2.7-image-pro` | DashScope | `dashscope-wan-image` | No; legacy disabled | Adapter-specific capability | Not a current Packaging authority | Ineligible / legacy-compatible |

Hardening finding `D-PROVIDER-01`: the Packaging capability resolver treats an absent Registry `maxReferenceImages` as unbounded, while the Seedream adapter enforces 10. Owner: Model Registry + Packaging Provider Capability boundary. D2 must prove a single effective cap and fail before execution; D1 does not modify it.

## 13. Provider / API Profile matrix

| Profile class | Identity/vendor/protocol | Packaging eligible | Offline | Paid smoke |
|---|---|---|---|---|
| configured production image profile | Registry `seedream-5.0-pro`; Volcengine; `seedream-image`; actual model `doubao-seedream-5-0-pro-260628` | Yes | Shape/gates only | Yes, separately authorized |
| sanctioned local profile | Registry `seedream-5.0-pro`; loopback executor; `seedream-image` | Yes for architecture | Yes | No |
| configured analysis profiles | Qwen or Volcengine analysis; multimodal chat | No generation | Analysis tests only | Separate analysis policy |
| configured unregistered image profile | Seedream Lite subscription; `openai-image-generation`; no Registry identity/capabilities | No current Packaging eligibility | Profile validation only | Not until registered/authorized |

Model Registry identity, vendor, protocol, API Profile ID and actual provider model are separate fields. No secret or credential value is recorded here.

## 14. Real-provider policy

The repository has a formal user-authorized three-run release procedure in `docs/releases/5.0-repository-consolidation.md §7.3`, but it is not a standing authorization for P3-D.

**REAL PROVIDER VALIDATION: NOT YET AUTHORIZED.**

For a future P3-D authorization: use environment-backed credentials only; one eligible Seedream profile/model; maximum 5 Packaging calls, one image per call, zero random retries, no secondary model exploration; record terminal status, call count, duration, run/artifact/preview paths and composition result without secrets/raw responses. Store outputs only under ignored runtime/project locations and review privacy before using any real asset.

## 15. Visual-quality rubric

Score only real generated images, never local-executor placeholders. Each applicable dimension uses `0–3`: `0` absent/unsafe, `1` major defect, `2` acceptable with bounded issues, `3` production-ready.

1. Brand fidelity.
2. Locked Asset fidelity.
3. Structure fidelity.
4. Reference fidelity (reference-first).
5. Visual-direction fidelity (analysis-led).
6. Material plausibility.
7. Packaging realism.
8. Composition / Shot Contract compliance.
9. Text/logo hallucination risk (reverse scored: 3 means no harmful hallucination).
10. Series consistency where applicable.
11. Artifact usability.

A sample passes only when every applicable dimension is at least 2, Locked Asset/structure/shot/artifact dimensions are at least 2, and there is no identity-changing logo/text hallucination. Scores require image path, run ID, mode, shot, reviewer note and visible evidence. D1 assigns **no scores**.

## 16. Failure taxonomy

| Code | Meaning | Primary owner |
|---|---|---|
| `D-RUNTIME` | lifecycle/orchestration/state failure | Shared Runtime / Packaging operations |
| `D-TRANSLATION` | missing or invalid upstream context | Project Visual Context producer |
| `D-STRUCTURE` | structure not representable or visually mismatched | Translation/compiler; feature review if new semantic |
| `D-REFERENCE` | role, source or fidelity failure | P2 Reference Policy / upstream Reference authority |
| `D-LOCKED` | missing/overridden locked truth | Locked Assets owner |
| `D-SHOT` | inapplicable or violated Shot Contract | P2 Shot Contract owner |
| `D-PROVIDER` | profile/model/capability/payload issue | Model Registry / provider adapter |
| `D-QUALITY` | image exists but quality threshold fails | quality evaluation, not architecture |
| `D-ARTIFACT` | run registration, persistence or preview failure | canonical run/artifact owner |
| `D-UX` | unsafe, inaccessible or unusable workspace behavior | Web Renderer |

Severity: P0 data/security/cross-project leakage; P1 required flow blocked or frozen authority violated; P2 recoverable robustness/usability; P3 observation/deferred optimization.

## 17. Hardening versus new feature

`BUG / HARDENING`: generic crash, normalization defect, cross-layer capability mismatch, unsafe error, incorrect isolation, run collision, stale corruption, or generic fail-closed gap.

`NEW FEATURE / DEFERRED`: new Shot Contract, custom aspect ratio, automatic Reference assignment, new structure semantic, batch generation, History UI, automatic real-project migration, or provider/model expansion. No brand/project/filename special case is permitted.

## 18. Cross-project isolation cases

For projects A and B, D2 must prove:

1. A Locked Assets never appear in B truth or prompt.
2. A translation/fingerprint cannot satisfy B selection.
3. A active Reference source is rejected for B.
4. A run cannot be listed/read through B's run store.
5. A artifact/preview cannot be resolved through B.
6. Open A → READY/EXECUTED → open B creates/resolves a B-bound session with no retained A truth, run or Reference.

Any cross-project truth or artifact leakage is P0 and stops D2.

## 19. Repeated execution and reasonable stress plan

- Same session: Prepare once, Execute three sequential runs; unique run IDs and no overwrite.
- Same session: change intent → STALE → blocked Execute → re-Prepare → Execute, repeated twice.
- Two sessions for one project where supported: independent prepared snapshots and runs.
- Three projects sequentially: two applicable modes each, no session/truth/run crossover.
- Reference counts: 0, 1, 2, 6, effective limit, and limit+1.
- Asset names: long Unicode filenames; identity remains asset ID, not filename.
- Payloads: minimal valid and rich translation.
- No parallel/concurrency stress beyond the current product design.

Technical threshold: 3 sequential executions per applicable stress case, zero collision/overwrite/leak, zero unhandled rejection, deterministic stale reasons.

## 20. Real-image evidence plan

After real-project translations and structures are canonically rebuilt, select the smallest high-value set:

1. Most complete real project — analysis-led HERO.
2. Same project — independent reference-first HERO.
3. Structurally different real project — analysis-led applicable canonical shot.
4. Same second project — reference-first applicable canonical shot.
5. Third real project — one structure-distinct applicable shot.

Maximum 5 calls/images, one production Packaging model/profile, zero random retries. If SERIES or GIFT-OPEN is not actually applicable, mark it unsupported for that project and cover its architecture with sanctioned local validation; do not force an invalid paid call.

## 21. Provider cost-control plan

- Estimated authorized Packaging call count: at most 5.
- Images per call: 1.
- Models: 1.
- Profiles: 1.
- Automatic/random retries: 0.
- Re-run after a deterministic preflight failure: 0.
- Monetary estimate: not stated; the repository has no pricing authority in this audit.

## 22. P3-D exit threshold

| Tier | Exit threshold |
|---|---|
| 1 Architecture | 100% frozen guards and authority diffs pass |
| 2 Runtime | 100% required applicable Prepare/Execute/artifact/preview/stale cases pass; unsupported cases explicit |
| 3 Cross-project | 100% truth/reference/run/artifact isolation; zero P0/P1 blocker |
| 4 Visual quality | Every authorized real-image sample satisfies the rubric; local executor evidence is excluded |
| 5 UX | Required desktop/mobile identity, Locked Assets, picker, READY/EXECUTED/STALE/gallery/error checks pass |

Additionally: zero project-specific production rules, zero critical run/artifact failure, no silent unsupported success, Golden remains unchanged, and all repository regressions pass.

## 23. Canonical STOP-P3-D

1. `STOP-P3-D-01` — Hardening introduces a project-, brand-, projectId- or filename-specific production rule.
2. `STOP-P3-D-02` — Hardening weakens or bypasses Locked Assets authority.
3. `STOP-P3-D-03` — Hardening weakens or duplicates P2 Shot Contract/geometry authority.
4. `STOP-P3-D-04` — Hardening changes or duplicates P3-A state/stale authority.
5. `STOP-P3-D-05` — Hardening changes or bypasses P3-C canonical source selection/fingerprint authority.
6. `STOP-P3-D-06` — Cross-project truth, translation or active Reference leakage is observed.
7. `STOP-P3-D-07` — Cross-project run, artifact or preview leakage is observed.
8. `STOP-P3-D-08` — An inapplicable/unsupported case is silently reported as success.
9. `STOP-P3-D-09` — Golden/digest auto-update is used to hide regression.
10. `STOP-P3-D-10` — A real Provider call occurs without explicit user authorization and bounded scope.
11. `STOP-P3-D-11` — Hardening expands into an uncontrolled feature, provider, structure or workflow programme.
12. `STOP-P3-D-12` — Space, Visual Analysis, Current Flows or repository contract regresses.

## 24. AN guards

AN is a deterministic contract layer and never reads local user projects or credentials.

- AN-01 distinguishes real audit evidence from sanctioned synthetic cases.
- AN-02 preserves the project-specific-rule guard.
- AN-03 validates project truth isolation contract evidence.
- AN-04 validates active Reference project binding.
- AN-05 validates run/artifact project binding.
- AN-06 requires all three canonical Shot Contracts and ratios.
- AN-07 requires both generation modes and reference-first independence.
- AN-08 requires complete/partial/missing/conflicting Locked Asset cases.
- AN-09 requires the visual-quality rubric and prohibits D1 scoring.
- AN-10 requires explicit real-Provider authorization policy and call cap.
- AN-11 separates Golden regression from real-project visual quality.
- AN-12 defines hardening versus new-feature classification.
- AN-13–16 require P2/P3-A/P3-B/P3-C frozen diffs to remain zero.

## 25. D2 implementation / validation scope

Recommended P3-D2 scope, in order:

1. Use sanctioned, non-committed copies of the three real projects; do not mutate user originals.
2. Rebuild/produce canonical `analysisLed` and, where legitimately available, `referenceFirst` translations through the existing upstream flow. Do not hand-inject or add Packaging fallback.
3. Confirm product category and structure from upstream evidence; mark unavailable cases honestly.
4. Execute SYN-D1-01–05 with the sanctioned local executor across all applicable modes/shots/Locked/reference cases.
5. Execute project-switch, truth/reference/run/artifact isolation and repeated-run tests.
6. Audit and, only if authorized as generic hardening, reconcile Registry versus adapter Reference count authority (`D-PROVIDER-01`).
7. Run real Renderer desktop/mobile checks on representative states.
8. Request separate authorization for the bounded five-image real-provider set; only then score quality.

Do not start custom ratio, new Shot Contracts, auto-assignment, new structure semantics, batch generation, History UI or provider expansion.

## 26. D1 decision

The audit contract is complete. It exposes two material D2 inputs rather than hiding them:

- `D-TRANSLATION`: 3 real projects exist, but 0 are currently Packaging-ready because all lack canonical translation slots/Reference authority.
- `D-PROVIDER-01`: Registry and Seedream adapter do not presently expose one consistent Reference limit before execution.

These are assigned, bounded and testable in D2. They do not require a D1 production change.

**PASS — P3-D2 READY**

This is a Hardening Validation Baseline / Audit Record, not a P3-D production baseline. P3-D2 is not started by this document.
