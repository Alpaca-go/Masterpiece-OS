// Style presets: a small, curated set of "atmosphere" anchors.
//
// Why this exists: the model's prior for a restaurant interior is a bright,
// white-walled, mall-fast-food look (see the accepted Feng Tang Tang case,
// where the analysis proposal itself was "light wood + black metal + 3500K
// bright" and had to be overridden by a human). A preset pins the style axes
// and names the signals that mean the render drifted back to that prior.
//
// Rules kept deliberately narrow:
// - A preset never reaches the prompt on its own. The UI applies it to the
//   style axes, and the user can override any axis afterwards. Prompt bodies
//   for requests without an explicit preset stay byte-identical.
// - The anti-drift check is advisory and read-only. It scans the compiled
//   prompt (which is English) line by line and skips lines that are
//   themselves negative instructions, because "no white walls" is the fix,
//   not the drift.
// - Values must be valid STYLE_AXES values; an invalid preset fails loudly
//   instead of silently falling back to designer_choice.
//
// Human-readable source of truth lives in docs/knowledge/style-framework/.
// Keep the two in sync; the card carries the evidence, this file carries the
// values the generator consumes.

import { STYLE_AXES } from '../generation-runtime/generation/style-axes.js';

export const STYLE_PRESETS_SCHEMA_VERSION = '1.0';

const PRESETS = [
  {
    id: 'community-street-smoke',
    label: '社区底商 · 烟火气',
    status: 'draft',
    summary:
      '暖黄偏暗、暗部保住；密度靠人、锅具、蒸汽和物件，不靠文字；红砖/旧木/黄铜为主材；品牌色只做点缀。目标是“街坊每天来一趟的小馆”，不是商场效率快餐。',
    appliesTo: '社区或街边底商；正餐、粉面、小吃；晚餐为主；客单中低；层高允许吊灯与木构。',
    notFor: '商场店、日间快餐、外卖为主的档口、需要明亮与效率的即取即走场景、高端宴请。',
    styleControls: {
      lighting: 'warm_dim',
      density: 'dense',
      materials: 'brick_wood',
      brandColorArea: 'accent',
      tradition: 'balanced',
      props: 'lived_in',
      shot: 'designer_choice',
      textDensity: 'moderate',
      priceDisplay: 'none',
    },
    knowledgeText:
      '[问题] 社区小馆容易被画成商场效率快餐：白墙、均匀明亮、冷白光、空场。' +
      '[动作] 暖黄偏暗并保留暗部；红砖与深色旧木为主材，黄铜与陶器做暖色点睛；明档与备餐台进画面，密度靠人、锅具、蒸汽和碗碟，不靠菜单墙。' +
      '[条件] 街面可见、层高允许木构与吊灯、排烟允许开放明档、晚餐时段为主。' +
      '[禁止] 不做整店白墙、不做均匀明亮、不做冷白光、不做黑/红金属大烟罩当主视觉、不做整面菜单墙、不出现数字价格。',
    antiDrift: [
      {
        signal: 'white-wall',
        label: '白墙 / white wall',
        why: '白墙 + 均匀明亮是商场快餐最典型的两个信号；社区小馆要有旧墙或砖墙的底。',
        matches: ['white wall', 'white walls', 'painted white walls'],
      },
      {
        signal: 'even-bright',
        label: '均匀明亮 / evenly lit',
        why: '均匀明亮会把暗部全部提亮，烟火气靠明暗差；应保留暗部与局部光。',
        matches: ['evenly lit', 'even lighting', 'evenly illuminated', 'uniform lighting', 'bright and even', 'even illumination'],
      },
      {
        signal: 'cool-white',
        label: '冷白光 / cool white',
        why: '冷白光把暖色材料打冷，画面会变成办公楼食堂。',
        matches: ['cool white', 'cold white', '5000k', '6000k', 'daylight white'],
      },
      {
        signal: 'big-metal-hood',
        label: '金属烟罩成大块 / large metal hood',
        why: '设备抢了品牌的位置；烟罩应收进木构或造型，不做独立金属体。',
        matches: ['metal exhaust hood', 'stainless steel hood', 'large metal hood'],
      },
      {
        signal: 'glass-curtain',
        label: '玻璃幕墙 / curtain wall',
        why: '玻璃幕墙是商场旗舰语言，会把街边小馆做成商场店。',
        matches: ['curtain wall', 'glass curtain'],
      },
      {
        signal: 'menu-wall',
        label: '菜单墙 / menu wall',
        why: '整面菜单墙会把密度换成文字；密度应由人与物件承担。',
        matches: ['menu wall', 'wall of menus', 'wall of text panels', 'menu boards covering'],
      },
      {
        signal: 'empty-room',
        label: '空场 / empty room',
        why: '没有人、没有蒸汽、没有备餐动作，空间就只是装修。',
        matches: ['empty room', 'empty space', 'no people', 'without people', 'vacant'],
      },
      {
        signal: 'glossy-floor',
        label: '亮面地砖 / glossy floor',
        why: '亮面地砖 + 白墙是展厅感；社区小馆用磨砂砖、旧砖或水泥。',
        matches: ['glossy floor', 'polished tiles', 'mirror-like floor'],
      },
    ],
    sources: [
      'docs/knowledge/restaurant-cases/ftt-feng-tang-tang.md（v8 验收，人工覆盖“浅色木+黑金属+3500K 明亮”）',
      'docs/knowledge/restaurant-cases/candidate-rules.md（潮牛帮对照与边界）',
    ],
  },
  {
    id: 'mall-quick-service',
    label: '商场 / 街面 · 快取快餐',
    status: 'draft',
    summary:
      '明亮、干净、效率优先；品牌色可以放大到门头与物料；文字载体少；座位轻、桌距紧；不做旧、不做暗。',
    appliesTo: '商场或街面快餐、粉面、冒菜、卤味档口；午市为主；即取即走、翻台快。',
    notFor: '正餐、宴请、需要久坐或包间的场景、以氛围为卖点的社区小馆。',
    styleControls: {
      lighting: 'bright',
      density: 'balanced',
      materials: 'mixed',
      brandColorArea: 'half',
      tradition: 'modern',
      props: 'lived_in',
      shot: 'designer_choice',
      textDensity: 'minimal',
      priceDisplay: 'none',
    },
    knowledgeText:
      '[问题] 快餐档口被画成老店会拖慢认知：门头看不清品类、灯光太暗、字太多。' +
      '[动作] 明亮均匀但可读的照度；品牌色可以放到门头与打包物料；主材用浅木/金属/白瓷砖的混合，不追求年代感；文字只保留门头与一块菜单屏。' +
      '[条件] 商场或街面、午市为主、即取即走、有标准化物料系统。' +
      '[禁止] 不做暗场与暖黄偏暗、不做深色旧木与大面积红砖、不做酒馆氛围、不做整面菜单墙、不出现数字价格。',
    antiDrift: [
      {
        signal: 'warm-dim',
        label: '暖黄偏暗 / warm dim',
        why: '快餐要的是可读与效率；压暗会让档口看起来打烊或像酒馆。',
        matches: ['warm dim', 'dim warm', 'dimly lit', 'low light level'],
      },
      {
        signal: 'aged-wood',
        label: '深色旧木 / aged wood',
        why: '旧木会把快餐拉成老店，与“干净快取”冲突。',
        matches: ['aged wood', 'weathered wood', 'distressed wood'],
      },
      {
        signal: 'red-brick',
        label: '红砖 / red brick',
        why: '红砖是社区烟火气的材料语言；用到快餐里会变成另一种业态。',
        matches: ['red brick', 'red bricks'],
      },
      {
        signal: 'tavern',
        label: '酒馆氛围 / tavern',
        why: '酒馆氛围降低 daytime 的可读性，也会让取餐动线变暗。',
        matches: ['tavern', 'speakeasy', 'pub-like'],
      },
      {
        signal: 'carpet',
        label: '地毯 / carpet',
        why: '地毯不适合高频快取的清洁与推车动线。',
        matches: ['carpet', 'carpeted'],
      },
    ],
    sources: [
      'docs/knowledge/restaurant-cases/hei-youjia-maocai.md（明亮橙白 + 长条高桌）',
      'docs/knowledge/restaurant-cases/lianglu-youpin-hot-braise.md（档口 + 明档冷柜 + 高脚位）',
    ],
  },
];

const SLUG = /^[a-z0-9][a-z0-9-]{1,60}$/;

function assertPreset(preset) {
  if (!SLUG.test(preset.id)) throw new Error(`STYLE_PRESET_ID_INVALID: ${preset.id}`);
  if (!preset.label || !preset.summary) throw new Error(`STYLE_PRESET_LABEL_REQUIRED: ${preset.id}`);
  if (!preset.knowledgeText || preset.knowledgeText.length > 1200) throw new Error(`STYLE_PRESET_KNOWLEDGE_TEXT_INVALID: ${preset.id}`);
  if (!Array.isArray(preset.antiDrift) || !preset.antiDrift.length) throw new Error(`STYLE_PRESET_ANTI_DRIFT_REQUIRED: ${preset.id}`);
  for (const axis of Object.keys(STYLE_AXES)) {
    const value = preset.styleControls?.[axis];
    if (!STYLE_AXES[axis].includes(value)) throw new Error(`STYLE_PRESET_AXIS_INVALID: ${preset.id}.${axis}=${value}`);
  }
  for (const rule of preset.antiDrift) {
    if (!rule.signal || !rule.label || !rule.why) throw new Error(`STYLE_PRESET_ANTI_DRIFT_INVALID: ${preset.id}`);
    if (!Array.isArray(rule.matches) || !rule.matches.length) throw new Error(`STYLE_PRESET_ANTI_DRIFT_MATCHES_REQUIRED: ${preset.id}.${rule.signal}`);
    for (const match of rule.matches) {
      if (String(match).toLowerCase() !== match) throw new Error(`STYLE_PRESET_ANTI_DRIFT_MATCH_CASE: ${preset.id}.${rule.signal}`);
    }
  }
  if (!Array.isArray(preset.sources) || !preset.sources.length) throw new Error(`STYLE_PRESET_SOURCES_REQUIRED: ${preset.id}`);
}

for (const preset of PRESETS) assertPreset(preset);

function clone(preset) {
  return {
    ...preset,
    styleControls: { ...preset.styleControls },
    antiDrift: preset.antiDrift.map((rule) => ({ ...rule, matches: [...rule.matches] })),
    sources: [...preset.sources],
  };
}

export function listStylePresets() {
  return PRESETS.map(clone);
}

export function findStylePreset(id) {
  const preset = PRESETS.find((item) => item.id === String(id || '').trim().toLowerCase());
  return preset ? clone(preset) : null;
}

// Lines that are already telling the model what NOT to do are the fix, not the
// drift. Skipping them keeps the check from flagging the negatives we want.
const NEGATION = /\b(no|not|never|avoid|without|don't|do not|exclude|instead of)\b/i;

export function scanPromptForDrift(prompt, preset) {
  const text = String(prompt ?? '');
  const lines = text.split(/\r?\n/);
  const warnings = [];
  for (const rule of preset.antiDrift) {
    const hit = lines.find((line) => {
      const lower = line.toLowerCase();
      return rule.matches.some((match) => lower.includes(match)) && !NEGATION.test(line);
    });
    if (hit) warnings.push({ signal: rule.signal, label: rule.label, why: rule.why, line: hit.trim().slice(0, 300) });
  }
  return {
    presetId: preset.id,
    ok: warnings.length === 0,
    warnings,
    checkedSignals: preset.antiDrift.length,
    note: '只读提示：扫描编译后的 Prompt；命中否定句（no/avoid/not）的行不计为跑偏，仍可能漏检。',
  };
}

export function stylePreflight(input) {
  const presetId = String(input?.presetId || '').trim();
  const preset = findStylePreset(presetId);
  if (!preset) throw new Error('STYLE_PRESET_UNKNOWN');
  const prompt = typeof input?.prompt === 'string' ? input.prompt : '';
  if (!prompt.trim()) throw new Error('STYLE_PREFLIGHT_PROMPT_REQUIRED');
  return scanPromptForDrift(prompt, preset);
}
