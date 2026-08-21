# Epistemic Authority Audit

## Starting state

- Branch: `feat/short-chain-simplified-ui`.
- Local and origin HEAD at start: `58ebcf88231e9d91def1b55fb14c618db2a86d1a`.
- Tracked worktree: clean. Existing unrelated untracked files were preserved.
- No reset, rebase, force push, or history rewrite was used.

## Authority gap

R1.2 correctly separated Planning extraction from DVC, but projection copied the model's `epistemicClass` directly into `PlanningStrategicClaim`. Model output is probabilistic extraction evidence; it cannot be the final authority that decides whether a statement is a fact, user requirement, inference, or unresolved claim.

The repository already owns the deterministic authority in `classifyPlanningClaimEpistemicClass()`. It recognizes UNKNOWN, USER_REQUIREMENT, and MODEL_INFERENCE markers with conservative precedence and defaults only plain declarative statements to FACT. R1.2.1 reuses this classifier rather than creating a parallel rule set.

## Downstream risk

`routePlanningClaim()` trusts the final class:

- FACT may become Truth when a canonical mapping exists;
- USER_REQUIREMENT routes to the requirement carrier;
- MODEL_INFERENCE remains inference evidence;
- UNKNOWN remains unresolved.

If a model promotes “希望…”, “可能…”, or “待确认” to FACT, downstream routing can assign false authority to a request, inference, or unresolved statement. This is a high-impact provenance error even when the extracted key and value are accurate.

## Existing classifier defect found

The classifier already declared `应该`, `可能`, and `或许` as Chinese markers, but surrounded them with Latin-style `\b` word boundaries. Those boundaries do not match markers embedded in continuous Chinese text. R1.2.1 corrects only those existing regex boundaries; it does not add a new classifier or new semantic vocabulary.
