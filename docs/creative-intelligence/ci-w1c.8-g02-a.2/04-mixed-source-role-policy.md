# Mixed Source Role Policy

The classifier returns one primary `role`, zero or more `secondaryRoles`, an `ambiguity` flag, and the complete role `scores`.

- A non-tied winner remains the primary role.
- A candidate becomes secondary only when its score is at least 3 and at least 25% of the winning score.
- An exact top-score tie at or above the classification threshold is ambiguous.
- If every tied role is a Planning role, the role becomes `mixed-planning`; otherwise it becomes `unknown`.
- Ambiguity always yields `UNKNOWN_SOURCE` and Planning eligibility `false`.

This policy preserves mixed evidence while preventing an unresolved tie from silently acquiring Planning authority.
