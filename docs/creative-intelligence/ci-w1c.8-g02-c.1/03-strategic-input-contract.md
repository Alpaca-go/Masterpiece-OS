# Strategic input contract

Strategic synthesis now explicitly receives four named trace domains: Planning Claims, Planning Needs, Evidence References, and Ground Truth Anchors. The canonical project orchestrator forwards qualification anchors to the service; the service compiles, fingerprints, snapshots, and gates the same carrier.

Prompt version is `ci-w1c.8-g02-c.1-strategic-synthesis-v0.4`. Its semantic fingerprint includes the canonicalized anchor identity and sorted Planning bindings, so changing an anchor or binding invalidates the prompt snapshot.

The prompt forbids ignoring CRITICAL anchors, inventing anchor IDs, creating visual Direction/Concept/packaging/image proposals, and importing unauthorized external concepts. Existing no-anchor runs remain backward compatible through an empty carrier.
