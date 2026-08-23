# Planning Evidence Map

The machine-readable map contains:

- 14 section-level source catalog entries;
- 16 Planning claims;
- 8 Planning needs;
- 16 direct evidence links.

Every claim carries `claimId`, `sourceRef`, `epistemicType`, a semantic statement, and traceability. Every need resolves to claim and source IDs; every evidence link resolves to one claim and one source catalog entry.

Epistemic treatment is fail closed:

- source-attributed market and policy statements are retained as `FACT` about what the source states, without independent external verification;
- proposed operating, service, channel, funding, and growth intentions are `USER_REQUIREMENT`;
- source-authored category or performance interpretations are `MODEL_INFERENCE`;
- unverified revenue/profit projections are `UNKNOWN`.

No G01 claim ID, anchor, expected wording, or Planning carrier value is copied.
