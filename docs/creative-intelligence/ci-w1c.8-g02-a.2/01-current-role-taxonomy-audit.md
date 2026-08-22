# Current Role Taxonomy Audit

## Finding

The former classifier was a first-match ordered regex over filename, title, and the first 1,200 characters. It conflated a document label with its downstream Planning authority and could not represent a mixed business plan.

The frozen additive taxonomy is:

1. `visual-guideline`
2. `creative-brief`
3. `market-research`
4. `brand-strategy`
5. `product-information`
6. `reference`
7. `business-plan`
8. `mixed-planning`
9. `unknown`

`documentRole`, `sourceRole`, and `planningStrategicEvidenceEligible` are separate outputs. `unknown` and unresolved ties fail closed. No role is assigned by array order.

## Audit boundary

The change is limited to document-role classification, its additive document-set metadata, the generic Planning source-role map for `business-plan`, readiness verification, and tests. Planning prompts/schemas, Strategic prompts/parsers, SG gates, the Planning epistemic classifier, Provider runtime, retry/timeout, Concept/Direction, and Image are unchanged.
