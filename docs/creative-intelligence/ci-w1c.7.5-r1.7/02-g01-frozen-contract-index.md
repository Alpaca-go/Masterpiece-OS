# G01 Frozen Contract Index

The canonical machine-readable authority is `g01-frozen-baseline.manifest.json`. This index explains its frozen contract sections without duplicating production implementation.

| Contract | Frozen meaning |
|---|---|
| Source identity | Repository record contains filename and the R1.6 SHA/content hashes, never a machine-local path. |
| Anchor map | The ordered G01 set contains exactly 12 keys and requires 12/12 material retention. |
| Planning carrier | Canonical Planning claims and PlanningClaimKeys remain the semantic carrier; structured coverage determines Narrative fallback. |
| Epistemic authority | Deterministic classification is authoritative; model classification is a proposal; Narrative confidence is forbidden. |
| Strategic acceptance | A canonical accepted Strategic artifact is required; raw Provider text alone is insufficient. |
| SG gates | `SG-01`, `SG-11`, `SG-12`, `SG-13`, `SG-14`, and `SG-15` must pass. |
| Four-domain mirror | Artifact source maps exactly mirror runtime-allowed `facts`, `needs`, `evidence`, and `planningClaims`; model-invented IDs are forbidden. |
| Traceability | All frozen anchors evaluated, 12/12 retained, zero silent material loss, zero contradiction, all SG gates pass, Traceability score at least 2. |
| Human Review | Applicable Strategic-only dimensions each score at least 2 and average at least 2.4; Concept/Direction dimensions are N/A. |
| Scope | `stopAfter=synthesis`; Concept and Direction remain `NOT_RUN` with zero attempts and Provider attempts. |
| Transport | `requestTimeoutMs` is authoritative; BASE, transport retry, and semantic repair are distinct bounded states. |
| Failure taxonomy | The ten canonical transport, Provider, cancellation, semantic, and unknown failure classes are frozen. |
| Evidence | `ci-qualification-evidence-v2.1` and its Provider call ledger fields are frozen. |

## Provenance

- `../ci-w1c.7.5-r1.6/g01-attempt-5-evidence.v2.1.redacted.json`
- `../ci-w1c.7.5-r1.6/final-report.md`
- `../ci-w1c.7.5-r1.6/12-g01-attempt-5-final-verdict.md`

The manifest stores normalized repository-relative forms of these paths so verification from the repository root is deterministic.
