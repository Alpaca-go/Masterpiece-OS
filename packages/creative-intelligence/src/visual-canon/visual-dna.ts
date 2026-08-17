/**
 * Visual DNA extraction.
 *
 * CI-8 Step 18-21: extract reusable visual invariants from the selected
 * Direction. DNA is semantic/system-level, not pixel implementation specs.
 *
 * Allowed examples:
 *   - "Independent modules remain visually distinct while relation logic
 *      remains visible."
 *   - "Primary identity asset must remain recognizably unchanged."
 *   - "Hierarchy should express system coordination rather than a
 *      single hero object."
 *
 * Forbidden DNA (these are implementation specs, not Canon DNA):
 *   - "Use Pantone 2665 C."
 *   - "Use exactly 40px spacing."
 *   - "Use a 3-column grid at 1440px."
 */

import type {
  VisualDNA,
  VisualDNAElement,
  CanonRule,
  InvariantLevel,
  CanonDiagnostic,
} from './contracts.ts';
import { VISUAL_CANON_TRACE_VERSION } from './contracts.ts';
import type { SelectedDirectionSnapshot } from './contracts.ts';

export interface DNAInput {
  snapshot: SelectedDirectionSnapshot;
  /** Optional list of locked asset keys. */
  lockedKeys?: string[];
}

function makeDna(
  id: string,
  category: string,
  rule: string,
  rationale: string,
  level: InvariantLevel,
  directionRefs: string[],
  factRefs: string[],
  evidenceRefs: string[],
): VisualDNAElement {
  return { id, category, rule, rationale, invariantLevel: level, directionRefs, factRefs, evidenceRefs };
}

export function extractVisualDNA(input: DNAInput): { dna: VisualDNA; diagnostics: CanonDiagnostic[] } {
  const diagnostics: CanonDiagnostic[] = [];
  const d = input.snapshot.direction;

  // 1. structuralDNA: derived from directionFamily + visualMechanism
  const structuralDNA: VisualDNAElement[] = [
    makeDna(
      'dna-structural-family',
      'structural',
      `The brand is expressed through a ${d.directionFamily} system logic.`,
      `Selected directionFamily (${d.directionFamily}) is the foundational structural choice.`,
      'hard',
      [d.id],
      [...d.factRefs],
      [...d.evidenceRefs],
    ),
  ];

  // 2. identityDNA: from brand identity + locked assets
  const identityDNA: VisualDNAElement[] = [
    makeDna(
      'dna-identity-preserve',
      'identity',
      'The locked brand identity assets must remain recognizably unchanged across all media.',
      'Identity is hard DNA; it must not be reinterpreted downstream.',
      'hard',
      [d.id],
      [...d.factRefs],
      [...d.evidenceRefs],
    ),
    makeDna(
      'dna-identity-role',
      'identity',
      'The brand role defined by project truth must be expressed consistently.',
      'Brand role is core identity DNA, not a cosmetic style choice.',
      'hard',
      [d.id],
      [...d.factRefs],
      [...d.evidenceRefs],
    ),
  ];

  if (input.lockedKeys && input.lockedKeys.length > 0) {
    identityDNA.push(makeDna(
      'dna-locked-assets',
      'identity',
      'Locked assets (logo, brand colors, etc.) are hard DNA and may only be activated, positioned, repeated, or contextualized — never redesigned.',
      'Locked assets carry pre-authorized brand identity that must remain stable.',
      'hard',
      [d.id],
      [...d.factRefs],
      [...d.evidenceRefs],
    ));
  }

  // 3. rhythmDNA: from compositionLogic / crossMediaBehavior
  const rhythmDNA: VisualDNAElement[] = d.compositionLogic
    ? [makeDna(
        'dna-rhythm-composition',
        'rhythm',
        'Composition establishes the rhythm of the system; downstream may scale but must not contradict this rhythm.',
        'Composition logic from the selected direction is the baseline rhythm DNA.',
        'strong',
        [d.id],
        [...d.factRefs],
        [...d.evidenceRefs],
      )]
    : [];

  // 4. hierarchyDNA: from directionFamily system logic
  const hierarchyDNA: VisualDNAElement[] = [
    makeDna(
      'dna-hierarchy-system',
      'hierarchy',
      'Hierarchy should express the system coordination logic rather than a single dominant hero object.',
      `Direction ${d.directionFamily} expresses multi-element coordination, not single hero.`,
      'strong',
      [d.id],
      [...d.factRefs],
      [...d.evidenceRefs],
    ),
  ];

  // 5. relationDNA: from crossMediaBehavior
  const relationDNA: VisualDNAElement[] = [
    makeDna(
      'dna-relation-coherence',
      'relation',
      'All touchpoints share the same underlying relation logic; only execution may vary.',
      `Direction crossMediaBehavior = ${d.crossMediaBehavior.join(', ')} — all must remain coherent.`,
      'strong',
      [d.id],
      [...d.factRefs],
      [...d.evidenceRefs],
    ),
  ];

  // 6. colorDNA (optional): from colorRelationship
  const colorDNA: VisualDNAElement[] | undefined = d.colorRelationship
    ? [makeDna(
        'dna-color-relation',
        'color',
        'Color relationships express the system logic; specific palette may vary per touchpoint as long as the relationship is preserved.',
        'Color relationship is system DNA, not a fixed palette.',
        'strong',
        [d.id],
        [...d.factRefs],
        [...d.evidenceRefs],
      )]
    : undefined;

  // 7. materialDNA (optional)
  const materialDNA: VisualDNAElement[] | undefined = d.materialRelationship
    ? [makeDna(
        'dna-material-relation',
        'material',
        'Material relationships express the system logic; specific materials may vary per touchpoint as long as the relationship is preserved.',
        'Material relationship is system DNA, not a fixed material spec.',
        'adaptive',
        [d.id],
        [...d.factRefs],
        [...d.evidenceRefs],
      )]
    : undefined;

  // 8. graphicDNA (optional)
  const graphicDNA: VisualDNAElement[] | undefined = d.graphicBehavior
    ? [makeDna(
        'dna-graphic-behavior',
        'graphic',
        'Graphic behavior expresses how supporting marks, icons, and auxiliary elements relate to the core system.',
        'Graphic behavior is system DNA, not a specific graphic style.',
        'strong',
        [d.id],
        [...d.factRefs],
        [...d.evidenceRefs],
      )]
    : undefined;

  // Required IDs: all hard DNA
  const requiredElementIds = [
    'dna-structural-family',
    'dna-identity-preserve',
    'dna-identity-role',
    'dna-hierarchy-system',
    'dna-relation-coherence',
    ...(input.lockedKeys && input.lockedKeys.length > 0 ? ['dna-locked-assets'] : []),
  ];

  const dna: VisualDNA = {
    schemaVersion: '0.1',
    structuralDNA,
    identityDNA,
    rhythmDNA,
    hierarchyDNA,
    relationDNA,
    colorDNA,
    materialDNA,
    graphicDNA,
    requiredElementIds,
    optionalElementIds: [
      'dna-rhythm-composition',
      'dna-color-relation',
      'dna-material-relation',
      'dna-graphic-behavior',
    ].filter((id) => !requiredElementIds.includes(id)),
    forbiddenMutations: [
      'New visual mechanism',
      'New direction family',
      'New brand identity',
      'Locked asset redesign / replacement / distortion',
      'Identity-distorting language',
    ],
  };

  return { dna, diagnostics };
}
