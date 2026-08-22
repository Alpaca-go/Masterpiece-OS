# Planning Source Eligibility Policy

Eligibility is a separate policy decision after role classification.

| Document role | Source role | Planning Strategic Evidence eligibility |
|---|---|---|
| `creative-brief` | `PLANNING_STRATEGIC_SOURCE` | eligible (legacy-compatible) |
| `brand-strategy` | `PLANNING_STRATEGIC_SOURCE` | eligible (legacy-compatible) |
| `business-plan` | `PLANNING_STRATEGIC_SOURCE` | eligible only with at least four deterministic strategic domains |
| `market-research` | `PLANNING_STRATEGIC_SOURCE` | not automatically eligible; explicit promotion is required |
| `product-information` | `PLANNING_STRATEGIC_SOURCE` | not automatically eligible; explicit promotion is required |
| `visual-guideline`, `reference` | `LEGACY_VISUAL_EVIDENCE` | ineligible |
| `mixed-planning`, `unknown`, ambiguous | `UNKNOWN_SOURCE` | ineligible/fail closed |

The required business-plan domains are detected from bounded local content. Available domains are audience/customer, business model, strategic objective, competition/differentiation, product/service, channel/go-to-market, growth/transformation, and funding/finance. A filename or `BP` token cannot grant eligibility.
