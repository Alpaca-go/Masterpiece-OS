# G01 Operational Risk Notes

The accepted G01 Strategic response completed in 285,028 ms under a 290,000 ms `requestTimeoutMs`, leaving 4,972 ms of margin.

| Classification | Value |
|---|---:|
| Qualification blocker | `false` |
| Operational calibration risk | `true` |

This does not invalidate `G01_ATTEMPT_5_PASS`: the accepted response completed within the configured deadline and required no retry. The narrow 1.71% margin is nevertheless an operational risk signal.

The 290,000 ms value is accepted-run provenance, not a universal timeout truth. G02 inherits the `requestTimeoutMs` mechanism only. Before any future G02 live authorization, its Strategic timeout must be recalibrated offline using G01 latency as one observation together with expected G02 prompt/output size and documented Provider behavior. G02 must not automatically inherit 290,000 ms.
