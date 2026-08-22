# Mock Source Authority Mirror Audit

| Domain | Runtime authority | Artifact mirror | Result |
|---|---|---|---|
| Facts | `SOURCE TRACE IDS facts` | `sourceMap.planningTruth` | exact set/order PASS |
| Needs | `SOURCE TRACE IDS needs` | `sourceMap.needs` | exact set/order PASS |
| Evidence | `SOURCE TRACE IDS evidence` | `sourceMap.evidence` | exact set/order PASS |
| Planning | `SOURCE TRACE IDS planningClaims` | `sourceMap.planningClaims` | exact set/order PASS |

Reference audit:

- `projectUnderstanding.planningClaimRefs`: non-empty and allowed when Planning exists.
- tension/insight Planning usage: at least one non-empty allowed reference.
- all fact, need, evidence, and Planning references: subsets of their corresponding allowed sets.
- fake/foreign reference count: 0.
- empty Planning input: valid and produces no Planning references.

No gate exceptions or mock-only validation branches were added.
