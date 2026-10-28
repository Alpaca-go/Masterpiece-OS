# M1-C Manifest

Batch: M1-C  
Purpose: Semantic names for current implementation symbols and keys.

- Renames: `AnalysisConfigError`, `createAnalysisProjectConfig`, `writeAnalysisRunReport`, `analysisFactualConstraints`, `RuntimeApi`, `createWebRuntimeApi`, and semantic report validator.
- Provider ID: `deep-creative-director-provider` is canonical; no legacy consumer was found.
- Persisted output: runtime report now writes `projectId`; no schema migration or old project rewrite performed.
- A1/Prompt/Golden impact: no request, provider-selection, prompt, or Golden change.
- Verification: CLI, Runtime, Web typechecks, repo contract and Golden PASS.
- Rollback: revert symbol/call-site renames together.
- Result: PASS.
