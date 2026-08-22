# Role Classifier Backward Compatibility

The public `role` and `confidence` fields remain present and retain their string domains. Existing roles remain in the taxonomy. `business-plan` and `mixed-planning` are additive.

New additive fields are `classifierVersion`, `secondaryRoles`, `ambiguity`, `scores`, `signals`, `strategicDomains`, `sourceRole`, `planningStrategicEvidenceEligible`, and `eligibilityReasons`. `prepareDocumentSet` carries the corresponding role metadata into each source document without changing the document-set fingerprint inputs.

The Planning source-role mapper now recognizes `business-plan`. Existing market-research/product-information source-role mapping remains unchanged; their new eligibility flag is intentionally non-authoritative unless explicitly promoted. Historical English and Chinese brand-strategy fixtures continue to classify as `brand-strategy` and complete the R1/R2/R2.1 offline paths.
