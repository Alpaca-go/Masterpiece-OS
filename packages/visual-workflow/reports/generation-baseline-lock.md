# Normal startup generation baseline protection

The independent workflow now checks an opt-in local `generation-baseline-locks.json` before invoking business handlers. The normal Node host already constructs this workflow, so `npm run web:dev` needs no special launcher, proxy, environment flag or source path to activate these checks.

The policy has `schemaVersion: "1.0"` and a `projects` array. Each entry contains `projectId`, `files` (`path`, `sha256`, relative to that project), `recordSha256`, `analysisFingerprint`, `profileSha256` (SHA256 of JSON.stringify of the selected stored image profile), and `implementationDigest` from the independent integrity verifier. Project-specific design text never enters production code.

For a protected project the guard blocks analysis, intake, identity, Logo and direction mutation during the stability period. Standard space compilation without references checks all pinned input files, code integrity and image model configuration. Generation repeats these checks and requires the task's captured direction to match the accepted record and analysis. Missing files fail before credentials or Provider execution. Other projects retain their original behavior.

A project-local `generation-baseline-required.json` marker prevents a missing policy or removed project entry from silently unlocking that project after restart. Removing or changing an already loaded policy also fails in the running host. These files are local operational data, not a credential store, global design template, or replacement for the normal semantic/compilation checks.

This is an explicit temporary freeze: changing a protected direction/model/input/code requires separate isolated acceptance and deliberate policy update. It prevents the diagnosed wrong-input fallback; it is not a guarantee of stochastic image quality. No model request, Prompt, Compiler or Adapter was changed.

Offline validation: complete independent workflow suite 94/94, Web typecheck/build, repo:verify (including current flows), and Golden. P7B actual Adapter offline interception preserves Formal `031d2d20b203d73b5a11b77c27792bde9b02a15cc912c8e0c5f2d9f8dd886ab9`, Provider `a7b402054cc0153517dd3d2411668fe0d1583f89c9c9eb3b8f30b6d64edfdc97`, and Request `79d70c85ba1eced01a0256dcb60cb60dc8e6acf1d1021a903f78eddbcb090b99`. Real model, analysis and image calls: zero. Golden and quality acceptance records were not updated.
