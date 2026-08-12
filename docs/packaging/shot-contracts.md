# P1-2 — Shot Contracts

**Phase:** Packaging V1 / P1 — Golden Baseline & Shot Contracts
**Date:** 2026-08-12
**Status:** `SHOT_CONTRACTS_FROZEN` (3 contracts, no more in V1)
**Spec:** Packaging V1 Revised Development Specification §P1 ("V1 只做三个 Shot Contracts"; "P1 不扩第四种 shot")
**Predecessor:** `jiuzhou-golden-baseline.md`

## 1. Purpose (per P1 spec)

Define the V1 Shot Contract set. V1 is **explicitly capped at 3
shot contracts**; adding a 4th is out of V1 scope and would
require a new P1.x / P4 re-evaluation cycle.

```text
V1 Shot Contract Set (3, frozen):
  1. PKG-HERO-SINGLE
  2. PKG-SERIES-GROUP
  3. PKG-GIFT-OPEN
```

## 2. Type definition (frozen)

`packages/image-generation-contracts/src/packaging-shot-contract.ts`
adds the canonical type:

```ts
export type PackagingShotContract =
  | 'PKG-HERO-SINGLE'
  | 'PKG-SERIES-GROUP'
  | 'PKG-GIFT-OPEN';

export const PACKAGING_SHOT_CONTRACTS: ReadonlyArray<PackagingShotContract> =
  Object.freeze(['PKG-HERO-SINGLE', 'PKG-SERIES-GROUP', 'PKG-GIFT-OPEN']);

export const PACKAGING_SHOT_CONTRACT_VERSION = '1.0.0' as const;

export function isPackagingShotContract(value: unknown): value is PackagingShotContract {
  return typeof value === 'string'
    && (PACKAGING_SHOT_CONTRACTS as ReadonlyArray<string>).includes(value);
}
```

`@masterpiece/image-generation-contracts/src/index.ts` re-exports
the three names. P2's Translation / Compiler consumes the type
through the existing `image-generation-contracts` path; no
parallel contract module.

## 3. PKG-HERO-SINGLE (single hero render)

| Field | Value |
|---|---|
| `id` | `PKG-HERO-SINGLE` |
| `displayName` | Hero Render (Single SKU) |
| `subtype` | `hero_single` |
| `count` | 1 |
| `aspectRatio` | `4:5` (portrait) preferred; `1:1` acceptable |
| `framing` | Three-quarter product view, packaging occupies ≥ 60% of frame, brand mark visible |
| `subject` | single SKU, closed-state (no open box), with at most 1 contextual prop |
| `lighting` | soft studio, single key + bounce, no harsh shadow |
| `referenceFidelity` | high — substrate texture, color ratio, structural edges must match the Locked Asset |

Source of truth: `tests/fixtures/packaging/jiuzhou/shot-contracts/hero.md`.

## 4. PKG-SERIES-GROUP (multi-SKU / series uniform display)

| Field | Value |
|---|---|
| `id` | `PKG-SERIES-GROUP` |
| `displayName` | Series Group Render (multi-SKU uniform display) |
| `subtype` | `series_group` |
| `count` | 3-5 SKUs in one frame |
| `aspectRatio` | `16:9` (landscape) preferred; `3:2` acceptable |
| `framing` | line-up composition, equal visual weight, all SKUs fully visible, brand mark once |
| `subject` | multiple SKUs of the same series, closed-state, all on the same substrate family, all sharing the same color baseline ratio |
| `lighting` | uniform across all SKUs; same key, same bounce |
| `seriesConsistency` | the 7-axis rubric's Series Consistency axis is REQUIRED for this shot |

Source of truth: `tests/fixtures/packaging/jiuzhou/shot-contracts/series.md`.

## 5. PKG-GIFT-OPEN (gift box open state / interior structure)

| Field | Value |
|---|---|
| `id` | `PKG-GIFT-OPEN` |
| `displayName` | Gift Box Open State (interior structure) |
| `subtype` | `gift_open` |
| `count` | 1 |
| `aspectRatio` | `4:3` (landscape) preferred; `3:2` acceptable |
| `framing` | open lid revealed, interior product / message / micro-detail visible, brand mark on lid |
| `subject` | single SKU in open-box state, lid lifted or removed, product or inner tray visible |
| `lighting` | reveals interior depth; key from above-front to enhance reveal; soft fill from inside the box if possible |
| `physicalLogic` | lid hinge / magnet / ribbon behavior must be physically plausible (no floating lid) |

Source of truth: `tests/fixtures/packaging/jiuzhou/shot-contracts/open.md`.

## 6. Dispatch rule (frozen)

The shot contract is set in the **task contract** as a
**contractVersion-scoped field**:

```ts
interface ImageGenerationTask {
  // ... existing fields (see P0 domain-schema) ...
  shotContract?: PackagingShotContract;  // NEW (P1, contractVersion 1.0.0)
  contractVersion?: '1.0.0';             // NEW (P1, marks the addition)
}
```

- If `shotContract` is set: the compiler uses it as the
  canonical shot identifier.
- If `shotContract` is NOT set: the compiler falls back to
  the existing `task.shot` (legacy dispatch; unchanged).
- Unknown `shotContract`: `GENERATION_TARGET_UNSUPPORTED`
  (per P0 Target Interface) — **fail closed**.

## 7. Out of V1 scope (intentionally not in the set)

| Candidate | Why not in V1 |
|---|---|
| `PKG-DETAIL-CLOSEUP` | 1 macro detail (texture / emboss / foil) — P4 / V2 follow-up; would need a new color range + new forbidden motifs |
| `PKG-LIFESTYLE-CONTEXT` | 1 product in lifestyle scene — requires Lifestyle Golden, not in Jiuzhou scope |
| `PKG-CROSS-BRAND-COMPARE` | 1 frame with 2+ brands — anti-Jiuzhou (Jiuzhou is single-brand discipline) |
| `PKG-MICRO-PATTERN-FABRIC` | textile-style pattern — V2 / V3 (requires new motif language) |

Per user direction "P1 不扩第四种 shot" — these are recorded for
**awareness only**; they are explicitly out of V1.

## 8. P1-2 acceptance

- [x] 3 Shot Contracts defined (PKG-HERO-SINGLE / SERIES / OPEN)
- [x] Type definition added (PackagingShotContract)
- [x] Frozen array + guard + version constant
- [x] Per-shot fixture text written (hero.md / series.md / open.md)
- [x] Dispatch rule (task.shotContract) defined
- [x] Out-of-V1 candidates recorded (awareness only)
- [x] Unknown shot contract → GENERATION_TARGET_UNSUPPORTED (fail closed)
