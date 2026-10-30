// Structured project facts: the physical and operational constraints that the
// analysis cannot infer from materials (area, ceiling height, street vs mall,
// dine-in share, opening period, budget band, exhaust conditions).
//
// They are captured as coarse fields, validated here, stored on the project and
// injected into the analysis task as a factual boundary. A project without facts
// produces exactly the same analysis task as before, so existing baselines keep
// their byte-identical request bodies.

export const PROJECT_FACTS_SCHEMA_VERSION = '1.0';

export const PROJECT_FACT_FIELDS = Object.freeze({
  floorArea: { label: '面积（㎡）', kind: 'number', min: 1, max: 20000 },
  ceilingHeight: { label: '层高（m）', kind: 'number', min: 2, max: 15 },
  locationType: {
    label: '位置类型',
    kind: 'enum',
    values: { street: '街面 / 社区底商', mall: '商场内', other: '其它' },
  },
  dineInShare: {
    label: '堂食 / 外带',
    kind: 'enum',
    values: { mostly_dine_in: '堂食为主', mixed: '堂食与外带并重', mostly_takeaway: '外带为主' },
  },
  servicePeriod: {
    label: '主要时段',
    kind: 'enum',
    values: { breakfast: '早餐', lunch: '午市', dinner: '晚市', late_night: '夜宵', all_day: '全天' },
  },
  budgetBand: {
    label: '预算档',
    kind: 'enum',
    values: { low: '经济', mid: '中档', high: '高档' },
  },
  kitchenExhaust: {
    label: '厨房与排烟',
    kind: 'enum',
    values: { open_flame: '可开放明火明档', electric_only: '仅电加热', restricted: '排烟受限' },
  },
});

// Unknown keys are dropped, blank values are dropped, invalid enums/numbers
// throw so the form can point at the offending field instead of silently
// storing a wrong constraint.
export function normalizeProjectFacts(input) {
  if (!input || typeof input !== 'object') return {};
  const out = {};
  for (const [key, field] of Object.entries(PROJECT_FACT_FIELDS)) {
    const raw = input[key];
    if (raw === undefined || raw === null || raw === '') continue;
    if (field.kind === 'number') {
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error(`项目事实「${field.label}」必须是数字`);
      if (value < field.min || value > field.max) throw new Error(`项目事实「${field.label}」应在 ${field.min}–${field.max} 之间`);
      out[key] = Math.round(value * 10) / 10;
      continue;
    }
    const value = String(raw).trim();
    if (!Object.hasOwn(field.values, value)) throw new Error(`项目事实「${field.label}」取值无效`);
    out[key] = value;
  }
  return out;
}

export function hasProjectFacts(facts) {
  return Boolean(facts && typeof facts === 'object' && Object.keys(facts).length);
}

function labelOf(key, value) {
  const field = PROJECT_FACT_FIELDS[key];
  if (!field) return null;
  if (field.kind === 'number') return `${field.label.replace(/（.*?）/u, '')} ${value}`;
  return field.values[value] || null;
}

// One line per non-empty fact, in a fixed order, so the analysis task is
// deterministic for the same facts.
export function projectFactsLines(facts) {
  if (!hasProjectFacts(facts)) return [];
  const lines = [];
  const area = facts.floorArea;
  const height = facts.ceilingHeight;
  const site = [labelOf('locationType', facts.locationType), area ? `面积约 ${area} ㎡` : '', height ? `层高约 ${height} m` : ''].filter(Boolean);
  if (site.length) lines.push(`- 场地：${site.join('；')}`);
  const operation = [labelOf('dineInShare', facts.dineInShare), facts.servicePeriod ? `主要时段：${labelOf('servicePeriod', facts.servicePeriod)}` : ''].filter(Boolean);
  if (operation.length) lines.push(`- 经营：${operation.join('；')}`);
  if (facts.budgetBand) lines.push(`- 预算档：${labelOf('budgetBand', facts.budgetBand)}`);
  if (facts.kitchenExhaust) lines.push(`- 厨房与排烟：${labelOf('kitchenExhaust', facts.kitchenExhaust)}`);
  return lines;
}

// Locked-fact entries for the analysis prompt's factualConstraints channel.
// Empty for projects without facts, so their analysis request stays unchanged.
// The trailing line matters: without it the model still fills its own
// assumptions for area/ceiling height and lists exhaust as "to be confirmed"
// even when the values were supplied (observed in the 2026-10-30 smoke run).
export function projectFactsConstraints(facts) {
  const lines = projectFactsLines(facts);
  if (!lines.length) return [];
  return [
    '项目事实与约束（用户提供，视为既成条件，不是推断）：',
    ...lines,
    '以上面积、层高、位置类型、堂食比例、时段、预算档与排烟条件已经确认，可直接作为事实引用，不需要再写成待确认项；与素材画面冲突时以这些事实为准。素材图上看不出的其它细节，仍按“推断 / 待确认”标注，不要为了填满结构而编造。',
  ];
}
