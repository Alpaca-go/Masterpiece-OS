/**
 * Visual Evidence Contribution (CI-W1C.5 PART E).
 *
 * Per spec §14: this is a NEW structured contribution that surfaces
 * project-specific visual evidence (from visualDecisionPacket.assetInventory)
 * to downstream Need / Insight / Opportunity / Concept / Direction layers.
 *
 * Frozen surfaces (per spec §5):
 *   - DVC schema (visualDecisionPacket lives outside DVC; we read it
 *     directly from project-visual-context.vnext.json — NOT from DVC's
 *     visualPreferences string)
 *   - Truth taxonomy (we do NOT add new canonical keys; visual facts are
 *     keyed under existing visual.* namespace + a structured per-item form)
 *   - Conflict Detector, Concept Gate critical semantics, CI-7 Evaluation,
 *     Selection, Canon schema, Anchor, Image Runtime, Translation, Consumers,
 *     CI-10
 *
 * Why this is the smallest repair:
 *   - It is a NEW file. No existing surface is modified for the contribution
 *     itself.
 *   - The integration is via the existing `runNicePipeline(input)` shape,
 *     which already accepts a `visual` field — we just populate it with
 *     structured per-item facts that downstream builders can consume.
 *   - Downstream builders (need / insight / concept / direction) get a
 *     minimal additive rule: read the new contribution's observedFacts
 *     and (optionally) inferredMeanings; do not change existing behavior
 *     for the non-visual path.
 *
 * Authority classification (per spec §13):
 *   - observedFacts: VISUAL_SOURCE_FACT (structured analysis, confidence >= 0.8)
 *   - inferredMeanings: MODEL_INFERENCE (model-derivable, NOT user-confirmed)
 *
 * Architecture rule (per spec §2):
 *   - This module does NOT allow direct bypass of Need / Insight / Opportunity
 *     / Concept to Direction. It only produces per-item facts that go
 *     THROUGH the existing CI-4 / CI-5 / CI-6 pipeline.
 *
 * Pure functions only. No model calls. No IO except reading the vnext JSON
 * if a path is provided.
 */

import type { ProjectTruthFact } from '../truth/contracts.ts';

/** A single observed visual evidence item. */
export interface VisualObservedFact {
  /** Stable kind: 'color' | 'logo' | 'typography' | 'motif' | 'imagery' | 'layout' | 'material' */
  kind: string;
  /** Human-readable statement (zh-CN). */
  statement: string;
  /** Stable source reference (visualDecisionPacket path + assetId). */
  sourceRef: string;
  /** Source confidence [0, 1]. */
  confidence: number;
  /** Authority classification. */
  epistemicClass: 'VISUAL_SOURCE_FACT';
  /** Asset id (from visualDecisionPacket.assetInventory.*.assetId). */
  assetId: string;
  /** Frequency in source assets. */
  frequency: number;
  /** Optional visual features (freeform). */
  visualFeatures: string[];
}

/** A model-inferred meaning (NOT user-confirmed). */
export interface VisualInferredMeaning {
  /** Human-readable statement. */
  statement: string;
  /** Stable source reference. */
  sourceRef: string;
  /** Inference confidence [0, 1]. */
  confidence: number;
  /** Authority classification. */
  epistemicClass: 'MODEL_INFERENCE';
  /** Asset id this meaning is derived from. */
  assetId: string;
}

/** Structured visual evidence contribution. */
export interface VisualEvidenceContribution {
  /** Project id (matches the run project). */
  projectId: string;
  /** Source of the contribution. */
  source: 'visual_decision_packet';
  /** vnext.json schemaVersion at extraction time. */
  vnextSchemaVersion: string;
  /** vnext.json `version` field. */
  vnextVersion: number;
  /** Per-item observed facts (VISUAL_SOURCE_FACT). */
  observedFacts: VisualObservedFact[];
  /** Per-item inferred meanings (MODEL_INFERENCE). */
  inferredMeanings: VisualInferredMeaning[];
}

/** Shape of the vnext.json we consume. */
interface VnextShape {
  schemaVersion?: string;
  version?: number;
  visualDecisionPacket?: {
    projectFacts?: Record<string, unknown>;
    assetInventory?: {
      logoAssets?: Array<{
        assetId: string;
        name?: string;
        frequency?: number;
        visualFeatures?: string[];
        possibleBrandMeaning?: string[];
      }>;
      colorAssets?: Array<{
        assetId: string;
        name?: string;
        frequency?: number;
        visualFeatures?: string[];
        possibleBrandMeaning?: string[];
      }>;
      typographyAssets?: Array<{
        assetId: string;
        name?: string;
        frequency?: number;
        visualFeatures?: string[];
        possibleBrandMeaning?: string[];
      }>;
      graphicMotifs?: Array<{
        assetId: string;
        name?: string;
        frequency?: number;
        visualFeatures?: string[];
        possibleBrandMeaning?: string[];
      }>;
      imageryAssets?: Array<{
        assetId: string;
        name?: string;
        frequency?: number;
        visualFeatures?: string[];
        possibleBrandMeaning?: string[];
      }>;
      layoutPatterns?: Array<{
        assetId: string;
        name?: string;
        frequency?: number;
        visualFeatures?: string[];
        possibleBrandMeaning?: string[];
      }>;
      materialCues?: Array<{
        assetId: string;
        name?: string;
        frequency?: number;
        visualFeatures?: string[];
        possibleBrandMeaning?: string[];
      }>;
    };
  };
}

const KIND_PATHS = [
  { kind: 'logo', path: 'logoAssets' as const },
  { kind: 'color', path: 'colorAssets' as const },
  { kind: 'typography', path: 'typographyAssets' as const },
  { kind: 'motif', path: 'graphicMotifs' as const },
  { kind: 'imagery', path: 'imageryAssets' as const },
  { kind: 'layout', path: 'layoutPatterns' as const },
  { kind: 'material', path: 'materialCues' as const },
];

function buildStatement(
  kind: string,
  name: string | undefined,
  features: string[] | undefined,
  assetId: string,
): string {
  const namePart = name ?? `${kind} ${assetId.slice(0, 8)}`;
  if (features && features.length > 0) {
    return `${namePart}（${features.join(' | ')}）`;
  }
  return namePart;
}

/**
 * Build a VisualEvidenceContribution from a vnext.json shape.
 * Pure function. No IO.
 *
 * @param projectId Project id (becomes contribution.projectId).
 * @param vnext The parsed vnext.json content.
 * @param vnextAssetInventoryPath The path used in sourceRef (e.g.
 *   "project-visual-context.vnext.json#visualDecisionPacket.assetInventory").
 *   Defaults to a standard path.
 */
export function buildVisualEvidenceContribution(
  projectId: string,
  vnext: VnextShape,
  vnextAssetInventoryPath: string = 'project-visual-context.vnext.json#visualDecisionPacket.assetInventory',
): VisualEvidenceContribution {
  const observedFacts: VisualObservedFact[] = [];
  const inferredMeanings: VisualInferredMeaning[] = [];
  const inventory = vnext.visualDecisionPacket?.assetInventory;
  if (inventory) {
    for (const { kind, path } of KIND_PATHS) {
      const items = inventory[path] ?? [];
      for (const item of items) {
        const sourceRef = `${vnextAssetInventoryPath}.${path}[${items.indexOf(item)}]`;
        const statement = buildStatement(kind, item.name, item.visualFeatures, item.assetId);
        const confidence = 0.8; // visualDecisionPacket items are structured-analysis output
        observedFacts.push({
          kind,
          statement,
          sourceRef,
          confidence,
          epistemicClass: 'VISUAL_SOURCE_FACT',
          assetId: item.assetId,
          frequency: item.frequency ?? 1,
          visualFeatures: item.visualFeatures ?? [],
        });
        // Inferred meanings: split possibleBrandMeaning into separate facts.
        for (const meaning of item.possibleBrandMeaning ?? []) {
          inferredMeanings.push({
            statement: meaning,
            sourceRef,
            confidence,
            epistemicClass: 'MODEL_INFERENCE',
            assetId: item.assetId,
          });
        }
      }
    }
  }
  return {
    projectId,
    source: 'visual_decision_packet',
    vnextSchemaVersion: vnext.schemaVersion ?? 'unknown',
    vnextVersion: vnext.version ?? 0,
    observedFacts,
    inferredMeanings,
  };
}

/**
 * Convert the contribution's observedFacts + inferredMeanings to a list of
 * ProjectTruthFact objects that can be MERGED into the existing `facts` array
 * for derivation. These facts are NOT persisted to the truth.json on disk —
 * they are surfaced in-memory only for the current pipeline run.
 *
 * Fact key namespace: `visualAsset.<kind>` (e.g. `visualAsset.color`,
 * `visualAsset.logo`, etc.). The value is a list of `{assetId, statement}`.
 *
 * Authority:
 *   - visualAsset.* facts are VISUAL_SOURCE_FACT
 *   - visualAssetMeaning.* facts are MODEL_INFERENCE
 */
export function contributionToTruthFacts(
  contribution: VisualEvidenceContribution,
): ProjectTruthFact[] {
  const facts: ProjectTruthFact[] = [];
  // Group observed facts by kind
  const byKind = new Map<string, VisualObservedFact[]>();
  for (const f of contribution.observedFacts) {
    if (!byKind.has(f.kind)) byKind.set(f.kind, []);
    byKind.get(f.kind)!.push(f);
  }
  for (const [kind, items] of byKind) {
    const key = `visualAsset.${kind}`;
    const value = items.map((i) => ({
      assetId: i.assetId,
      statement: i.statement,
      frequency: i.frequency,
      sourceRef: i.sourceRef,
    }));
    facts.push({
      id: `${key}:${contribution.projectId}:contribution`,
      key,
      value,
      truthClass: 'fact',
      status: 'observed',
      authority: 'VISUAL_SOURCE_FACT',
      sourceType: 'visual_understanding_core',
      sourceId: contribution.projectId,
      evidenceRefs: items.map((i) => i.sourceRef),
      isReferenceFact: false,
      createdAt: new Date().toISOString(),
    } as ProjectTruthFact);
  }
  // Inferred meanings (separate key namespace; lower authority)
  if (contribution.inferredMeanings.length > 0) {
    const meaningKey = 'visualAssetMeaning.all';
    const value = contribution.inferredMeanings.map((m) => ({
      assetId: m.assetId,
      statement: m.statement,
      sourceRef: m.sourceRef,
    }));
    facts.push({
      id: `${meaningKey}:${contribution.projectId}:contribution`,
      key: meaningKey,
      value,
      truthClass: 'inference',
      status: 'observed',
      authority: 'MODEL_INFERENCE',
      sourceType: 'visual_understanding_core',
      sourceId: contribution.projectId,
      evidenceRefs: contribution.inferredMeanings.map((m) => m.sourceRef),
      isReferenceFact: false,
      createdAt: new Date().toISOString(),
    } as ProjectTruthFact);
  }
  return facts;
}
