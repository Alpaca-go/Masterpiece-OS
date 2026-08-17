/**
 * Tradeoff Analysis.
 *
 * CI-7 Step 18: per-direction tradeoff summary.
 *
 * Tradeoff analysis is advisory only. It does not affect scoring or ranking.
 */

import type { DirectionEvaluationItem } from './contracts.ts';

export interface DirectionTradeoff {
  directionId: string;
  advantages: string[];
  disadvantages: string[];
  advisoryOnly: true;
}

export function buildTradeoffAnalysis(
  evaluations: DirectionEvaluationItem[],
): DirectionTradeoff[] {
  return evaluations.map((e) => {
    const advantages: string[] = [];
    const disadvantages: string[] = [];

    for (const [name, dim] of Object.entries(e.dimensions)) {
      if (dim.score === 3) advantages.push(`${name}: ${dim.reason}`);
      if (dim.score <= 1) disadvantages.push(`${name}: ${dim.reason}`);
    }

    return {
      directionId: e.directionId,
      advantages,
      disadvantages,
      advisoryOnly: true,
    };
  });
}
