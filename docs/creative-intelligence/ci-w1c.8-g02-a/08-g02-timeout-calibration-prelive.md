# G02 Timeout Calibration — Pre-Live

G01 observed Strategic latency was 285,028 ms under a 290,000 ms timeout, leaving 4,972 ms. That narrow margin remains operational-risk evidence, not a universal timeout.

The rejected candidate has the same 10,737-character source and the same expected Narrative fallback as G01. Those values cannot calibrate generalization because the candidate is not independent.

Current calibration state:

- `requestTimeoutMs` remains the mechanism;
- `strategicTimeoutRecalibrationRequired=true`;
- `inheritsG01StrategicTimeout=false`;
- no G02 timeout value is selected;
- status: `BLOCKED_PENDING_INDEPENDENT_SOURCE`.

A replacement source must be assessed using its character count, structured coverage, expected prompt/output complexity, anchor count/materiality, and documented Provider behavior. No Provider call is authorized here.
