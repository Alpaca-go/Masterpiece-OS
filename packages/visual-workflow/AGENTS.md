# Independent visual workflow ownership

This feature is deliberately independent of creative planning and visual
migration, by explicit user instruction on 2026-10-16.

* Keep all quality-affecting business code, prompts, templates, validators,
  provider payload builders and defaults within this package.
* Do not import or re-export another internal business package. Do not expose
  this package to planning/migration as a shared implementation.
* Do not read global model/prompt/compiler flags or shared context stores.
  The Node host's import adapters are for explicit one-time copies only.
* Keep independent data/credential ownership checks and standard-only routing.
* Do not synchronize these sources from `extraction-provenance.json`.
* `implementation-integrity.json` is not image-quality acceptance. Updating it
  requires a concrete, explicitly authorized change to this workflow; never
  update it automatically to hide drift. Run the isolation and parity tests.
