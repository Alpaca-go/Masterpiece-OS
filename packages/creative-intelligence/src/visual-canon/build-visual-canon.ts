/**
 * Build Visual Canon orchestrator.
 *
 * CI-8 Step 14-21: build VisualCanon from SelectedDirectionSnapshot.
 *
 * Hard rules:
 *   - Snapshot is the SOLE source. Recommendation is advisory only.
 *   - Canon may clarify / normalize / formalize / classify.
 *   - Canon may NOT invent a new visual mechanism, family, or brand.
 *   - No prompt leakage.
 */

import type {
  VisualCanon,
  CanonRule,
  CanonDiagnostic,
  CanonStatus,
  LockedAssetCanonRule,
  VisualDNA,
  VisualGrammar,
  CrossMediaCanon,
  CanonTrace,
} from './contracts.ts';
import type { SelectedDirectionSnapshot } from './contracts.ts';
import type { ProjectTruthFact } from '../truth/contracts.ts';
import type { EvidenceLedgerEntry } from '../evidence/contracts.ts';
import { buildCanonTraceFromSnapshot } from './selected-direction-snapshot.ts';
import { extractVisualDNA } from './visual-dna.ts';
import { extractVisualGrammar } from './visual-grammar.ts';
import { buildCrossMediaCanon } from './cross-media-canon.ts';
import { validateCanon } from './canon-validator.ts';

export interface BuildCanonInput {
  projectId: string;
  snapshot: SelectedDirectionSnapshot;
  facts: ProjectTruthFact[];
  evidence: EvidenceLedgerEntry[];
  lockedAssetKeys?: string[];
}

function buildCanonRule(
  id: string,
  statement: string,
  sourceField: string,
  level: 'hard' | 'strong' | 'adaptive',
  factRefs: string[],
  evidenceRefs: string[],
  allowedVariation?: string[],
  prohibitedVariation?: string[],
): CanonRule {
  return {
    id,
    statement,
    sourceField,
    invariantLevel: level,
    allowedVariation,
    prohibitedVariation,
    factRefs,
    evidenceRefs,
  };
}

function buildBehaviorCanonRules(
  snapshot: SelectedDirectionSnapshot,
  facts: ProjectTruthFact[],
  evidence: EvidenceLedgerEntry[],
): CanonRule[] {
  const d = snapshot.direction;
  const factRefs = [...d.factRefs];
  const evidenceRefs = [...d.evidenceRefs];
  const rules: CanonRule[] = [];

  if (d.colorRelationship) {
    rules.push(buildCanonRule(
      'canon-color-relationship',
      d.colorRelationship,
      'colorRelationship',
      'strong',
      factRefs, evidenceRefs,
      ['adapt saturation', 'adapt contrast', 'adapt supporting hues'],
      ['change relationship', 'introduce competing color system'],
    ));
  }

  if (d.materialRelationship) {
    rules.push(buildCanonRule(
      'canon-material-relationship',
      d.materialRelationship,
      'materialRelationship',
      'adaptive',
      factRefs, evidenceRefs,
      ['adapt surface finish', 'substitute within same material family'],
      ['change material relationship', 'introduce contradicting material logic'],
    ));
  }

  if (d.compositionLogic) {
    rules.push(buildCanonRule(
      'canon-composition-logic',
      d.compositionLogic,
      'compositionLogic',
      'strong',
      factRefs, evidenceRefs,
      ['scale', 're-proportion', 'adapt density'],
      ['change composition logic', 'invert hierarchy'],
    ));
  }

  if (d.typographyBehavior) {
    rules.push(buildCanonRule(
      'canon-typography-behavior',
      d.typographyBehavior,
      'typographyBehavior',
      'strong',
      factRefs, evidenceRefs,
      ['adapt scale to medium', 'adapt density'],
      ['change typography behavior', 'introduce contradicting typographic logic'],
    ));
  }

  if (d.graphicBehavior) {
    rules.push(buildCanonRule(
      'canon-graphic-behavior',
      d.graphicBehavior,
      'graphicBehavior',
      'strong',
      factRefs, evidenceRefs,
      ['adapt supporting marks', 'adapt icon system'],
      ['change graphic behavior', 'introduce contradicting graphic logic'],
    ));
  }

  if (d.imageBehavior) {
    rules.push(buildCanonRule(
      'canon-image-behavior',
      d.imageBehavior,
      'imageBehavior',
      'adaptive',
      factRefs, evidenceRefs,
      ['adapt crop', 'adapt content density', 'adapt format ratio'],
      ['change image behavior', 'introduce new visual mechanism'],
    ));
  }

  return rules;
}

function buildLockedAssetRules(
  lockedKeys: string[],
  facts: ProjectTruthFact[],
  evidence: EvidenceLedgerEntry[],
): LockedAssetCanonRule[] {
  if (lockedKeys.length === 0) return [];
  return lockedKeys.map((key) => {
    const factRefs = facts.filter((f) => f.key === key && f.authority === 'LOCKED').map((f) => f.id);
    const evidenceRefs = evidence.filter((e) => e.factIds.some((fid) => factRefs.includes(fid))).map((e) => e.id);
    return {
      assetType: key,
      action: 'preserve' as const,
      prohibitedActions: [
        'redesign',
        'replace',
        'distort identity',
        'invent alternate version',
      ],
      factRefs,
      evidenceRefs,
    };
  });
}

export interface BuildCanonResult {
  canon: VisualCanon | null;
  status: CanonStatus | null;
  diagnostics: CanonDiagnostic[];
  dna: VisualDNA | null;
  grammar: VisualGrammar | null;
  crossMedia: CrossMediaCanon | null;
}

export function buildVisualCanon(input: BuildCanonInput): BuildCanonResult {
  const diagnostics: CanonDiagnostic[] = [];
  const d = input.snapshot.direction;

  // Step 1: Build DNA
  const dnaResult = extractVisualDNA({ snapshot: input.snapshot, lockedKeys: input.lockedAssetKeys });
  diagnostics.push(...dnaResult.diagnostics);

  // Step 2: Build Grammar
  const grammarResult = extractVisualGrammar({ snapshot: input.snapshot });
  diagnostics.push(...grammarResult.diagnostics);

  // Step 3: Build Cross-Media Canon
  const crossMediaResult = buildCrossMediaCanon({ snapshot: input.snapshot });
  diagnostics.push(...crossMediaResult.diagnostics);

  // Step 4: Build behavior CanonRules
  const behaviorRules = buildBehaviorCanonRules(input.snapshot, input.facts, input.evidence);

  // Step 5: Build locked asset rules
  const lockedAssetRules = buildLockedAssetRules(input.lockedAssetKeys ?? [], input.facts, input.evidence);

  // Step 6: Assemble Canon
  const trace = buildCanonTraceFromSnapshot(input.snapshot);
  const behaviorById = new Map(behaviorRules.map((r) => [r.id, r]));

  const canon: VisualCanon = {
    schemaVersion: '0.1',
    projectId: input.projectId,
    selectedDirectionId: d.id,
    selectionRevision: input.snapshot.selectionRevision,
    creativeThesis: d.thesis,
    visualMechanism: d.visualMechanism,
    systemHypothesis: d.systemHypothesis,
    directionFamily: d.directionFamily,
    colorRelationship: behaviorById.get('canon-color-relationship'),
    materialRelationship: behaviorById.get('canon-material-relationship'),
    compositionLogic: behaviorById.get('canon-composition-logic'),
    typographyBehavior: behaviorById.get('canon-typography-behavior'),
    graphicBehavior: behaviorById.get('canon-graphic-behavior'),
    imageBehavior: behaviorById.get('canon-image-behavior'),
    visualDNA: dnaResult.dna,
    visualGrammar: grammarResult.grammar,
    crossMediaCanon: crossMediaResult.canon,
    lockedAssetRules,
    prohibitedMutations: [
      'New visual mechanism',
      'New direction family',
      'New brand identity',
      'Locked asset redesign / replacement / distortion',
      'Anchor image generation',
      'Production prompt / Space prompt / Packaging prompt',
    ],
    trace,
    status: 'valid', // Will be updated by validator
    authoritative: false,
    mode: 'shadow',
  };

  // Step 7: Validate
  const validation = validateCanon({
    canon,
    snapshot: input.snapshot,
    facts: input.facts,
    evidence: input.evidence,
    lockedAssetKeys: input.lockedAssetKeys ?? [],
  });
  diagnostics.push(...validation.diagnostics);

  // Update canon status
  canon.status = validation.status;

  if (validation.status === 'blocked') {
    return {
      canon: null,
      status: validation.status,
      diagnostics,
      dna: dnaResult.dna,
      grammar: grammarResult.grammar,
      crossMedia: crossMediaResult.canon,
    };
  }

  return {
    canon,
    status: validation.status,
    diagnostics,
    dna: dnaResult.dna,
    grammar: grammarResult.grammar,
    crossMedia: crossMediaResult.canon,
  };
}
