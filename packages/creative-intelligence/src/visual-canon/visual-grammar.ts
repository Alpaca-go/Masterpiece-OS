/**
 * Visual Grammar.
 *
 * CI-8 Step 22-25: define how DNA elements may combine, vary,
 * repeat, scale, and extend.
 *
 * Visual Grammar is NOT a prompt. It is a rule system.
 *
 * Allowed:
 *   "Maintain a visible relationship between autonomous modules."
 *
 * Forbidden (production prompt leakage):
 *   "Generate a 16:9 poster with 8 modules in the top-left corner."
 */

import type {
  VisualGrammar,
  GrammarRule,
  InvariantLevel,
  CanonDiagnostic,
} from './contracts.ts';
import type { SelectedDirectionSnapshot } from './contracts.ts';

export interface GrammarInput {
  snapshot: SelectedDirectionSnapshot;
}

function rule(
  id: string,
  ruleStatement: string,
  allowed: string[],
  forbidden: string[],
  dnaRefs: string[],
  level: InvariantLevel,
  condition?: string,
): GrammarRule {
  return { id, condition, rule: ruleStatement, allowed, forbidden, dnaRefs, invariantLevel: level };
}

export function extractVisualGrammar(input: GrammarInput): { grammar: VisualGrammar; diagnostics: CanonDiagnostic[] } {
  const diagnostics: CanonDiagnostic[] = [];
  const d = input.snapshot.direction;

  // compositionRules
  const compositionRules: GrammarRule[] = [
    rule(
      'grammar-composition-relation',
      'Maintain the directional relationship grammar across all touchpoints.',
      ['preserve relation logic', 'preserve module/element autonomy'],
      ['collapse into a single hero object', 'redesign relation syntax'],
      ['dna-relation-coherence', 'dna-structural-family'],
      'hard',
    ),
  ];

  // hierarchyRules
  const hierarchyRules: GrammarRule[] = [
    rule(
      'grammar-hierarchy-system',
      'Hierarchy expresses system coordination, not a single dominant object.',
      ['multi-element coordination', 'parallel structure'],
      ['single hero', 'monolithic central element'],
      ['dna-hierarchy-system'],
      'strong',
    ),
  ];

  // repetitionRules
  const repetitionRules: GrammarRule[] = [
    rule(
      'grammar-repetition-allow',
      'Repetition of the system logic is allowed; repetition of a single element is not.',
      ['repetition of system pattern', 'repetition of module family'],
      ['repetition of a single fixed element', 'lockup-style repetition only'],
      ['dna-structural-family'],
      'strong',
    ),
  ];

  // transformationRules
  const transformationRules: GrammarRule[] = [
    rule(
      'grammar-transformation-allow',
      'Transformations may scale, rotate, or restate the system logic.',
      ['scale', 're-proportion', 'restate'],
      ['change underlying system logic', 'introduce new mechanism'],
      ['dna-structural-family'],
      'strong',
    ),
  ];

  // assetUsageRules
  const assetUsageRules: GrammarRule[] = [
    rule(
      'grammar-asset-locked-preserve',
      'Locked assets may only be activated, positioned, repeated, or contextualized — never redesigned.',
      ['preserve', 'activate', 'position', 'repeat', 'contextualize'],
      ['redesign', 'replace', 'distort', 'invent alternate version'],
      ['dna-locked-assets', 'dna-identity-preserve'],
      'hard',
    ),
  ];

  // crossMediaAdaptationRules
  const crossMediaAdaptationRules: GrammarRule[] = [
    rule(
      'grammar-cross-media-relation',
      'Cross-media adaptations must preserve required DNA.',
      ['adapt scale', 'adapt density', 'adapt format ratio'],
      ['change system DNA', 'introduce new direction'],
      ['dna-relation-coherence', 'dna-hierarchy-system'],
      'strong',
    ),
  ];

  // forbiddenCombinations
  const forbiddenCombinations: GrammarRule[] = [
    rule(
      'grammar-forbidden-contradiction',
      'Combining contradicting DNA elements is forbidden.',
      [],
      ['combining identity-rewrite with identity-preserve',
        'combining locked-redesign with locked-preserve',
        'combining new-direction with relation-coherence'],
      ['dna-identity-preserve', 'dna-locked-assets'],
      'hard',
    ),
  ];

  const grammar: VisualGrammar = {
    schemaVersion: '0.1',
    compositionRules,
    hierarchyRules,
    repetitionRules,
    transformationRules,
    assetUsageRules,
    crossMediaAdaptationRules,
    forbiddenCombinations,
    invariants: [
      'Brand identity assets are hard DNA.',
      'Locked assets cannot be redesigned.',
      'Direction family cannot be changed downstream.',
      'Visual mechanism cannot be replaced.',
    ],
  };

  return { grammar, diagnostics };
}
