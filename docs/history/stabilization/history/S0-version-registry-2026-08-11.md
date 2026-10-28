# S0 Version Registry — 2026-08-11

> **HISTORICAL SNAPSHOT**
>
> 本文档记录 2026-08-11 S0 Repository Inventory 时的仓库状态，不代表当前
> 运行时、当前命名或当前 Authority。当前事实请参考：
>
> - `docs/repository/CURRENT_REPOSITORY_MAP.md`
> - `docs/repository/CURRENT_NAMESPACE_DICTIONARY.md`
> - `config/repository-contract/current-authorities.json`
> - `config/repository-contract/compatibility-registry.json`

Snapshot counts below are counts of classified implementation/version **instances in this registry**, not raw matching strings. One row has exactly one S0 status. Grouped baselines represent a coherent version family.

| ID | Path / instance | Family | Version | Runtime Use | Test Use | Status | Risk |
|---:|---|---|---|---|---|---|---|
| 01 | `/VERSION` + synchronized manifests | Product | 5.0.0-rc.1 | direct identity | gate | ACTIVE_RUNTIME | CRITICAL |
| 02 | Web renderer/RPC/main entry | Runtime | Web Primary | direct | web smoke | ACTIVE_RUNTIME | CRITICAL |
| 03 | `apps/desktop/.../vnext-service.ts` | Image Generation | vnext | direct Reference-First | extensive | ACTIVE_RUNTIME | CRITICAL |
| 04 | `MASTERPIECE_SPACE_COMPILER_MODE=r8_6_golden` | Space | R8.6 identity | default mode | golden gate | ACTIVE_RUNTIME | CRITICAL |
| 05 | `apps/cli/src/v5` | CLI/Analysis | v5 | dynamic from Web backend | yes | ACTIVE_DEPENDENCY | CRITICAL |
| 06 | `apps/cli/prompts/v5` | Prompt | v5 | filesystem-loaded analysis prompt | yes | ACTIVE_DEPENDENCY | CRITICAL |
| 07 | `packages/model-runtime/qwen-reasoner` | Provider | Qwen | analysis model calls | yes | ACTIVE_DEPENDENCY | CRITICAL |
| 08 | `packages/image-generation-runtime/src/vnext` orchestration | Compiler | vnext | Reference-First | yes | ACTIVE_DEPENDENCY | CRITICAL |
| 09 | `.../src/space/phase9b-*` | Space Compiler | Phase9B/R9+ | current Space prompt | yes | ACTIVE_DEPENDENCY | CRITICAL |
| 10 | `vnext_legacy` compiler branch | Compiler | vnext legacy | env-selectable fallback | yes | ACTIVE_DEPENDENCY | CRITICAL |
| 11 | Desktop + package reference resolvers/policies | Reference First | R10/R11 layers | direct | yes | ACTIVE_DEPENDENCY | CRITICAL |
| 12 | deliverable/task-builder compiler | Packaging | task 3.0 | direct Standard path | yes | ACTIVE_DEPENDENCY | HIGH |
| 13 | task/schema 1.0 and 2.0 compatibility | Schema | v1/v2 | migration/retry | yes | ACTIVE_DEPENDENCY | HIGH |
| 14 | `apps/cli/tests/v5` | CLI | v5 | none | current suite | TEST_DEPENDENCY | HIGH |
| 15 | `quality-baselines/r8.6` | Space Golden | R8.6 | read by gates/tests | current | TEST_DEPENDENCY | CRITICAL |
| 16 | `quality-baselines/r9*` | Space Baseline | R9 | no provider runtime | current parity | TEST_DEPENDENCY | HIGH |
| 17 | `quality-baselines/r10*` | Space Baseline | R10/R10.4.1 | evidence only | current tests | TEST_DEPENDENCY | HIGH |
| 18 | `quality-baselines/r11*` | Continuation | R11/R11.2 | evidence only | current tests | TEST_DEPENDENCY | HIGH |
| 19 | R2-B1..B4 tests/smoke | Reference First | R2 | behavior now active | current | TEST_DEPENDENCY | HIGH |
| 20 | `space-generator/v1-baseline` | Space Baseline | v1 | comparison assets | test-read | TEST_DEPENDENCY | HIGH |
| 21 | lab `visual-translation/v1` | Visual Lab | v1 | imported by lab v2 only | lab tests | TEST_DEPENDENCY | MEDIUM |
| 22 | lab `visual-translation/v2` | Visual Lab | v2 | isolated lab runner | lab tests | TEST_DEPENDENCY | MEDIUM |
| 23 | image-generation v1/vnext fixtures | Fixtures | v1/vnext | no direct production | compatibility tests | TEST_DEPENDENCY | HIGH |
| 24 | version-named Desktop real-provider runners wired in package scripts | Smoke | V18.1/V6 names | manual smoke | package script/manual | TEST_DEPENDENCY | HIGH |
| 25 | `docs/archive/v3.3` | Documentation | v3.3 | none | none found | HISTORICAL_REFERENCE | LOW |
| 26 | `docs/archive/v4.0` | Documentation | v4.0 | none | none found | HISTORICAL_REFERENCE | LOW |
| 27 | `space-generator/archaeology` | Space docs | R8.4 evidence | none | none found | HISTORICAL_REFERENCE | LOW |
| 28 | versioned `evaluation/reports/*` | Evaluation | mixed | production boundary forbids | evidence only | HISTORICAL_REFERENCE | MEDIUM |
| 30 | CLI v5 vs space v1 exact prompt copies | Prompt | mixed | one side active | baseline tests | DUPLICATE_CANDIDATE | CRITICAL |
| 31 | exact duplicate baseline prompts/traces/payloads | Evidence | R8–R11 | none | some current | DUPLICATE_CANDIDATE | HIGH |
| 32 | `apps/desktop/scripts/space-r10-archive` | Manual tooling | R10/R11 | no active import found | no package entry found | UNKNOWN | HIGH |
| 33 | `history/reviews` and local ignored history content | Repository local | unknown | none found | none found | UNKNOWN | MEDIUM |
| 34 | ignored `assets/`, `.packet/`, tool directories | Local workspace | unknown | path-based use not proven | unknown | UNKNOWN | MEDIUM |

## Registry metrics

| Status | Count |
|---|---:|
| ACTIVE_RUNTIME | 4 |
| ACTIVE_DEPENDENCY | 9 |
| TEST_DEPENDENCY | 12 |
| HISTORICAL_REFERENCE | 4 |
| SUPERSEDED_CANDIDATE | 0 |
| DUPLICATE_CANDIDATE | 2 |
| ARCHIVE_CANDIDATE | 0 |
| UNKNOWN | 3 |

No entry is classified `SAFE_TO_DELETE`; that status is forbidden in S0.
