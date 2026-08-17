/**
 * Build Anchor Contract.
 *
 * CI-8 Step 39-42: build AnchorContract from VisualCanon.
 *
 * Anchor Contract is an acceptance contract, NOT a prompt.
 * It defines what an eventual Anchor must prove visually.
 *
 * No image generation, no provider call, no prompt.
 */

import type {
  AnchorContract,
  AnchorDiagnostic,
  AnchorEvaluationCriterion,
  AnchorStatus,
} from './contracts.ts';
import { ANCHOR_CONTRACT_TRACE_VERSION } from './contracts.ts';
import type { SelectedDirectionSnapshot } from '../visual-canon/contracts.ts';
import type { VisualCanon } from '../visual-canon/contracts.ts';
import { validateAnchor } from './anchor-validator.ts';
import { detectAnchorLeakage } from './anchor-boundary.ts';

export interface BuildAnchorInput {
  projectId: string;
  canon: VisualCanon;
  snapshot: SelectedDirectionSnapshot;
}

export interface BuildAnchorResult {
  anchor: AnchorContract | null;
  status: AnchorStatus | null;
  diagnostics: AnchorDiagnostic[];
}

function makeCriteria(canon: VisualCanon): AnchorEvaluationCriterion[] {
  const criteria: AnchorEvaluationCriterion[] = [];

  // Structural family criterion
  criteria.push({
    id: 'anchor-criterion-family',
    criterion: `Anchor must demonstrate the ${canon.directionFamily} structural family.`,
    sourceRefs: ['directionFamily'],
    severity: 'hard',
  });

  // Visual mechanism criterion
  criteria.push({
    id: 'anchor-criterion-visual-mechanism',
    criterion: 'Anchor must demonstrate the selected visual mechanism.',
    sourceRefs: ['visualMechanism'],
    severity: 'hard',
  });

  // Locked assets
  for (const lar of canon.lockedAssetRules) {
    criteria.push({
      id: `anchor-criterion-locked-${lar.assetType}`,
      criterion: `Anchor must preserve locked ${lar.assetType} identity without modification.`,
      sourceRefs: lar.factRefs,
      severity: 'hard',
    });
  }

  // DNA mustPreserve criterion
  for (const dnaId of canon.visualDNA.requiredElementIds) {
    criteria.push({
      id: `anchor-criterion-dna-${dnaId}`,
      criterion: `Anchor must preserve required DNA: ${dnaId}.`,
      sourceRefs: [dnaId],
      severity: 'hard',
    });
  }

  // CrossMedia proof
  criteria.push({
    id: 'anchor-criterion-crossmedia',
    criterion: 'Anchor must demonstrate cross-media coherence (DNA preserved across all touchpoints).',
    sourceRefs: ['crossMediaCanon'],
    severity: 'strong',
  });

  return criteria;
}

function buildAnchor(input: BuildAnchorInput): AnchorContract {
  const d = input.snapshot.direction;
  const canon = input.canon;

  const mustDemonstrate: string[] = [
    `The ${canon.directionFamily} visual mechanism: ${canon.visualMechanism.slice(0, 120)}`,
    `Independent modules + visible ${canon.directionFamily} relation logic`,
    'Preserved locked brand identity',
    'Cross-media extensibility',
  ];

  const mustPreserve: string[] = [
    'Brand identity assets',
    `${canon.directionFamily} direction family`,
    'Visual mechanism',
    'Locked asset identity',
  ];

  const mayExplore: string[] = [
    'Scale',
    'Density',
    'Framing',
    'Image/content balance',
    'Format ratio',
  ];

  const mustNotChange: string[] = [
    'Core logo identity',
    `${canon.directionFamily} direction family`,
    'Selected visual mechanism',
    'Locked assets',
    'Brand role',
  ];

  const requiredDNARefs = [...canon.visualDNA.requiredElementIds];
  const requiredGrammarRefs = [
    ...canon.visualGrammar.compositionRules.filter((r) => r.invariantLevel === 'hard').map((r) => r.id),
    ...canon.visualGrammar.assetUsageRules.filter((r) => r.invariantLevel === 'hard').map((r) => r.id),
    ...canon.visualGrammar.forbiddenCombinations.map((r) => r.id),
  ];
  const lockedAssetRefs = canon.lockedAssetRules.map((r) => r.assetType);

  const crossMediaProof: string[] = [
    'Brand identity preserved across all touchpoints',
    'Direction family and visual mechanism remain consistent',
    'Locked assets not redesigned for any media',
  ];

  const anchor: AnchorContract = {
    schemaVersion: '0.1',
    projectId: input.projectId,
    selectedDirectionId: d.id,
    selectionRevision: input.snapshot.selectionRevision,
    purpose: `Validate the selected ${canon.directionFamily} Direction by demonstrating its visual mechanism while preserving all required DNA and Locked Asset identity.`,
    mustDemonstrate,
    mustPreserve,
    mayExplore,
    mustNotChange,
    requiredDNARefs,
    requiredGrammarRefs,
    lockedAssetRefs,
    crossMediaProof,
    evaluationCriteria: makeCriteria(canon),
    status: 'ready', // Will be updated by validator
    authoritative: false,
    mode: 'shadow',
  };

  return anchor;
}

export function buildAnchorContract(input: BuildAnchorInput): BuildAnchorResult {
  const diagnostics: AnchorDiagnostic[] = [];

  // Final prompt leakage check on the output (defense-in-depth)
  const draft = buildAnchor(input);
  const leak = detectAnchorLeakage(draft);
  if (leak.field) {
    diagnostics.push({
      code: 'ANCHOR_CONTRACT_PROMPT_LEAKAGE',
      message: `Anchor contract contains forbidden field: ${leak.field}`,
      field: leak.field ?? undefined,
    });
  }
  if (leak.text) {
    diagnostics.push({
      code: 'ANCHOR_CONTRACT_PROMPT_LEAKAGE',
      message: `Anchor contract contains forbidden text: ${leak.text.slice(0, 60)}`,
    });
  }

  // Validate
  const validation = validateAnchor({ anchor: draft, canon: input.canon, snapshot: input.snapshot });
  diagnostics.push(...validation.diagnostics);

  // Update status
  draft.status = validation.status;

  if (validation.status === 'blocked') {
    return { anchor: null, status: validation.status, diagnostics };
  }

  draft.traceVersion = ANCHOR_CONTRACT_TRACE_VERSION;
  return { anchor: draft, status: validation.status, diagnostics };
}
