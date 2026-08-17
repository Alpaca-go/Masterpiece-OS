/**
 * Cross-Media Canon.
 *
 * CI-8 Step 26-30: define what remains invariant and what may adapt
 * across VI / campaign / editorial / digital / space / packaging.
 *
 * Each touchpoint has:
 *   - mustPreserve: hard DNA
 *   - mayAdapt: strong/adaptive DNA + execution
 *   - mustNotIntroduce: prohibited mutations
 *
 * No production specs.
 */

import type {
  CrossMediaCanon,
  CrossMediaAdaptation,
  CanonDiagnostic,
} from './contracts.ts';
import type { SelectedDirectionSnapshot } from './contracts.ts';
import type { CrossMediaTouchpoint } from '../direction-intelligence/contracts.ts';

const DEFAULT_TOUCHPOINTS: CrossMediaTouchpoint[] = [
  'brand/VI', 'campaign/poster', 'editorial', 'digital/UI', 'space', 'packaging',
];

export interface CrossMediaInput {
  snapshot: SelectedDirectionSnapshot;
}

function buildAdaptation(touchpoint: CrossMediaTouchpoint): CrossMediaAdaptation {
  // Base invariants for every touchpoint
  const mustPreserve: string[] = [
    'Brand identity and locked assets',
    'Direction family and visual mechanism',
    'Relation logic and hierarchy DNA',
  ];

  // Touchpoint-specific may-adapt rules
  const mayAdapt: string[] = [
    'Scale',
    'Format ratio',
    'Content density',
    'Surface implementation',
  ];

  // Touchpoint-specific mustNotIntroduce rules
  const mustNotIntroduce: string[] = [
    'New direction family',
    'New visual mechanism',
    'New brand identity',
    'Redesign of locked assets',
  ];

  // Space-specific boundary (Spec #29)
  if (touchpoint === 'space') {
    mustPreserve.push('Relational hierarchy');
    mustPreserve.push('Locked identity assets');
    mayAdapt.push('Physical scale');
    mayAdapt.push('Material density (within DNA relationship)');
    mustNotIntroduce.push('Specific lobby layout');
    mustNotIntroduce.push('Exact material specification');
    mustNotIntroduce.push('Camera angle');
    mustNotIntroduce.push('Lighting prompt');
  }

  // Packaging-specific boundary (Spec #30)
  if (touchpoint === 'packaging') {
    mustPreserve.push('Modular identity grammar');
    mustPreserve.push('Required brand hierarchy');
    mayAdapt.push('Information density');
    mustNotIntroduce.push('Specific box geometry');
    mustNotIntroduce.push('Shot contract');
    mustNotIntroduce.push('Render prompt');
  }

  // Digital-specific
  if (touchpoint === 'digital/UI') {
    mustPreserve.push('Interaction grammar relation logic');
    mayAdapt.push('Screen size');
    mayAdapt.push('Interaction density');
    mustNotIntroduce.push('New visual mechanism');
  }

  return { mustPreserve, mayAdapt, mustNotIntroduce };
}

export function buildCrossMediaCanon(input: CrossMediaInput): { canon: CrossMediaCanon; diagnostics: CanonDiagnostic[] } {
  const diagnostics: CanonDiagnostic[] = [];
  const d = input.snapshot.direction;

  // The Direction's crossMediaBehavior may include or exclude touchpoints.
  // We always include all 6 standard touchpoints but mark whether the
  // selected direction explicitly engaged each one.
  const directionTouchpoints = new Set(d.crossMediaBehavior);

  const adaptations: Partial<Record<CrossMediaTouchpoint, CrossMediaAdaptation>> = {};
  for (const tp of DEFAULT_TOUCHPOINTS) {
    const baseAdaptation = buildAdaptation(tp);
    if (!directionTouchpoints.has(tp)) {
      // Direction did not engage this touchpoint; mark as provisional.
      adaptations[tp] = {
        ...baseAdaptation,
        mustPreserve: [
          ...baseAdaptation.mustPreserve,
          `(Direction did not explicitly engage ${tp}; rules are provisional)`,
        ],
      };
    } else {
      adaptations[tp] = baseAdaptation;
    }
  }

  const canon: CrossMediaCanon = {
    invariants: [
      'Brand identity assets are invariant across all media',
      'Direction family and visual mechanism are invariant',
      'Relation logic and hierarchy DNA are invariant',
      'Locked assets cannot be redesigned',
    ],
    adaptations: adaptations as Record<CrossMediaTouchpoint, CrossMediaAdaptation>,
  };

  return { canon, diagnostics };
}
