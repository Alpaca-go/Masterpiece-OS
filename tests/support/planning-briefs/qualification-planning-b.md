<!--
  ====================================================================
  TEST SUPPORT INPUT — CI-W1C.7.4-R1 — qualification-planning-b
  ====================================================================
  PROJECT ID: qualification-fixture-B
  NOT REAL G01 / NOT REAL G02
  PURPOSE: zero-network production-path qualification of
           planning-source ingestion + strategic carrier integration.
           Counterpart to fixture-A (which is Chinese / B2C).
  ====================================================================
  This is a clearly labeled synthetic fixture. It does NOT represent
  any real project. The content below is engineered to differ from
  fixture-A across 10+ planning keys; it represents a B2B SaaS
  audience intelligence platform, NOT a B2C grocery subscription.
  ====================================================================
  Brand Strategy Brief — audience intelligence API, B2B martech.
  ====================================================================
  CI-W1C.7.4-R1 PART I: epistemic classes exercised (16 claim keys,
  each matched by an EXTRACT_PATTERN in build-planning-strategic-carrier.ts):
    FACT            (declarative, no markers)
    USER_REQUIREMENT (lines containing must / should / required)
    MODEL_INFERENCE  (lines containing could / may / likely / recommend)
    UNKNOWN          (lines containing TBD / unknown / not confirmed)
  Both fixtures together cover all 4 classes.
  NOTE: header intentionally avoids the substring "vi" inside
  "e-v-i-dence" / "v-i-sual" so the document-role classifier
  (classifyDocumentRole) does not match the "VI" rule. The
  classifier sees "brand strategy" + "audience intelligence" and
  resolves the role to brand-strategy (PLANNING_STRATEGIC_SOURCE).
  ====================================================================
-->

brand_positioning: The operator-grade audience intelligence platform for performance marketing teams who refuse to spend budget on segments they cannot defend to a privacy officer.

brand_role: Audience intelligence platform operator

industry: Marketing technology

business_model: Usage-based API + private-cluster licensing

product: Real-time audience graph query API + offline cohort sync SDK

target_audience: In-house performance marketing leads at Series C+ consumer brands, plus their analytics engineering counterparts

audience_problem: Existing audience platforms either are walled gardens with no inspectable lineage, or demand a 6-month CDP buildout before delivering actionable segments

brand_promise: Every segment query returns lineage metadata — data source, freshness window, consent status — auditable in one GET

competitive_context: LiveRamp, The Trade Desk, and in-house CDP builds; differentiation is auditable lineage without CDP buildout

differentiation_logic: Not a faster segment API — a defensible segment API

communication_task: Establish "every segment ships with lineage" as the default expectation in mid-market performance marketing, displacing the trust-our-black-box framing

strategic_objective: Within 18 months, have 60% of in-bound enterprise requests cite lineage metadata as the primary reason for evaluation

experience_objective: Make the lineage panel the first thing seen in the dashboard — not buried in a settings tab

touchpoint_priority: Direct sales > analyst community > peer-reviewed benchmarks > co-marketing with CDP vendors

brand_personality: Operator-grade, calm, defensible; look-and-feel biased toward system dashboards, not consumer-app polish

transformation_objective: Move mid-market performance marketing from "trust our black box" to "audit our lineage" as the default expectation

industry: TBD — first vertical deployment is not yet decided; may be commerce, may be media

brand_promise: must be auditable in a single GET; required by the EU DSA audit trail

strategic_objective: must surface lineage metadata as the primary differentiator on every inbound enterprise request

communication_task: should establish "every segment ships with lineage" as the default expectation in mid-market performance marketing

differentiation_logic: could pivot the post-CDP narrative if LiveRamp and The Trade Desk converge on a lineage standard before Q4

target_audience: likely in-house performance marketing leads at Series C+ consumer brands, possibly also at selected B2B SaaS companies
