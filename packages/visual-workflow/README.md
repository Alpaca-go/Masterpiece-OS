# Independent visual workflow

Owns **material import → visual analysis → report → standard image generation**.
The user explicitly requested a separate implementation inside the existing
application on 2026-10-16. Initial code was extracted once, with provenance in
`extraction-provenance.json`; it is now editable source owned by this capability,
not a facade, generated build, shared provider policy, or automatic mirror.

* Entry: `/visual-workflow`; operations: `visual-workflow:*`.
* Composition authority: `src/service.js`. Only the Node host instantiates it.
* Own analysis engine, repair, report compiler, prompt files, generation compiler,
  provider request adapters, validation/correction and Logo composition.
* Own settings, encrypted credentials, projects, caches, contexts, runs and
  reference-free generation sessions under `<userData>/visual-workflow/`.
* Planning and visual migration cannot import this package or call its channels.
  Its source cannot import another internal package or read global mode/prompt
  environment flags. Filesystem/HTTP, React and pinned Sharp remain infrastructure.
* The optional host import adapters are **one-time copies**, never live context
  loaders. Project import copies only analysis materials/results, not planning
  briefs, reference capsules or shared prompt assets. Original records remain.
* Standard generation only. Reference-first and continuation are rejected at the
  public boundary. No input can inject another project's compilation/model.

`implementation-integrity.json` records this extraction's implementation, not
approved image quality. Quality repair and visual acceptance are separate work.
Changing it requires an explicit workflow change/review; there is no automatic
refresh from the source packages and no automatic integrity-update command.
Run `npm run verify:visual-workflow-isolation`, `repo:verify`, affected tests and
Golden regression after changes. Never refresh frozen upstream prompts/Goldens
to hide a difference. Existing upstream domains retain their own implementations
and must not use this workflow as their shared Core.
