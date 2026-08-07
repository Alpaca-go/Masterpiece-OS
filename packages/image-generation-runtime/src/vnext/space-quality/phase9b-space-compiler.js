// Phase 9B Quality Space Compiler (production).
//
// Emits a building-led prompt whose block hierarchy is equivalent to Phase 9B
// Mode B (recovery doc §4.1, §5.1):
//
//   task
//   spatial_intent
//   architecture_language
//   architecture_context      (when anchors selected)
//   architecture_function_bridge
//   architectural_concept
//   architecture_dna
//   brand_translation
//   functional_requirement
//   material
//   lighting
//   composition
//   rendering
//   negative_constraints
//
// It is deterministic, does not call an LLM or provider, and reads only the
// adapted V5 source + selected anchors. It does NOT handle packaging and does
// NOT deep-import the experimental tree.

import { adaptPhase9bSource, SPACE_QUALITY_SOURCE_ADAPTER_VERSION } from './phase9b-source-adapter.js';
import {
  selectArchitectureAnchors,
  renderArchitectureContextBlock,
  resolveArchitectureAnchorImagePath,
} from './architecture-context.js';
import { measurePromptBudget } from './prompt-budget.js';
import { buildTrace } from './trace.js';

export const SPACE_PROMPT_COMPILER_ID = 'phase9b-quality-compiler';
export const SPACE_PROMPT_COMPILER_VERSION = '1.0.0';

const PHASE9B_BLOCK_IDS = Object.freeze([
  'task',
  'spatial_intent',
  'architecture_language',
  'architecture_context',
  'architecture_function_bridge',
  'architectural_concept',
  'architecture_dna',
  'brand_translation',
  'functional_requirement',
  'material',
  'lighting',
  'composition',
  'rendering',
  'negative_constraints',
]);

function bullet(items, fallback = '') {
  const list = (Array.isArray(items) ? items : [items])
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean);
  if (list.length === 0) return fallback;
  return list.map((s) => `- ${s}`).join('\n');
}

function block(id, title, body) {
  return { id, title, text: `# ${title}\n\n${body.replace(/\s+$/u, '')}` };
}

function renderTask(layers) {
  const t = layers.task;
  const p = layers.projectIdentity;
  const lines = [
    `Generate a single premium-grade space image for **${p.brandName}** (${p.industry}).`,
  ];
  if (t.subtype) lines.push(`Scene: \`${t.subtype}\`${t.shot ? ` / ${t.shot}` : ''}.`);
  if (t.currentInstruction) lines.push(`Task: ${t.currentInstruction}`);
  if (t.aspectRatio) lines.push(`Aspect ratio: ${t.aspectRatio}.`);
  return block('task', 'Task', lines.join('\n'));
}

function renderSpatialIntent(layers) {
  const si = layers.spatialIntent;
  const body = [
    '> The experience goal and spatial strategy set the tone before any building mechanism.',
    '',
    `**Experience Goal**: ${si.experienceGoal}`,
    '',
    '**Spatial Strategy**:',
    bullet(si.spatialStrategy),
  ].join('\n');
  return block('spatial_intent', 'Spatial Intent', body);
}

function renderArchitectureLanguage(layers) {
  const al = layers.architectureLanguage;
  const body = [
    '> Building language: how space is organized before brand is applied.',
    '',
    '**Spatial Principles**:',
    bullet(al.spatialPrinciples),
    '',
    '**Architectural Characteristics**:',
    bullet(al.architecturalCharacteristics),
    '',
    '**Spatial Organization (functional network + program)**:',
    bullet(al.spatialOrganization),
  ].join('\n');
  return block('architecture_language', 'Architecture Language', body);
}

function renderArchitectureFunctionBridge(layers) {
  const b = layers.architectureFunctionBridge;
  const body = [
    '> Building language serves commercial reality. Translate architecture into functional action (Phase 8B.1).',
    '',
    `**Commercial Purpose**: ${b.commercialPurpose}`,
    '',
    '**Spatial Translation (architecture → commercial action)**:',
    bullet(b.spatialTranslation),
    '',
    '**Operation Constraints (hard, must hold)**:',
    bullet(b.operationConstraints),
    '',
    '**Human Experience (path + rhythm)**:',
    bullet(b.humanExperience),
    '',
    '**Commercial Reality (do not turn the space into a gallery)**:',
    bullet(b.commercialReality),
    '',
    '**Concept Drift Guards (must avoid)**:',
    bullet(b.conceptDriftGuards, '- (none)'),
  ].join('\n');
  return block('architecture_function_bridge', 'Architecture-Function Bridge', body);
}

function renderArchitecturalConcept(layers) {
  const c = layers.architecturalConcept;
  const body = [
    '空间概念 / 建筑机制必须先于品牌元素被建立。品牌附着于建筑语言之上，而不是反过来。',
    '',
    `**Primary Spatial Concept**: ${c.primary}`,
    '',
    '**Signature Mechanisms**:',
    bullet(c.signatureMechanisms),
    '',
    '**Structure Language**:',
    bullet(c.structureLanguage),
  ].join('\n');
  return block('architectural_concept', 'Architectural Concept', body);
}

function renderArchitectureDna(layers) {
  const org = layers.architectureLanguage.spatialOrganization;
  const body = [
    '**Building DNA**:',
    `- Spatial organization: ${org.slice(0, 5).join('；') || 'n/a'}`,
    `- Functional network nodes: ${layers._raw.functionalNetwork.slice(0, 6).join('；') || 'n/a'}`,
    `- Program nodes: ${layers._raw.sceneProgram.slice(0, 6).join('；') || 'n/a'}`,
    '',
    'Maintain continuous wall↔ceiling↔floor relationships and a legible circulation hierarchy.',
  ].join('\n');
  return block('architecture_dna', 'Architecture DNA', body);
}

function renderBrandTranslation(layers) {
  const p = layers.projectIdentity;
  const body = [
    '> Brand is translated into mechanism, rhythm and surface behavior — never pasted as decoration.',
    '',
    `**Brand**: ${p.brandName} | **Industry**: ${p.industry}`,
    `**Brand Role**: ${p.brandRole || 'n/a'}`,
    p.audience.length ? `**Audience**: ${p.audience.join('、')}` : '',
    '',
    '**Brand Role Manifestation in Space**:',
    bullet(layers._raw.brandRoleManifestation),
  ].filter(Boolean).join('\n');
  return block('brand_translation', 'Brand Translation', body);
}

function renderFunctionalRequirement(layers) {
  const raw = layers._raw;
  const body = [
    '**Required Program Nodes (must be legible in one image)**:',
    bullet(raw.sceneProgram),
    '',
    '**Functional Network**:',
    bullet(raw.functionalNetwork),
    '',
    '**Must Be Visible**:',
    bullet(raw.mustBeVisible),
    '',
    '**Positive Differentiators**:',
    bullet(raw.positiveDifferentiators, '- (none)'),
  ].join('\n');
  return block('functional_requirement', 'Functional & Commercial Requirement', body);
}

function renderMaterial(layers) {
  const mats = layers.materials;
  const body = mats.map((m) => {
    const parts = [`- **${m.material}**: ${m.behavior.join('；') || '真实物理属性'}`];
    if (m.brandRole) parts.push(`  brand role: ${m.brandRole}`);
    if (m.forbidden.length) parts.push(`  avoid: ${m.forbidden.join('；')}`);
    return parts.join('\n');
  });
  if (!body.length) body.push('- Materials, joints and surfaces must be physically credible and buildable.');
  return block('material', 'Material System', body.join('\n'));
}

function renderLighting(layers) {
  const l = layers.lighting;
  const body = [
    `**Primary Strategy**: ${l.source.join('、') || 'layered ambient + accent'}`,
    l.contrast ? `**Contrast**: ${l.contrast}` : '',
    '',
    '**Light / Material Behavior**:',
    bullet(l.interactionWithMaterials),
    '',
    '**Lighting Prohibitions**:',
    bullet(l.forbidden, '- (none)'),
  ].filter(Boolean).join('\n');
  return block('lighting', 'Lighting System', body);
}

function renderComposition(layers) {
  const c = layers.composition;
  const body = [
    c.aspectRatio ? `**Output Ratio**: ${c.aspectRatio}` : '',
    c.scene ? `**Scene**: ${c.scene}` : '',
    '',
    '**Must Be Visible (focal hierarchy)**:',
    bullet(c.mustBeVisible),
    '',
    '**Positive Differentiators**:',
    bullet(c.positiveDifferentiators, '- (none)'),
    '',
    'Use a credible commercial architectural camera: controlled perspective, depth, hierarchy and human scale.',
  ].filter(Boolean).join('\n');
  return block('composition', 'Composition & Photography', body);
}

function renderRendering() {
  const body = [
    '- High-end architectural visualization, photoreal, physically based materials.',
    '- Balanced exposure, accurate white balance, readable texture and shadow detail.',
    '- No blown highlights; clean, resolved, professionally finished.',
  ].join('\n');
  return block('rendering', 'Rendering Requirements', body);
}

function renderNegatives(layers) {
  const body = [
    'The following MUST NOT appear in the generated image:',
    bullet(layers.negatives.length
      ? layers.negatives
      : ['generic AI clinic look', 'literal brand mascots or logos rendered in-scene']),
  ].join('\n');
  return block('negative_constraints', 'Prohibited (fail-closed)', body);
}

/**
 * Compile a Phase 9B-quality space prompt.
 *
 * @param {object} input
 * @param {object} input.packet            V5 VisualDecisionPacket
 * @param {object} input.taskContract      vNext task contract
 * @param {object} [input.projectContext]
 * @param {object} [input.anchorCriteria]  { industry, sceneType, commercialContext, operationalRealism }
 * @param {string} [input.brandKey]        registry brand key (anchor selection)
 * @param {number} [input.anchorMaxCount]
 * @param {object} [input.adapter]         seedream adapter (for trace)
 * @returns {object} { blocks, blockIds, finalPrompt, anchors, referenceImages, trace, budget, sourceAdapterVersion }
 */
export function compilePhase9bSpacePrompt(input) {
  const layers = adaptPhase9bSource(input);

  // Architecture anchors: selection is optional/graceful. If a brandKey is not
  // in the registry (unknown brand), anchors = [] and the architecture_context
  // block is omitted, matching Phase 9B fallback behavior. Criteria default
  // from the V5 packet so the caller doesn't have to repeat industry/scene.
  let anchors = [];
  let contextBlock = null;
  if (input.brandKey) {
    const criteria = input.anchorCriteria || deriveAnchorCriteria(layers, input.taskContract);
    const selected = selectArchitectureAnchors(input.brandKey, criteria, input.anchorMaxCount ?? 3);
    anchors = selected.map((s) => s.anchor);
    if (anchors.length) {
      contextBlock = {
        id: 'architecture_context',
        title: 'Architecture Context',
        text: renderArchitectureContextBlock(anchors),
      };
    }
  }

  const referenceImages = anchors
    .map((a) => ({ anchorId: a.id, imagePath: resolveArchitectureAnchorImagePath(a) }))
    .filter((r) => r.imagePath);

  const ordered = [
    renderTask(layers),
    renderSpatialIntent(layers),
    renderArchitectureLanguage(layers),
    ...(contextBlock ? [contextBlock] : []),
    renderArchitectureFunctionBridge(layers),
    renderArchitecturalConcept(layers),
    renderArchitectureDna(layers),
    renderBrandTranslation(layers),
    renderFunctionalRequirement(layers),
    renderMaterial(layers),
    renderLighting(layers),
    renderComposition(layers),
    renderRendering(),
    renderNegatives(layers),
  ];

  const blocksById = Object.fromEntries(ordered.map((b) => [b.id, b]));
  const finalPrompt = ordered.map((b) => b.text).join('\n\n');
  const blockTextsByName = Object.fromEntries(ordered.map((b) => [b.id, b.text]));
  const budget = measurePromptBudget(finalPrompt, blockTextsByName);

  const presentIds = ordered.map((b) => b.id);
  // architecture_context is optional (only when anchors exist).
  const required = PHASE9B_BLOCK_IDS.filter((id) => id !== 'architecture_context');
  const missing = required.filter((id) => !presentIds.includes(id));
  if (missing.length) {
    throw new Error(`PHASE9B_COMPILER_INCOMPLETE: missing blocks ${missing.join(', ')}`);
  }

  const trace = buildTrace({
    compilerId: SPACE_PROMPT_COMPILER_ID,
    compilerVersion: SPACE_PROMPT_COMPILER_VERSION,
    packetFingerprint: undefined,
    blockSources: Object.fromEntries(ordered.map((b) => [b.id, blockSource(b.id)])),
    anchors: anchors.map((a) => ({ id: a.id, role: a.role, imagePath: a.imagePath })),
    referencePolicy: input.referencePolicy || null,
    adapter: input.adapter,
    extra: {
      brandKey: input.brandKey || null,
      anchorCriteria: input.anchorCriteria || null,
      architectureContextIncluded: Boolean(contextBlock),
      blockIds: presentIds,
      budget: { chars: budget.chars, positiveRatio: budget.positiveRatio, negativeRatio: budget.negativeRatio },
    },
  });

  return {
    schemaVersion: '1.0',
    compilerId: SPACE_PROMPT_COMPILER_ID,
    compilerVersion: SPACE_PROMPT_COMPILER_VERSION,
    sourceAdapterVersion: SPACE_QUALITY_SOURCE_ADAPTER_VERSION,
    blocks: ordered,
    blocksById,
    blockIds: presentIds,
    finalPrompt,
    editablePrompt: finalPrompt,
    anchors,
    referenceImages,
    layers,
    budget,
    trace,
  };
}

// Derive anchor selection criteria from the adapted V5 layers so the caller
// doesn't have to restate industry/scene. Industry maps from projectFacts,
// sceneType from the task subtype, commercialContext is left to the caller.
function deriveAnchorCriteria(layers, taskContract) {
  const industry = layers.projectIdentity.industry || undefined;
  const sceneType = taskContract?.subtype || undefined;
  return { industry, sceneType };
}

function blockSource(id) {
  // Declares which V5 fields feed each block (for trace/debugging).
  const map = {
    task: ['taskContract', 'projectFacts.brandName', 'projectFacts.industry'],
    spatial_intent: ['spatial.spatialConcept', 'creativeDecision.targetWorldview', 'spatial.brandRoleManifestation'],
    architecture_language: ['spatial.structureLanguage', 'spatial.signatureSpatialMechanism', 'spatial.functionalNetwork'],
    architecture_context: ['architecture-anchors/registry.json'],
    architecture_function_bridge: ['projectFacts.brandRole', 'spatial.functionalRelationships', 'spatial.sceneProgram', 'diagnosis.brandMisreadRisks'],
    architectural_concept: ['spatial.spatialConcept', 'spatial.signatureSpatialMechanism', 'spatial.structureLanguage'],
    architecture_dna: ['spatial.functionalNetwork', 'spatial.sceneProgram'],
    brand_translation: ['projectFacts', 'spatial.brandRoleManifestation'],
    functional_requirement: ['spatial.sceneProgram', 'spatial.functionalNetwork', 'spatial.mustBeVisible', 'spatial.positiveDifferentiators'],
    material: ['materialSystem[].material|behavior|forbidden'],
    lighting: ['lightingSystem.source|contrast|interactionWithMaterials|forbidden'],
    composition: ['taskContract.aspectRatio|scene', 'spatial.mustBeVisible', 'spatial.positiveDifferentiators'],
    rendering: ['(deterministic rendering standard)'],
    negative_constraints: ['taskContract.mustAvoid', 'diagnosis.brandMisreadRisks', 'materialSystem[].forbidden', 'lightingSystem.forbidden', 'colorSystem.forbidden'],
  };
  return map[id] || [];
}
