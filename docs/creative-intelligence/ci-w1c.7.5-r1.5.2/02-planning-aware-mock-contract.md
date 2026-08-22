# Planning-Aware Mock Contract

The static Strategic fixture remains a deterministic semantic-shape template. Before returning it, the production mock reads only the canonical `# SOURCE TRACE IDS` block in the Strategic prompt and projects four authority domains:

- `facts` → `sourceMap.planningTruth`
- `needs` → `sourceMap.needs`
- `evidence` → `sourceMap.evidence`
- `planningClaims` → `sourceMap.planningClaims`

Each source map is an exact, stable-order mirror. References are selected only from those parsed sets. When Planning claims exist, `projectUnderstanding` and at least one tension/insight receive a valid Planning claim reference. When a domain is empty, its mirror and references remain empty.

The parser does not inspect narrative prose, infer IDs, synthesize fallback IDs, or contain project-specific literals. The output is byte-deterministic for the same prompt.
