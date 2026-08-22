# Deterministic Role Scoring Design

Classifier version: `document-role-classifier-v2`.

Inputs are bounded and local: filename, title, first 1,200 characters for role-title identity, first 3,000 characters for body signals, section headings, table headings, and at most 50,000 characters for whole-document strategic-domain presence.

Weights are deterministic:

- filename/title identity: 8;
- weak `BP` identity: 1;
- clear identity in the bounded role-title sample: 4;
- section/table-heading signal: 2 per hit, capped at four hits;
- bounded body signal: 1 per hit, capped at four hits;
- eligible business-plan domain: 1.25 per present domain;
- multi-section structure: 1;
- two-or-more-table structure: 1.

Business-plan domain and structure boosts activate only after business-plan evidence exists; generic strategic coverage alone cannot relabel an ordinary strategy document. Ranking sorts by score and then role name, so rule declaration order cannot determine the winner. Minimum classification score is 3. Confidence remains the legacy `high|medium|low` field and is computed from winning score and margin.
