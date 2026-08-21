# Stage Scope Audit

| Stage | Status | Attempts | Prompt built | Provider calls |
|---|---|---:|---|---:|
| Synthesis | FAIL | 2 | yes | 2 |
| Concept | NOT_RUN | 0 | no | 0 |
| Direction | NOT_RUN | 0 | no | 0 |

- `scopeBlockedStages`: 0
- unexpected-stage guard activations: 0
- Concept repair entries: 0
- Direction repair entries: 0

The canonical `stopAfter: 'synthesis'` boundary passed its real-run qualification even though Synthesis itself failed.
