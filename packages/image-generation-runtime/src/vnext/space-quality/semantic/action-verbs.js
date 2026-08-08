// Action-verb architecture vocabulary (R8.5 redirected).
//
// After R8.4 archaeology isolated the true regression point (P9B-B -> CURRENT),
// the fix is not more negative guards but a REWRITE pass that turns V5 Chinese
// brand prose / enum labels into short English construction language — the
// register P9B-B used to reach 5/5 Expressiveness.
//
// P9B-B's three architecture blocks had DIFFERENT registers:
//   Spatial Strategy          -> short direction keywords
//                                 ("soft boundary", "balanced openness")
//   Architectural Characteristics -> construction action sentences
//                                 ("continuous spatial flow", "quiet hierarchy")
//   Spatial Organization      -> circulation / privacy phrases
//                                 ("gradual privacy transition",
//                                  "clear user circulation")
//
// This module maps universal spatial SIGNALS to those three registers.
// Signals are generic (curve, layer, translucent, wrap, ...). NO brand names,
// NO project names, NO motif words — same vocabulary for every brand
// (verify:no-project-specific-production-rules). Deterministic, no LLM.

/**
 * @typedef {{
 *   signal: string,
 *   dimension: 'form'|'organization'|'intent',
 *   patterns: RegExp[],
 *   strategy?: string,
 *   form: string,
 *   organization?: string,
 * }} ActionVerbRule
 */

// dimension tells the adapter which block this action primarily feeds:
//   intent       -> Spatial Strategy (experience direction keyword)
//   form         -> Architectural Characteristics (construction sentence)
//   organization -> Spatial Organization (circulation / privacy phrase)
// Each rule produces a `form` sentence (always); `strategy` and `organization`
// are optional shorter phrases for the other blocks.
const ACTION_VERB_RULES = Object.freeze([
  // --- curve / bend / arc (FORM) ---
  {
    signal: 'curve',
    dimension: 'form',
    patterns: [
      /\b(?:curve|curved|curvature|arc|arced|bend|bent|flowing|flow|undulat\w*)\b/giu,
      /曲线|弧形|弧|弯曲|流线|流动|曲面|蜿蜒/gu,
    ],
    strategy: 'flowing curvature',
    form: 'walls bend into continuous curved surfaces',
    organization: 'circulation follows the curved spatial axis',
  },
  // --- layer / stack / overlap (FORM) ---
  {
    signal: 'layer',
    dimension: 'form',
    patterns: [
      /\b(?:layer|layered|layering|stack\w*|overlap\w*|strat\w*|tier\w*)\b/giu,
      /层叠|叠|多层|叠加|交错|交叠|层次/gu,
    ],
    strategy: 'layered depth',
    form: 'ceilings layer in overlapping planes',
    organization: 'zones stratify from public to intimate',
  },
  // --- translucent / transparent / filter (FORM) ---
  {
    signal: 'translucent',
    dimension: 'form',
    patterns: [
      /\b(?:translucent|translucency|semi[\s-]?transparent|sheer|diaph\w*|filter\w*|frost\w*)\b/giu,
      /半透明|通透|透光|朦胧|纱|幕|过滤|柔化/gu,
    ],
    strategy: 'filtered transparency',
    form: 'membranes filter light through translucent planes',
    organization: 'partitions diffuse vision without hard closure',
  },
  // --- wrap / enclose / embrace (FORM) ---
  {
    signal: 'wrap',
    dimension: 'form',
    patterns: [
      /\b(?:wrap|wrapp\w*|enclos\w*|embrace|cocoon|surround\w*|envelop\w*)\b/giu,
      /包裹|围合|环抱|包容|拥抱|环绕/gu,
    ],
    strategy: 'soft enclosure',
    form: 'surfaces wrap around the occupant in soft enclosure',
    organization: 'walls envelope the space without sealing it',
  },
  // --- radial / fan / radiate (FORM) ---
  {
    signal: 'radial',
    dimension: 'form',
    patterns: [
      /\b(?:radial|radiat\w*|fan[\s-]?shape\w*|concentric|spoke\w*|sunburst)\b/giu,
      /放射|辐射|扇形|向心|发散|中心扩散/gu,
    ],
    strategy: 'radial focus',
    form: 'planes radiate from a central spatial anchor',
    organization: 'the ceiling organizes in a quiet radial geometry',
  },
  // --- descend / drop / hang / suspend (FORM) ---
  {
    signal: 'descend',
    dimension: 'form',
    patterns: [
      /\b(?:descend\w*|drop\w*|hang\w*|suspend\w*|drape\w*|fall\w*|pendant\w*)\b/giu,
      /垂落|下垂|悬挂|吊|落|倾泻|沉降/gu,
    ],
    strategy: 'descending planes',
    form: 'planes descend from the ceiling to define zones',
    organization: 'suspended membranes drape into the room',
  },
  // --- gradual / transition / gradient (ORGANIZATION) ---
  {
    signal: 'transition',
    dimension: 'organization',
    patterns: [
      /\b(?:gradual|transition|transitions|gradient|progression|sequenc\w*|continuum)\b/giu,
      /渐变|过渡|渐进|递进|序列|延续|连续/gu,
    ],
    strategy: 'gradual transition',
    form: 'space transitions gradually from public to private',
    organization: 'materials graduate across the circulation path',
  },
  // --- open / connect / continuity (ORGANIZATION) ---
  {
    signal: 'open',
    dimension: 'organization',
    patterns: [
      /\b(?:open|opens|openness|connect\w*|continuity|continuous|flow|through[\s-]?view|visual[\s-]?connection)\b/giu,
      /开放|连通|连续|贯通|视觉连续|渗透|开阔|延伸/gu,
    ],
    strategy: 'controlled openness',
    form: 'openings connect adjacent zones visually',
    organization: 'walls maintain continuity across ceiling and floor',
  },
  // --- soft / gentle / quiet / calm (INTENT) ---
  {
    signal: 'soft',
    dimension: 'intent',
    patterns: [
      /\b(?:soft|softly|gentle|quiet|calm|serene|muted|restrain\w*|subdued)\b/giu,
      /柔和|柔软|舒缓|安静|宁静|静谧|温和|轻柔/gu,
    ],
    strategy: 'soft boundary',
    form: 'edges soften into blurred transitions',
    organization: 'the space holds a calm, quiet spatial rhythm',
  },
  // --- boundary / threshold / screen (ORGANIZATION) ---
  {
    signal: 'boundary',
    dimension: 'organization',
    patterns: [
      /\b(?:boundary|boundaries|threshold|screen|partition|divider|edge|delim\w*)\b/giu,
      /边界|屏风|隔断|分隔|分界|阈|界面|边缘/gu,
    ],
    strategy: 'blurred boundary',
    form: 'boundaries blur between zones instead of hard walls',
    organization: 'screens partition without breaking visual continuity',
  },
  // --- guide / direct / orient / axis (ORGANIZATION) ---
  {
    signal: 'guide',
    dimension: 'organization',
    patterns: [
      /\b(?:guide|guid\w*|direct\w*|orient\w*|axis|circulation|path|wayfinding|lead\w*)\b/giu,
      /引导|动线|导向|指引|主轴|轴线|走廊|流线/gu,
    ],
    strategy: 'guided circulation',
    form: 'a clear spatial axis organizes entry and depth',
    organization: 'circulation guides the visitor through the space',
  },
  // --- separate / privacy / filter (ORGANIZATION) ---
  {
    signal: 'separate',
    dimension: 'organization',
    patterns: [
      /\b(?:separat\w*|privacy|private|intimate|seclude\w*|shield\w*|screen\w*)\b/giu,
      /私密|隐私|分隔|隔离|隐蔽|半私密|遮挡/gu,
    ],
    strategy: 'balanced privacy',
    form: 'semi-private zones separate through filtered boundaries',
    organization: 'privacy increases gradually without locked doors',
  },
  // --- ceiling / overhead / soffit (FORM) ---
  {
    signal: 'ceiling',
    dimension: 'form',
    patterns: [
      /\b(?:ceiling|soffit|overhead|canopy|roof[\s-]?plane)\b/giu,
      /天花|吊顶|顶面|顶棚|顶/gu,
    ],
    strategy: 'overhead gesture',
    form: 'the ceiling carries the primary spatial gesture',
    organization: 'overhead planes define atmospheric depth',
  },
  // --- light / illuminate / glow (INTENT) ---
  {
    signal: 'light',
    dimension: 'intent',
    patterns: [
      /\b(?:light|lighting|illuminat\w*|glow|lumin\w*|bright\w*|ambient|indirect|cove)\b/giu,
      /光|照明|灯|漫射|间接光|发光|光晕|亮度/gu,
    ],
    strategy: 'indirect illumination',
    form: 'indirect light washes surfaces evenly',
    organization: 'light coves trace the edge of ceiling planes',
  },
  // --- material / texture / surface (FORM) ---
  {
    signal: 'material',
    dimension: 'form',
    patterns: [
      /\b(?:material|texture|surface|tactile|finish|grain|mineral|plaster|wood|stone|metal|glass)\b/giu,
      /材质|材料|肌理|质感|表面|纹理|涂料|木|石|金属|玻璃/gu,
    ],
    strategy: 'refined materiality',
    form: 'materials carry refined, physically credible textures',
    organization: 'surface finishes read as buildable and precise',
  },
  // --- scale / proportion / human (ORGANIZATION) ---
  {
    signal: 'scale',
    dimension: 'organization',
    patterns: [
      /\b(?:scale|proportion\w*|human[\s-]?scale|intimate|grand|volum\w*|height)\b/giu,
      /尺度|比例|人体|体量|高度|开阔|纵深/gu,
    ],
    strategy: 'human scale',
    form: 'proportions hold a legible human scale',
    organization: 'volume reads as generous but not overwhelming',
  },
]);

/**
 * Return the spatial SIGNALS detected in a (already motif-stripped) phrase.
 * @param {string} text
 * @returns {string[]} unique signal keys in rule order
 */
export function detectSignals(text) {
  const t = String(text || '').toLowerCase();
  const found = [];
  for (const rule of ACTION_VERB_RULES) {
    for (const re of rule.patterns) {
      re.lastIndex = 0;
      if (re.test(t)) {
        found.push(rule.signal);
        break;
      }
    }
  }
  return found;
}

/**
 * Collect all action phrases for a set of signals, partitioned by dimension.
 * Returns three globally-deduped lists:
 *   strategy      -> short direction keywords (Spatial Strategy block)
 *   form          -> construction sentences (Architectural Characteristics)
 *   organization  -> circulation phrases (Spatial Organization)
 *
 * @param {string[]} signals
 * @returns {{strategy: string[], form: string[], organization: string[]}}
 */
export function signalsToActions(signals) {
  const strategy = [];
  const form = [];
  const organization = [];
  const seen = { strategy: new Set(), form: new Set(), organization: new Set() };

  for (const sig of signals) {
    const rule = ACTION_VERB_RULES.find((r) => r.signal === sig);
    if (!rule) continue;

    if (rule.strategy && !seen.strategy.has(rule.strategy.toLowerCase())) {
      seen.strategy.add(rule.strategy.toLowerCase());
      strategy.push(rule.strategy);
    }
    if (rule.form && !seen.form.has(rule.form.toLowerCase())) {
      seen.form.add(rule.form.toLowerCase());
      form.push(rule.form);
    }
    if (rule.organization && !seen.organization.has(rule.organization.toLowerCase())) {
      seen.organization.add(rule.organization.toLowerCase());
      organization.push(rule.organization);
    }
  }

  return { strategy, form, organization };
}

/**
 * Convenience: detect signals and return partitioned actions in one step.
 * @param {string} text
 */
export function textToActions(text) {
  const signals = detectSignals(text);
  return { signals, ...signalsToActions(signals) };
}

/**
 * Rewrite a list of motif-stripped architecture semantics into three
 * globally-deduped action lists. This is the main entry point used by
 * compile-spatial-mechanisms.
 *
 * Global dedupe is critical: R8.4 found one V5 sentence rendered 4 times
 * across blocks because the same source list was rendered repeatedly.
 *
 * @param {Array<{text:string, sourceField?:string, mechanismId?:string}>} items
 * @returns {{
 *   items: Array<{text:string, signals:string[], strategy:string[],
 *                 form:string[], organization:string[], rewritten:boolean,
 *                 dropped:boolean, dropReason?:string}>,
 *   strategy: string[],
 *   form: string[],
 *   organization: string[],
 *   allActions: string[],
 *   stats: {total:number, rewritten:number, dropped:number, actionCount:number},
 * }}
 */
export function rewriteArchitectureItems(items) {
  const list = Array.isArray(items) ? items : [];
  const rewrittenItems = [];
  const strategyAll = [];
  const formAll = [];
  const orgAll = [];
  const seen = { strategy: new Set(), form: new Set(), organization: new Set(), all: new Set() };
  let rewritten = 0;
  let dropped = 0;

  for (const item of list) {
    const strippedText = String(item?.text || '').trim();
    if (!strippedText) {
      rewrittenItems.push({ ...item, text: '', signals: [], strategy: [], form: [], organization: [], rewritten: false, dropped: true, dropReason: 'empty' });
      dropped += 1;
      continue;
    }

    const signals = detectSignals(strippedText);
    if (signals.length === 0) {
      rewrittenItems.push({ ...item, signals: [], strategy: [], form: [], organization: [], rewritten: false, dropped: true, dropReason: 'no_spatial_signal' });
      dropped += 1;
      continue;
    }

    const actions = signalsToActions(signals);
    rewritten += 1;

    for (const s of actions.strategy) {
      const k = s.toLowerCase();
      if (!seen.strategy.has(k)) { seen.strategy.add(k); strategyAll.push(s); }
    }
    for (const f of actions.form) {
      const k = f.toLowerCase();
      if (!seen.form.has(k)) { seen.form.add(k); formAll.push(f); }
      if (!seen.all.has(k)) { seen.all.add(k); }
    }
    for (const o of actions.organization) {
      const k = o.toLowerCase();
      if (!seen.organization.has(k)) { seen.organization.add(k); orgAll.push(o); }
      if (!seen.all.has(k)) { seen.all.add(k); }
    }
    // also count strategy phrases in allActions
    for (const s of actions.strategy) {
      const k = s.toLowerCase();
      if (!seen.all.has(k)) { seen.all.add(k); }
    }

    rewrittenItems.push({ ...item, signals, ...actions, rewritten: true, dropped: false });
  }

  const allActions = [...strategyAll, ...formAll, ...orgAll];
  return {
    items: rewrittenItems,
    strategy: strategyAll,
    form: formAll,
    organization: orgAll,
    allActions,
    stats: {
      total: list.length,
      rewritten,
      dropped,
      actionCount: allActions.length,
    },
  };
}

export const ACTION_VERB_RULE_COUNT = ACTION_VERB_RULES.length;
