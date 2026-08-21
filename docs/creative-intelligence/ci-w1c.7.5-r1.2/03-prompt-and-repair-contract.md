# Planning Prompt and Repair Contract

## Base messages

The Planning instruction is now exported by the Creative Intelligence strategic-synthesis layer. The base request has two messages:

1. `system`: Planning extraction authority, all 16 allowed keys, epistemic constraints, evidence requirements, and the exact semantic JSON shape;
2. `user`: the explicitly registered source document in a bounded `<document>` block.

The source text is never prefixed with the instruction and the instruction is never embedded into `rawText`.

## Repair messages

Planning repair has its own builder because the existing CI-3 repair helper is bound to the Visual Extraction system instruction. Reusing that helper as the final message builder would restore the ownership bug.

The Planning repair request preserves, without semantic rewriting:

- the same Planning system instruction used for the base call;
- the complete original Planning source document;
- the complete previous model output;
- every parse or validation error produced by the failed base attempt.

Only one repair is allowed. If the repaired result cannot be parsed, validated, normalized, or projected, the runner throws `NARRATIVE_EXTRACTION_FAILED`. The orchestrator then reports Planning narrative extraction failure and Strategic remains `NOT_RUN`.

## Runtime sequence

The production sequence is now:

`build Planning messages → model → parse JSON → validate Planning raw result → normalize → project canonical claims`

The previous DVC-specific validation and normalization calls are absent from the narrative Planning runner.
