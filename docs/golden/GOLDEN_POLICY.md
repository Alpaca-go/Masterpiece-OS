# Golden Regression Policy

## Purpose

Golden Regression protects the accepted behavior anchored at `masterpiece-reference-first-stable-2026-08`. It is evidence for future repository restructuring, not a mechanism for improving prompts, compilers, providers, or generated images.

## Comparison levels

- `EXACT`: schemas, routes, modes, provider/model IDs, reference counts, required fields.
- `STRUCTURAL`: prompt sections, order, payload shape, lineage and decision-packet shape.
- `SEMANTIC`: required and forbidden meanings in natural-language output.
- `VISUAL_MANUAL`: known-good images and a human acceptance checklist; never pixel comparison.

Natural-language analysis is not compared byte for byte. Generated images are not pixel-diffed. The default runner uses deterministic public interfaces and recorded evidence only; it makes no real Provider calls.

## Immutability

Golden expected files cannot be automatically updated. The runner rejects update-Golden flags, and a mismatch fails with the assertion's expected/actual evidence. A failure must first be classified as a regression or an intentional behavior change.

An intentional update requires a proposal, implementation evidence, human acceptance, explicit expected-file changes, and a `golden/CHANGELOG.md` entry. Tests must never rewrite `golden/**`.

## Baseline and gates

The recovery tag is the behavior source of truth. G-01, G-02, and G-03 are P0 restructuring gates. S3 is not ready unless they pass, Web smoke passes, and the production baseline is clean.

The only frozen-manifest file touched by S2 is root `package.json`, solely to add the required `golden:test` command. `scripts/golden/check-s2-baseline-drift.mjs` compares every other frozen file exactly and compares `package.json` after removing only that sanctioned test hook. It does not modify the S1.1 manifest, baseline commit, tag, or legacy drift detector.

## Visual review

Manual review checks composition, material, color, lighting, functional scene accuracy, brand fidelity, reference alignment, and source-scene leakage where applicable. Visual evidence remains at its original accepted path; S2 does not duplicate or delete it.
