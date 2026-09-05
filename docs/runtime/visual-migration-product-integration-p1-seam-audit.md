# Visual Migration Product Integration PI-1 Seam Audit

Status: `PI1_SEAM_AUDIT_GO`

Base HEAD: `f387db0ca1d305c66403375fac03616d933c3ebc`

Core state: `VISUAL_MIGRATION_CORE_FROZEN = YES`

## Authorities and seams

| Question | Existing authority | Decision |
|---|---|---|
| Approved Reference Anchor | `ReferenceAnchorService.getRun/getCapsule/getBrief/runRoot`; `VisualMigrationReferencePackService.createOrGet` rejects project mismatch and any non-approved/rejected/failed/cancelled run | Reuse; browser never reads run files |
| Style Profile | `StyleProfileService.getActive(projectId)` reads and validates `style/active-profile.json`; `CreativeSession.activeStyleProfileId` is written by the same service | Require both authorities to identify the same confirmed profile; otherwise fail closed |
| Creative Session | `CreativeSessionService.get/create`; one canonical `session.json` per project | Requests carry `creativeSessionId`; service rejects an ID/project mismatch and never selects a historical session |
| Locked Assets | `LockedAssetsService.list(projectId)` plus session locked-asset references | Reuse current project authority |
| Reference candidates | VM-3 builder already projects Reference Pack evidence, ready project assets and Locked Assets from explicit declarations | Add a product projection builder only; selection/ranking remains VM-3 |
| Initial generation | `ImageGenerationService.startCompiledCreativeTask`, `executeLive`, `executeMultiModelLive`, and the existing `ImageGenerationBeforeProviderSubmit` seam | Add only an optional guard argument to the existing start method; do not duplicate adapter, submit, polling, download, metrics, or RunStore |
| VM-5 ordering | `VisualMigrationGenerationEvidenceService.prepareAndPersist/runPreSubmit` validates VM-4 materialization, writes and reads back the snapshot, then verifies redacted request evidence | Invoke from the initial generation pre-submit guard; any failure prevents provider submission |
| Prompt compilation | No current compiler consumes Product Task + VM Canon under the required authority restrictions | Add deterministic `visual-migration-product-prompt@1.0.0`; no model call and no Anchor Brief truncation |

## Binding rules

- `prepareReference` validates the explicit session ID, approved Anchor run, active confirmed StyleProfile, and current Locked Assets before calling frozen VM-1 and VM-2 services.
- The session is linked through its existing Reference Pack and Canon setters. No workflow store is introduced.
- PI-1 adds the smallest optional session binding required for the active Product Task/Policy and generation run IDs; state remains derived from existing immutable artifacts.
- Product RPC accepts profile IDs only. Credentials remain in `RuntimeServices`.

## Frozen-core diff boundary

VM-1 through VM-6.1 implementations are not changed. The only generation-stack change authorized by this audit is plumbing the already-existing optional pre-submit callback into the initial compiled-task entry point. It does not alter legacy callers when omitted.

## Decision

All mandatory seams are resolvable without changing frozen selection, materialization, evidence, audit, or corrective-retry law and without creating a second Provider execution stack or Store.

`PI1_SEAM_AUDIT_GO`
