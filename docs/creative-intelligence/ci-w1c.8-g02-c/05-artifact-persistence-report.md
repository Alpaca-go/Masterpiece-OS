# Artifact Persistence Report

Raw Provider outputs, prompt snapshot, gate result, normalized Planning audit, normalized Strategic artifact, runtime summary, and runtime evidence were persisted beneath the ignored local runtime area. They remain replayable by hash but are not committed, because repository policy forbids tracked raw Provider responses and local sensitive paths.

The tracked redacted evidence contains only hashes, IDs, counters, latency, token usage, gate results, and the qualification failure. Planning artifact, Strategic artifact, prompt, gate, summary, and evidence hashes are recorded in `08-redacted-live-evidence.json`.
