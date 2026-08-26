# Script directory guide

Files in this directory are current executable utilities. A historical phase
label is not used as a filename unless it is a genuine compatibility or Golden
baseline identifier.

## Release-chain scripts

The semantic `verify-*.mjs` scripts are invoked by `npm run repo:verify` or one
of its child commands. They are part of repository validation and must not be
deleted merely because their internal failure codes retain historical labels.

The Space Golden boundary script has a semantic filename. Registered baseline
identifiers remain inside its validation data where compatibility requires them.

## Manual current diagnostics

`probe-analysis-provider-health.mjs` is an opt-in provider connectivity check.
It is not called by production or CI, but remains useful for current support.

## Retired workflow utilities

One-off A2, G01 and G02 evaluation/qualification scripts were moved to
`local-archive/versioned-workflow/scripts/`. The root `.gitignore` excludes that
local archive. Production, tests and deterministic verification must never read
from it.

Historical Creative Intelligence qualification harnesses, reports, obsolete
tests, the retired document-directions lab and unused Space evidence live under
the same ignored `local-archive/versioned-workflow/` root.
