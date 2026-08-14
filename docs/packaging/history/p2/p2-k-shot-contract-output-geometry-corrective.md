# P2-K — Shot Contract Output Geometry Corrective Reopen

**Date:** 2026-08-14
**Status:** `P2_RE_FROZEN`
**Corrective production baseline:** `a593278b55e437fac59d768c5cee734d9a9fc201`
**Original P2 frozen baseline:** `335405342951fedae5d4d6816444c2b4d2402787`

## Outcome

P2 was reopened only to repair the missing output-geometry authority. The
three canonical Shot Contracts now own the output aspect ratio:

| Shot Contract | Canonical `aspectRatio` |
|---|---:|
| `PKG-HERO-SINGLE` | `4:5` |
| `PKG-SERIES-GROUP` | `16:9` |
| `PKG-GIFT-OPEN` | `4:3` |

`contracts.js` is the sole production authority. Translation copies this
field into `translation.shotContract`; the validator requires
`providerHints.aspectRatio` to match it exactly; the compiler exposes the
canonical value in the Shot Contract block. No caller default, Reference
inference, Golden fixture, or second shot-to-ratio table is permitted.

## Corrected production boundary

- `packages/image-generation-runtime/src/packaging/contracts.js`
  owns the three values and includes them in its fingerprint.
- `packages/image-generation-runtime/src/packaging/translation.js`
  projects the contract value without accepting caller authorship.
- `packages/image-generation-runtime/src/packaging/validation.js`
  fails closed for missing Shot geometry, missing provider geometry, or a
  provider/Shot mismatch.
- `packages/image-generation-runtime/src/packaging/compiler.js`
  renders the canonical value for downstream traceability.

The P2 version constants remain at `1.0.0`: P2-K completes the already
frozen P1 Shot Contract meaning rather than introducing a new contract
family or compatibility surface.

## Verification

| Gate | Result |
|---|---:|
| Focused P2 geometry and packaging tests | PASS — 288/288 |
| `npm run test:image-generation` | PASS — 981/981 |
| `npm test` | PASS — 1233/1233 |
| `npm run verify:space-compiler-baseline` | PASS |
| `npm run verify:space-r8.6-golden-boundary` | PASS |
| `npm run web:typecheck` | PASS |
| `npm run web-runtime:typecheck` | PASS |
| `npm run web:build` | PASS |
| `npm run web:smoke` | PASS — provider calls 0, business writes 0 |
| `git diff --check` | PASS |

`npm run runtime-application:test` and therefore `npm run repo:verify`
remain at the expected downstream P3 HOLD: the pre-P3-A11 adapter
still supplies `1:1`, and historical P3 guards still compare P2 to the
original `3354053` baseline. Those failures are the handoff into P3-A11;
they must not be hidden by weakening P2 validation or silently changing the
P3 production adapter during P2-K.

## Freeze and handoff

P2 is RE-FROZEN at `a593278b55e437fac59d768c5cee734d9a9fc201`.

The next authorized phase is P3-A11. It must project the P2-owned
`structure`, `visualDirection`, and `aspectRatio`, then re-establish READY
and re-freeze P3-A. P3-B6.3 and P3-C remain locked until that sequence is
completed.
