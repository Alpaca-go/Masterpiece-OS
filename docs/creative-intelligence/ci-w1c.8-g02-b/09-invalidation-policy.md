# Authorization Invalidation Policy

Authorization readiness is invalidated by any change to the replacement SHA, document role, source role, Planning eligibility, Anchor Map fingerprint, Provider/model policy, timeout, retry/budget rules, evidence requirements, rollback policy, G01 fingerprint, or the zero-live boundary.

A source or Anchor Map mismatch raises the internal state `HOLD_FOR_SOURCE_IDENTITY_CHANGE`; because the final-verdict vocabulary is fixed by B, the phase-level verdict becomes `HOLD_FOR_AUTHORIZATION_CONTRACT_REPAIR`. G01 drift always takes precedence as `HOLD_FOR_G01_BASELINE_GUARD_REPAIR`. No invalidation may be repaired automatically by updating expected fingerprints.
