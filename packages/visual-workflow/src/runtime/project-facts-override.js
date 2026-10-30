// Deterministic application of user-supplied project facts to the analysis
// packet.
//
// The 2026-10-30 smoke showed the model does not treat the supplied facts as
// authoritative even when they sit in brandFacts.factualConstraints: it still
// listed ceiling height and budget as open questions and cited "200 sqm" from
// the material evidence while the project fact said 120 sqm. Sending facts and
// letting the model ignore them is worse than not sending them, because the
// report then carries a fact and a contradicting inference at once.
//
// So the facts are applied here, after the model returns and before the packet
// and the compiled visual context are written:
// - each fact becomes a projectFacts entry with source user_provided,
// - assumptions and open questions that ask about those topics are removed
//   (they are answered now) and replaced with one line pointing at the facts,
// - evidence-based area numbers that contradict a supplied area are kept for
//   traceability but annotated as superseded.
//
// The function is pure and idempotent, and returns the same object when the
// project has no facts, so projects without facts keep their packet unchanged.

import { projectFactEntries } from './project-facts.js';

const FACT_TOPIC = /(面积|层高|净高|柱网|方米|平方|㎡|平米|排烟|通风|时段|晚市|午市|早餐|夜宵|全天|预算|造价|堂食|外带)/u;
const CANONICAL_NOTE = '面积、层高、尺寸、预算、时段与排烟条件以项目事实为准（用户提供）。';
const AREA_PATTERN = /(\d+(?:\.\d+)?)\s*(㎡|平方米|平米)/u;

function factsSignature(packet) {
  const applied = packet?.projectFactsApplied;
  if (!applied || !Array.isArray(applied.fields)) return '';
  return applied.fields.map((item) => `${item.field}=${item.text}`).sort().join('|');
}

export function applyProjectFactsToPacket(packet, facts, options = {}) {
  if (!packet || typeof packet !== 'object') return packet;
  const entries = projectFactEntries(facts);
  if (!entries.length) return packet;
  if (factsSignature(packet) === entries.map((item) => `${item.field}=${item.text}`).sort().join('|')) return packet;

  const appliedAt = options.appliedAt || new Date().toISOString();
  const removedAssumptions = [];
  const removedQuestions = [];
  const conflicts = [];

  for (const entry of entries) {
    packet.projectFacts = packet.projectFacts && typeof packet.projectFacts === 'object' ? packet.projectFacts : {};
    packet.projectFacts[entry.field] = {
      value: entry.text,
      ...(entry.unit ? { unit: entry.unit } : {}),
      source: 'user_provided',
      evidenceRefs: [`project_record:facts.${entry.field}`],
      confidence: 1,
      status: 'confirmed',
    };
  }

  const proposal = packet.mediaTranslations?.spatial?.designProposal;
  if (proposal && typeof proposal === 'object') {
    if (Array.isArray(proposal.assumptions)) {
      proposal.assumptions = proposal.assumptions.filter((text) => {
        if (typeof text !== 'string' || !FACT_TOPIC.test(text)) return true;
        removedAssumptions.push(text);
        return false;
      });
      if (removedAssumptions.length && !proposal.assumptions.includes(CANONICAL_NOTE)) proposal.assumptions.push(CANONICAL_NOTE);
    }
    if (Array.isArray(proposal.unresolvedQuestions)) {
      proposal.unresolvedQuestions = proposal.unresolvedQuestions.filter((text) => {
        if (typeof text !== 'string' || !FACT_TOPIC.test(text)) return true;
        removedQuestions.push(text);
        return false;
      });
    }
    const area = facts?.floorArea;
    if (area && Array.isArray(proposal.basis)) {
      proposal.basis = proposal.basis.map((text) => {
        if (typeof text !== 'string') return text;
        const match = text.match(AREA_PATTERN);
        if (!match) return text;
        const declared = Number(match[1]);
        if (!Number.isFinite(declared) || Math.abs(declared - area) < 1) return text;
        conflicts.push({ field: 'floorArea', evidenceValue: declared, unit: '㎡', basis: text });
        return `${text}（该数字来自素材证据，与用户提供的 ${area} ㎡ 冲突，以用户事实为准）`;
      });
    }
  }

  packet.projectFactsApplied = {
    schemaVersion: '1.0',
    appliedAt,
    source: 'user_provided',
    fields: entries.map(({ field, text, value, unit }) => ({ field, text, value, ...(unit ? { unit } : {}) })),
    removedAssumptions,
    removedQuestions,
    conflicts,
  };
  return packet;
}
