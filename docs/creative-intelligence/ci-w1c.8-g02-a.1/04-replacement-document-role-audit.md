# Replacement Document Role Audit

The required repository classifier was invoked without override:

| Field | Result |
|---|---|
| Classifier | `@masterpiece/document-ingestion classifyDocumentRole` |
| Input | exact filename, extracted title, replacement raw text |
| Selected role | `unknown` |
| Confidence | `low` |
| Source role | `UNKNOWN_SOURCE` |
| Planning Strategic Evidence eligible | `false` |
| Manual override | `false` |

The classifier samples filename, title and the first 1,200 characters. None matches its registered role patterns. The document is human-plausible as a mixed business plan with brand-strategy, market-research and product-information content, but this ambiguity cannot override deterministic authority.

Gate result: `HOLD_FOR_G02_DOCUMENT_ROLE_REPAIR`.
