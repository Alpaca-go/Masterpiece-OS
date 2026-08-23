# Timeout Calibration

Calibration is offline only. No Provider call, retry, timeout runtime, or adapter was changed.

| Measure | Value |
|---|---:|
| G01 accepted Strategic latency | 285,028 ms |
| G01 request timeout | 290,000 ms |
| G01 remaining margin | 4,972 ms |
| A.3 recommendation | 360,000 ms |
| margin over accepted G01 latency | 74,972 ms |
| margin percentage | 26.3% |

The recommendation is based on 7,363 characters, four tables, eight domains, 16 Planning claims, and 13 anchors. It exceeds a 20% minimum safety margin and does not inherit 290,000 ms.

Risk is `MEDIUM_OPERATIONAL_CALIBRATION_RISK`: 360,000 ms is a pre-live recommendation, not runtime authority. G02-B must explicitly authorize and empirically validate it before any live qualification.
