// Tests: R8.5 redirected — action-verb architecture IR rewrite.
//
// Covers the rewrite pass that turns motif-stripped V5 phrases into short
// English construction language (strategy / form / organization), matching
// the P9B-B high-water-mark register. Also covers mustBeVisible leakage
// protection and global deduplication.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectSignals,
  signalsToActions,
  textToActions,
  rewriteArchitectureItems,
  rewriteArchitectureSemantics,
  compileRawPhrases,
  compileSpatialMechanisms,
  adaptPhase9bSource,
  compilePhase9bSpacePrompt,
  SEMANTIC_CLASS,
} from '@masterpiece/image-generation-runtime/vnext/space-quality/index.js';

// ---- detectSignals --------------------------------------------------------

test('detectSignals: finds curve signal in English and CJK', () => {
  const sigs = detectSignals('curved wall surface');
  assert.ok(sigs.includes('curve'));
  // "surface" also triggers the material signal — multi-signal is expected.
  assert.ok(sigs.includes('material'));
  assert.deepEqual(detectSignals('流畅的曲线墙面'), ['curve']);
});

test('detectSignals: finds multiple signals in rule order', () => {
  const sigs = detectSignals('layered translucent membrane ceiling with soft light');
  assert.ok(sigs.includes('layer'));
  assert.ok(sigs.includes('translucent'));
  assert.ok(sigs.includes('ceiling'));
  assert.ok(sigs.includes('light'));
  // soft is also present
  assert.ok(sigs.includes('soft'));
});

test('detectSignals: empty/non-string returns empty', () => {
  assert.deepEqual(detectSignals(''), []);
  assert.deepEqual(detectSignals(null), []);
  assert.deepEqual(detectSignals(undefined), []);
});

test('detectSignals: English color word "red" does not false-match inside "layered"', () => {
  // R8.5.1 lesson: word-boundary matching prevents false positives.
  const sigs = detectSignals('layered overlapping boundary');
  assert.ok(sigs.includes('layer'));
  // No material signal triggered by substring of "layered"
  assert.ok(!sigs.includes('material'));
});

// ---- signalsToActions -----------------------------------------------------

test('signalsToActions: partitions into strategy/form/organization', () => {
  const out = signalsToActions(['curve', 'translucent', 'guide']);
  assert.ok(out.strategy.length >= 1, 'has strategy keywords');
  assert.ok(out.form.length >= 1, 'has form sentences');
  assert.ok(out.organization.length >= 1, 'has organization phrases');
  // strategy items are short keywords (no sentence verb phrase > 40 chars)
  for (const s of out.strategy) {
    assert.ok(s.length <= 40, `strategy keyword too long: "${s}"`);
  }
  // form items are action sentences (contain a verb)
  for (const f of out.form) {
    assert.ok(/\b(?:bend|bends|layer|layers|filter|filters|wrap|wraps|radiate|radiates|descend|descends|connect|connects|soften|softens|blur|blurs|carry|carries|wash|washes|hold|holds|guide|guides|separate|separates|maintain|maintains|organize|organizes|graduate|graduates|trace|traces|define|defines|envelope|envelopes|drape|drapes|transition|transitions|open|opens)\b/i.test(f),
      `form item should contain an action verb: "${f}"`);
  }
});

test('signalsToActions: globally dedupes across signals', () => {
  const out = signalsToActions(['curve', 'curve', 'layer', 'layer']);
  // No duplicates in any register.
  assert.equal(new Set(out.strategy).size, out.strategy.length);
  assert.equal(new Set(out.form).size, out.form.length);
  assert.equal(new Set(out.organization).size, out.organization.length);
});

// ---- textToActions --------------------------------------------------------

test('textToActions: end-to-end on a motif-stripped phrase', () => {
  const result = textToActions('layered, softly overlapping curved translucent boundary');
  assert.ok(result.signals.includes('layer'));
  assert.ok(result.signals.includes('curve'));
  assert.ok(result.signals.includes('translucent'));
  assert.ok(result.signals.includes('boundary'));
  assert.ok(result.form.length >= 2);
});

// ---- rewriteArchitectureItems --------------------------------------------

test('rewrite: drops phrases with no spatial signal (brand prose / enum labels)', () => {
  const items = [
    { text: '美是科学与艺术的结晶', sourceField: 'brandRoleManifestation' },
    { text: '迎宾', sourceField: 'sceneProgram' },
    { text: '每个人都值得被精琢', sourceField: 'targetWorldview' },
  ];
  const result = rewriteArchitectureItems(items);
  assert.equal(result.stats.total, 3);
  assert.equal(result.stats.rewritten, 0);
  assert.equal(result.stats.dropped, 3);
  assert.equal(result.allActions.length, 0);
  for (const item of result.items) {
    assert.equal(item.dropped, true);
    assert.equal(item.dropReason, 'no_spatial_signal');
  }
});

test('rewrite: converts spatial phrases to English action verbs', () => {
  const items = [
    { text: '流畅的曲线墙面或隔断', sourceField: 'signatureSpatialMechanism' },
    { text: '层叠半透明介质从天花垂落', sourceField: 'signatureSpatialMechanism' },
  ];
  const result = rewriteArchitectureItems(items);
  assert.equal(result.stats.rewritten, 2);
  assert.equal(result.stats.dropped, 0);
  assert.ok(result.form.length >= 2, 'should produce form sentences');
  // All output should be English (ASCII) construction language.
  for (const a of result.allActions) {
    assert.ok(/^[\x20-\x7E]+$/.test(a), `action should be English ASCII: "${a}"`);
  }
});

test('rewrite: global dedupe — same signal from two sources produces one action', () => {
  const items = [
    { text: '曲线墙面', sourceField: 'a' },
    { text: '弧形隔断', sourceField: 'b' },
    { text: '流畅的曲面', sourceField: 'c' },
  ];
  const result = rewriteArchitectureItems(items);
  // All three trigger curve; the form sentence "walls bend into continuous
  // curved surfaces" must appear exactly once.
  const bendCount = result.form.filter((f) => f.includes('walls bend')).length;
  assert.equal(bendCount, 1, 'curve form sentence deduped across sources');
});

test('rewrite: empty items handled gracefully', () => {
  const result = rewriteArchitectureItems([]);
  assert.equal(result.stats.total, 0);
  assert.equal(result.allActions.length, 0);
});

// ---- rewriteArchitectureSemantics (wrapper) ------------------------------

test('rewriteArchitectureSemantics: returns strategy/form/organization + actions', () => {
  const items = [
    { text: '层叠半透明膜天花', sourceField: 'x' },
    { text: '柔和光线漫射', sourceField: 'y' },
  ];
  const result = rewriteArchitectureSemantics(items);
  assert.ok(Array.isArray(result.strategy));
  assert.ok(Array.isArray(result.form));
  assert.ok(Array.isArray(result.organization));
  assert.ok(Array.isArray(result.actions));
  assert.ok(result.stats.rewritten >= 1);
});

// ---- compileRawPhrases integration ----------------------------------------

test('compileRawPhrases: motif phrase gets stripped then rewritten to English', () => {
  const result = compileRawPhrases([
    'feather-like layered translucent boundary',
  ]);
  // The motif is stripped by the normalizer; the surviving spatial property
  // is rewritten to English action verbs.
  assert.ok(result.actions.length >= 1, 'should produce action verbs');
  for (const a of result.actions) {
    assert.ok(!/feather|peacock|plume/i.test(a), `action must not contain motif: "${a}"`);
    assert.ok(/^[\x20-\x7E]+$/.test(a), `action should be English: "${a}"`);
  }
});

test('compileRawPhrases: pure motif with no spatial signal produces no actions', () => {
  const result = compileRawPhrases([
    'peacock feather ornament',
  ]);
  assert.equal(result.actions.length, 0, 'pure motif should not produce architecture actions');
  assert.ok(result.brand.length >= 1, 'motif should route to brand');
});

// ---- mustBeVisible leakage protection -------------------------------------

test('mustBeVisible: logo/identity items route to brand, not composition', () => {
  // Build a minimal packet where mustBeVisible contains identity items.
  const packet = {
    schemaVersion: '1.0',
    validation: { hardFactStatus: 'pass', executionDataStatus: 'ready' },
    projectFacts: {
      brandName: { value: 'TestBrand' },
      industry: { value: 'medical_aesthetics' },
      brandRole: { value: 'professional care space' },
    },
    creativeDecision: { uniqueUpgradeThesis: 'curved translucent layered space' },
    mediaTranslations: {
      spatial: {
        spatialConcept: 'layered translucent membrane space',
        signatureSpatialMechanism: ['layered translucent membrane ceiling'],
        brandRoleManifestation: ['brand expressed through layered surfaces'],
        mustBeVisible: [
          '发光的品牌Logo',
          '品牌Slogan墙面文字',
          '接待台与膜天花的连续关系',
          '入口玻璃与室内的视觉渗透',
        ],
        functionalNetwork: ['入口到接待的视觉引导'],
        sceneProgram: ['reception', 'waiting'],
        peopleBehavior: ['客人进门即被接待'],
      },
    },
    materialSystem: [],
    lightingSystem: {},
    colorSystem: {},
    diagnosis: { brandMisreadRisks: [] },
  };
  const layers = adaptPhase9bSource({ packet, taskContract: { subtype: 'reception', aspectRatio: '16:9' } });

  // Composition mustBeVisible must NOT contain logo/slogan.
  const compText = layers.composition.mustBeVisible.join(' | ');
  assert.ok(!/logo|slogan|标识|标志/i.test(compText),
    `composition mustBeVisible leaked identity: "${compText}"`);

  // Brand translation should contain the identity items.
  const brandText = layers._raw.brandRoleManifestation.join(' | ');
  assert.ok(/logo|slogan|标识|标志/i.test(brandText) || layers.semantic.decorativeIdentitySemantics.length > 0,
    'identity items should route to brand semantics');
});

test('mustBeVisible: motif items route to brand, not composition', () => {
  const packet = {
    schemaVersion: '1.0',
    validation: { hardFactStatus: 'pass', executionDataStatus: 'ready' },
    projectFacts: {
      brandName: { value: 'TestBrand' },
      industry: { value: 'medical_aesthetics' },
      brandRole: { value: 'professional care space' },
    },
    creativeDecision: { uniqueUpgradeThesis: 'curved translucent layered space' },
    mediaTranslations: {
      spatial: {
        spatialConcept: 'layered translucent membrane space',
        signatureSpatialMechanism: ['layered translucent membrane ceiling'],
        brandRoleManifestation: ['brand expressed through layered surfaces'],
        mustBeVisible: [
          '抽象羽毛纹理的墙面或屏风',
          '接待台与膜天花的连续关系',
        ],
        functionalNetwork: ['入口到接待的视觉引导'],
        sceneProgram: ['reception', 'waiting'],
        peopleBehavior: ['客人进门即被接待'],
      },
    },
    materialSystem: [],
    lightingSystem: {},
    colorSystem: {},
    diagnosis: { brandMisreadRisks: [] },
  };
  const layers = adaptPhase9bSource({ packet, taskContract: { subtype: 'reception', aspectRatio: '16:9' } });

  // Composition mustBeVisible must NOT contain motif text.
  const compText = layers.composition.mustBeVisible.join(' | ');
  assert.ok(!/羽毛|翎羽|孔雀|feather|peacock/i.test(compText),
    `composition mustBeVisible leaked motif: "${compText}"`);
});

// ---- End-to-end: no raw Chinese prose in architecture blocks ---------------

test('architecture blocks contain English action verbs, not Chinese V5 prose', () => {
  const packet = {
    schemaVersion: '1.0',
    validation: { hardFactStatus: 'pass', executionDataStatus: 'ready' },
    projectFacts: {
      brandName: { value: '九州美学' },
      industry: { value: '医疗美容' },
      brandRole: { value: '科学与艺术并重的医美空间' },
    },
    creativeDecision: {
      uniqueUpgradeThesis: '从网红医美升级为有建筑深度的层叠半透明膜空间',
      targetWorldview: ['克制、温润、有光的深度'],
      strategicNegatives: [],
    },
    mediaTranslations: {
      spatial: {
        spatialConcept: '层叠半透明介质从天花垂落的沉浸式美学空间',
        signatureSpatialMechanism: [
          '层叠半透明介质形成无硬收边的空间边界',
          '暖色间接光沿膜边缘漫射',
          '流畅的曲线墙面引导动线',
        ],
        brandRoleManifestation: ['接待区以连续膜天花承载品牌的科学与优雅双重角色'],
        structureLanguage: ['连续曲面', '无硬收边', '从透到实的材质渐变'],
        functionalNetwork: [
          '入口→接待：短走廊缓冲',
          '接待→等候：弧形膜天花引导',
        ],
        functionalRelationships: ['接待可视入口，咨询保持私密'],
        sceneProgram: ['接待区', '等候区', '咨询室'],
        peopleBehavior: ['顾客进门即被接待'],
        mustBeVisible: ['接待台与膜天花的连续关系', '发光的九州美学Logo'],
        positiveDifferentiators: ['膜介质而非紫色亚克力'],
      },
    },
    materialSystem: [
      { material: '微水泥', behavior: ['哑光', '暖白'], brandRole: '画布', forbidden: ['亮面瓷砖'] },
    ],
    lightingSystem: {
      source: ['暖色间接光'],
      contrast: '低对比',
      interactionWithMaterials: ['光在哑光表面均匀衰减'],
      forbidden: ['彩色射灯'],
    },
    colorSystem: { primary: [], secondary: [], accent: [], forbidden: ['高饱和紫'] },
    diagnosis: { brandMisreadRisks: [] },
  };
  const result = compilePhase9bSpacePrompt({ packet, taskContract: { subtype: 'reception', aspectRatio: '16:9' }, brandKey: 'jiuzhou-aesthetics' });

  // Architecture-language block: must contain English action verbs.
  const archBlock = result.blocksById.architecture_language.text;
  assert.ok(/walls bend|ceilings layer|membranes filter|surfaces wrap|planes/i.test(archBlock),
    'architecture block should contain English action-verb construction sentences');

  // No raw V5 Chinese prose sentences in architecture blocks (allow individual
  // CJK words that may appear in material names, but not full prose bullets
  // copied from V5 lists like "流畅的曲线墙面或隔断").
  const archLines = archBlock.split('\n').filter((l) => l.startsWith('- '));
  for (const line of archLines) {
    const bullet = line.slice(2).trim();
    // Architecture bullets should be English (ASCII). CJK in architecture
    // bullets indicates raw V5 prose leaked through.
    assert.ok(/^[\x20-\x7E]+$/.test(bullet),
      `architecture bullet should be English action verb, got CJK prose: "${bullet}"`);
  }

  // The same V5 sentence must not appear more than once in the whole prompt.
  const motifSentence = '抽象羽毛纹理的墙面或屏风';
  const fullPrompt = result.finalPrompt;
  // This particular sentence isn't in our test packet, but check the
  // signature mechanism sentence isn't duplicated across blocks.
  const sigSentence = '层叠半透明介质形成无硬收边的空间边界';
  const occurrences = fullPrompt.split(sigSentence).length - 1;
  assert.ok(occurrences <= 1, `V5 sentence appeared ${occurrences} times (should be ≤1)`);
});
