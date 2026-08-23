# Anchor injection contract

Strategic qualification accepts an additive `groundTruthAnchors` carrier:

```ts
Array<{
  anchorId: string;
  importance: 'CRITICAL' | 'IMPORTANT';
  semanticMeaning: string;
  sourceReference: string;
  planningClaimRefs: string[];
}>
```

The first four fields are the human-reviewed anchor identity. `planningClaimRefs` is the deterministic runtime binding to the accepted Planning artifact. Duplicate IDs, empty semantic/source fields, empty bindings, invalid importance, or a binding outside the runtime Planning claim set fail before prompt execution with `GROUND_TRUTH_ANCHOR_MAP_INVALID`.

The Strategic prompt renders a dedicated `# GROUND TRUTH ANCHORS` section. ANCHOR-INJECT-01..03 verify map presence, exact input-derived IDs, and zero G01-anchor introduction.
