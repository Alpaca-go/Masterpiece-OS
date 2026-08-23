# G02 Live Authorization Contract

Current state is `G02_PRELIVE_READY`. The only permitted sequence is:

`G02_SOURCE_READY -> G02_PRELIVE_READY -> G02_AUTHORIZED -> G02_RUNNING -> G02_COMPLETED`.

No transition may be skipped. `G02_AUTHORIZED` requires a separate, explicit human authorization record with `humanAuthorized=true`; this B-phase contract does not fabricate that approval. `G02_RUNNING` additionally requires an authorized manifest whose source, Anchor Map, Provider, timeout, retry, budget, and evidence fingerprints still pass.

This phase authorizes contract readiness only. It executes no Planning, Strategic, Concept, Direction, Provider, model, or Image operation.
