# Timeout Policy Freeze

The A.3 pre-live calibration is frozen at `360000 ms`. It does not inherit the G01 `290000 ms` value, cannot be lowered automatically, and does not modify the runtime timeout implementation.

At a later authorized execution, evidence must record `actualLatencyMs`, compute `timeoutMarginMs = 360000 - actualLatencyMs`, and retain the operational risk assessment. Both values remain `null` in B because no live call occurred.
