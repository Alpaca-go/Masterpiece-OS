# Independent visual workflow

User-authorized extraction: 2026-10-16. This change isolates the existing
material import → visual analysis → report → standard image generation flow
inside the existing application. It does **not** restore or approve a historical
image-quality baseline. Quality repair/acceptance is explicitly subsequent work.

## Ownership and allowed sharing

`packages/visual-workflow/src/service.js` is the sole composition authority.
The source implementations and analysis prompts were extracted once into this
bounded capability, including decision repair, context/report compilation,
generation templates, spatial rules, model request adapters and validation.
`extraction-provenance.json` records the source lineage. The previous domains
retain their implementations; there are no forwarding exports or live imports
between them and this feature. This intentional domain split is authorized by
the user's explicit requirement that the business implementations cannot be
shared. It is not a versioned replacement/backup for the old global authority.

Only the existing Node transport/operation registry, browser shell, filesystem,
React and pinned image codec infrastructure are shared. The private workflow
instance is not passed to the general operation graph. Its API is the explicit
`visual-workflow:*` namespace. Planning/migration imports and direct channel
calls are rejected by `verify:visual-workflow-isolation`.

## Data and settings

The feature owns `<userData>/visual-workflow/settings.json`, independently
encrypted credentials and `data/projects/<id>/`. Compilations, reports, caches,
contexts, runs and source snapshots resolve only beneath this root. Global
`defaultDataPath`, prompt-root flags and compiler-mode flags are not consulted.
Explicit analysis/image selections have no cross-type fallback.

Existing profiles and existing visual projects can be copied once using the
import actions. Afterwards each copy is independent. Project import is staged
and committed by rename, preserves original files, rejects traversal/symlinks,
and copies only intake assets and analysis reports/contexts. Planning documents,
creative decisions, migration capsules and shared prompt fragments are excluded.
The general Project Store refuses records owned by this feature; the feature
store refuses unowned records. No background resync or data migration occurs
merely because application code is rolled back.

## Behavior and verification

The public workflow accepts standard generation only. Reference-first,
continuation, foreign reference IDs and injected global models are not part of
this capability. It retains the extracted compile policy, selected model request
shape, first generation, deliverable validation and at most one directed
correction. A quality warning remains a warning; Provider hard caps remain gates.

Owned code, prompts, asset registry and UI are recorded in
`implementation-integrity.json`. This is an extraction integrity record with
quality acceptance explicitly pending. A mismatch blocks workflow operations
and CI checks; it does not automatically refresh the record or affect the other
features. Every analysis/compile records the implementation digest locally.

Required checks: isolation guard, offline workflow E2E with injected providers,
cross-store/config rejection, copied-source parity, `repo:verify`, full affected
regression, Web build/smoke and Golden. No frozen upstream prompt digest or
Golden expected output is automatically changed by this extraction.

## Ongoing bidirectional protection

The root `AGENTS.md` applies this ownership contract to future work in every
domain. Quality repair must change this feature's owned implementation rather
than the planning/migration implementations. Conversely, planning/migration
development must neither consume nor resynchronize this feature. Its integrity
record must not be refreshed as a side effect of another feature's changes.

The isolation gate checks imports, re-exports, dynamic imports, CommonJS and
relative paths in both directions. It rejects unapproved dependencies, global
environment reads, unrecorded owned prompts/assets/UI and cross-domain calls.
Its negative tests run through `repo:guard:test` and therefore `repo:verify`.
The offline workflow tests additionally exercise independent credentials,
project ownership, one-time migration, compilation and provider request parity.

Shared host infrastructure and installed dependencies remain a common failure
surface. Changes there require regression of every affected feature, including
this workflow. A module hash alone cannot establish unchanged output quality.
External model service updates and nondeterministic generation also remain
outside source isolation. Do not claim absolute image-quality invariance.

After the user accepts recovered image quality, create a separate acceptance
record with the owned implementation/prompt digests, provider/model/request
parameters, representative inputs and results, and explicit user acceptance.
Retain that record for later comparison. Do not relabel the extraction digest
or automatically regenerate acceptance evidence when tests fail. Future quality
changes require targeted evaluation against the accepted cases; a release with
provider-sensitive changes additionally follows the existing authorized real
provider smoke gate in `AGENTS.md`.
