# Creative Intelligence V2 — Phase 6 Validation

Phase 6 keeps Golden assets outside production Runtime and validates six offline scenarios through `tests/packages/creative-intelligence-runtime/phase6.test.js`.

## Migration rule

Existing projects continue through the established Fast/Short-Chain path with their original `outputs/creative_decision.json`. Migration never fabricates an Evidence Ledger, discarded alternatives, user confirmation, or Decision Trace. A trace-complete V2 decision is created only after a new Guided Direction confirmation.

## Offline scenarios

- document-only greenfield;
- existing visual-system upgrade;
- joint document/visual gap analysis;
- Reference-First decision inheritance;
- legacy project passthrough;
- incomplete evidence that fails closed.

Direction work consumes cached Evidence/Truth structures and carries no image attachments, so changing a selection does not reread original images. Provider smoke tests remain a separate user-authorized release activity and are not part of this offline validation.
