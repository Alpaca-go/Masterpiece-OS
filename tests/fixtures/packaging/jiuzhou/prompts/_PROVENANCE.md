# Jiuzhou Golden Prompts — Provenance

**Status:** `P1_FROZEN` (per Packaging V1 spec §P1 / §20.2)
**Frozen at:** Packaging P1 Delta (D1)
**Scope:** `tests/fixtures/packaging/jiuzhou/prompts/`

## What this directory is

Manually authored **Golden Benchmark Prompts** for the three
V1 Packaging Shot Contracts. Each `.md` file is a complete
benchmark record: metadata, reference role, visual constraints
(color / motif / forbidden), and the actual prompt text sent
to the image model.

These prompts are the **Gold Standard for visual quality and
direction fidelity** (per V1 spec §20.2):

> "Golden Prompt is not intended to become the production
> runtime forever. Its purpose is to define the minimum
> expected visual quality and direction fidelity."

## What this directory is NOT

- **NOT** a production runtime input. Production code MUST NOT
  import any file in this directory. The Golden-vs-Production
  boundary (see `docs/packaging/golden-vs-production-boundary.md`)
  is enforced by `scripts/verify-packaging-golden-boundary.mjs`
  (G-PKG-GOLDEN-BOUNDARY-01, planned for P3) and the offline
  guard in `tests/image-generation/packaging-golden-manifest.test.js`
  (P1 / C4, already active).

- **NOT** a "production prompt template" that the Packaging
  Compiler should emit. The Compiler must produce its own
  compiled prompt; the Golden Prompt is the comparison
  benchmark, never the source.

- **NOT** a generic Packaging brand default. The Jiuzhou
  visual rules recorded in these prompts (pearl-white 65-70%,
  mineral purple 20-25%, graphite 5-10%, 5 abstract peacock
  components, 3 explicit fails) **must not** be hard-coded
  into the production Translation / Compiler / Validator.
  Per the V1 spec boundary rule, Golden Project Rules
  ≠ Packaging Production Rules.

## What each file records

Each Golden Prompt `.md` file has:

- **YAML front-matter** with `goldenPromptId`, `version`,
  `shotContract`, `generationMode`, `goldenProject`, `language`.
- **Reference role** declaration (style / material / composition
  / structure / product).
- **Visual constraints** (color baseline, motif language,
  forbidden outcomes — referencing the shared Jiuzhou baseline
  docs in the parent directory).
- **Prompt body** — the actual prompt text. This is what the
  benchmark call sends to the image model.
- **Comparison protocol** — the developer-time check
  (per V1 spec §32): compare compiler output to this Golden
  Prompt output, record failure category, accept or reject
  the compiler change.

## Authoring rules

- All 3 prompts are **Reference-First** (per V1 spec §7.2).
  Reference-First is the primary quality path; Analysis-led
  is required to be functional but not required to outperform
  Reference-First (V1 spec §7.1).
- The prompt body is in **English** (image-model convention).
  Chinese rationale is recorded in the file's `notes` block
  for human reviewers.
- Each prompt is **single-mode** (one Golden Anchor set, one
  output). Multi-anchor prompts are an explicit V1 non-goal
  (V1 spec §1 / §44).
- Forbidden outcomes (3) are recorded inline AND asserted by
  the acceptance rubric (V1 spec §31 / `acceptance-rubric.json`).
  They are also `PACKAGING_AUTO_FAIL_CODES` (F01 / F02 / F11).

## File layout

```text
tests/fixtures/packaging/jiuzhou/prompts/
├── _PROVENANCE.md         this file
├── hero.md                PKG-HERO-SINGLE Golden Prompt
├── series.md              PKG-SERIES-GROUP Golden Prompt
└── open.md                PKG-GIFT-OPEN Golden Prompt
```

Every file is recorded in
`tests/fixtures/packaging/jiuzhou/manifest.json` with its
SHA-256. Drift fails `packaging-golden-manifest.test.js`.

## What is NOT in this directory (deferred to other phases)

| Item | Phase |
|---|---|
| Golden Prompts for other shot types (4th, 5th, ...) | V1 explicitly caps at 3; any 4th is P4+ |
| Multi-anchor Golden Prompts (one prompt, several reference images) | V1 non-goal; V2+ |
| Analysis-led Golden Prompts (one per shot) | Deferred — Reference-First is the primary quality path |
| Production compiler Golden Prompts (the Compiler's own output, used as ground truth) | N/A — Compiler's output is compared AGAINST this directory, not stored here |
