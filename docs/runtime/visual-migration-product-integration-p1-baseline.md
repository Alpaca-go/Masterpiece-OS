# Visual Migration Product Integration PI-1 Baseline

## Freeze state

- Status: `PI1_FROZEN`
- Base HEAD: `f387db0ca1d305c66403375fac03616d933c3ebc`
- Implementation HEAD: `f5cdc7e66d89581acb1d59dd45a8c5e39f0f9765`
- Commit list:
  - `f5cdc7e6 feat(visual-migration): add PI-1 product facade vertical slice`
- Acceptance: `G1-G126 = 126/126 PASS`
- `VISUAL_MIGRATION_CORE_FROZEN = YES`
- `VM_PRODUCT_PI1_FROZEN = YES`
- `VM_PRODUCT_PI2_UNLOCKED = YES`

PI-1 adds no final workspace UI and does not change the default behavior of
`CreatePage` or `ReferenceAnchorWorkspace`.

## Changed production files

- `apps/web-runtime/src/current-operation-graph.ts`
- `apps/web-runtime/scripts/run-web-primary-smoke.mjs`
- `apps/web/src/sdk/index.ts`
- `apps/web/src/sdk/operations/visual-migration.ts`
- `packages/creative-production-runtime/src/session.js`
- `packages/image-generation-contracts/src/index.ts`
- `packages/project-contracts/src/index.ts`
- `packages/runtime-core/src/application-contracts.ts`
- `packages/runtime-core/src/application/creative-session-service.ts`
- `packages/runtime-core/src/application/image-generation/service.ts`
- `packages/runtime-core/src/application/runtime-services.ts`
- `packages/runtime-core/src/application/visual-migration-product-candidate-builder.ts`
- `packages/runtime-core/src/application/visual-migration-product-contract.ts`
- `packages/runtime-core/src/application/visual-migration-product-prompt-compiler.ts`
- `packages/runtime-core/src/application/visual-migration-product-service.ts`
- `packages/runtime-core/src/index.js`
- `packages/runtime-core/src/operations/visual-migration-product-operations.ts`
- `schemas/creative-production/creative-session.schema.json`

## Authority and frozen-Core proof

- Frozen Core diff proof: the implementation diff contains no change to the
  VM-0 through VM-6.1 Reference Pack, Canon, Policy, allocation,
  materialization, evidence, audit, or corrective-retry implementations.
- StyleProfile authority: the active pointer returned by `StyleProfileService`
  must match `CreativeSession.activeStyleProfileId` and be confirmed.
- CreativeSession authority: every Product operation explicitly validates the
  project-bound session and persists only minimal Pack, Canon, Policy, task,
  generation, audit, and correction bindings.
- Reference authority: an approved Reference Anchor is handed to the frozen
  VM-1 create-or-get path; the Product layer does not select a latest run.
- Locked Asset authority: candidate declarations are projected from current,
  confirmed Locked Assets; the Product layer never selects or reorders them.
- Detailed seam result: `PI1_SEAM_AUDIT_GO` in
  `visual-migration-product-integration-p1-seam-audit.md`.

## Product surface

- Product schema: `visual-migration-product/v1`.
- Product states: `reference_required`, `reference_ready`, `core_prepared`,
  `task_required`, `task_ready`, `generating`, `generation_failed`,
  `audit_required`, `audit_unavailable`, `passed`, `passed_with_warnings`,
  `retry_available`, `manual_review_required`, `reference_conflict`.
- Product operations:
  - `visual-migration-product:get-state`
  - `visual-migration-product:prepare-reference`
  - `visual-migration-product:prepare-task`
  - `visual-migration-product:start-generation`
  - `visual-migration-product:audit-generation`
  - `visual-migration-product:execute-correction`
- Prompt compiler version: `visual-migration-product-prompt@1.0.0`.
- Browser input guard rejects credentials, raw Canon/Policy, candidate
  priority, Provider capability, Provider request/response, and byte payloads.
- Recursive response guard rejects absolute/traversal paths, byte payloads,
  data URIs, secrets, Provider payloads, and hidden reasoning fields.

## Execution and integration proof

- Initial-generation Provider seam: existing
  `ImageGenerationService.startCompiledCreativeTask` execution, polling, and
  download lifecycle is reused; only an optional internal pre-submit callback
  and Product-selected reference capacity are supplied.
- VM-5 pre-submit proof: the headless test observes `vm5-validated` before
  `provider-called`, after immutable snapshot persistence and read-back.
- Web Runtime RPC proof: all six operations are registered in the current Node
  operation graph; the host exposes 242 operations and a real RPC missing-
  project request returns the structured Product error.
- Web SDK proof: the typed `visualMigration` SDK exposes only the six Product
  operations and browser-safe request/response contracts.

## Vertical slices and fail-closed behavior

- Clean vertical slice: real filesystem stores and real VM-1 through VM-6
  services run approved Reference Anchor -> Pack -> Canon -> Policy -> initial
  generation -> VM-5 -> two-call Audit -> `passed`.
- Corrective vertical slice: a second initial run audits to `PALETTE_DRIFT`,
  becomes `retry_available`, delegates one correction to frozen VM-6.1,
  persists the child VM-5 snapshot before Provider submission, and re-audits
  the child to `passed`.
- Parent/child provenance includes parent run, source audit, correction plan,
  exact authority identifiers, and retry depth.
- A second automatic correction is rejected.
- Fail-closed matrix covers unapproved/cross-project Reference authority,
  missing or conflicting StyleProfile/Canon/Policy authority, unsupported task
  kinds, unsatisfied allocation, missing/tampered materialization, VM-5
  persistence/read-back failure, Audit evidence failure, authority/capability
  drift, unsafe DTOs, and forbidden browser inputs. Pre-submit failures make
  zero Provider calls.
- Restart proof: a new Product Service instance reconstructs the persisted
  audited state as `passed` from filesystem-backed session and run stores.
- Fixture counts in the combined slices: Generation callback `3`; Audit model
  calls `6` (exactly two per Audit).

## Regression matrix

- VM-3, VM-4, VM-5, VM-6, and PI-1 targeted tests: PASS.
- `npm test`: PASS, 1694/1694.
- `npm run cli:test`: PASS, 40/40.
- `npm run runtime:test`: PASS, 1372/1372.
- `npm run web-runtime:test`: PASS, 15/15.
- `npm run web-runtime:typecheck`: PASS.
- `npm run web:typecheck`: PASS.
- `npm run web:build`: PASS.
- `npm run web:smoke`: PASS; Provider calls `0`, business writes `0`.
- `npm run golden:test`: PASS; Provider calls `0`, auto-update `NO`.
- `npm run verify:current-flows`: PASS; external Provider calls `0`.
- `npm run verify:tracked-runtime-assets`: PASS.
- `npm run verify:repository-contract`: PASS.
- `npm run repo:verify`: PASS.
- `npm run repo:check`: PASS.
- `git diff --check`: PASS.
- Automated Generation Provider calls: `0`.
- Automated Audit Provider calls: `0`.
- Repository/smoke guard business writes: `0`.
- Golden auto-update: `NO`.

## Final acceptance

The Web Runtime now owns one stable, browser-safe Visual Migration Product API
that completes Reference -> Pack -> Canon -> Policy -> Initial Generation ->
VM-5 Evidence -> Audit -> One Corrective Retry without moving orchestration to
React, modifying frozen Core law, or duplicating Provider execution.

`G1-G126 = 126/126 PASS`.
