# Stage Scope Audit

The canonical production input used `stopAfter: 'synthesis'`.

| Stage | Status | attempts | providerAttempts | transportRetries | semanticRepairAttempts |
|---|---|---:|---:|---:|---:|
| synthesis | PASS | 1 | 1 | 0 | 0 |
| concept | NOT_RUN | 0 | 0 | 0 | 0 |
| direction | NOT_RUN | 0 | 0 | 0 | 0 |

- `scopeBlockedStages`: 0
- `unexpectedStageCount`: 0
- Concept provider calls: 0
- Direction provider calls: 0
- Concept/Direction prompt receipt by reasoner: 0

The emergency unexpected-stage guard did not trigger. Qualification scope PASS.
