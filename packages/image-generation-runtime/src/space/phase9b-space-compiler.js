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
  normalizeAnchorIndustry,
} from './architecture-context.js';
import { measurePromptBudget } from './prompt-budget.js';
import { buildTrace } from './trace.js';
import { validateSpatialSemantics } from './semantic/validate-spatial-semantics.js';
import { renderContinuationIntentBlock } from './continuation/build-continuation-context.js';
import { enforceNoSourceProgramLeakage } from './continuation/source-program-leakage-gate.js';

export const SPACE_PROMPT_COMPILER_ID = 'phase9b-quality-compiler';
export const SPACE_PROMPT_COMPILER_VERSION = '1.1.0';

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
  if (t.subtype) {
    // R11.1 v1.2: in continuation mode the target view strategy overrides the
    // source shot (e.g. consultation uses human_scale_consultation_view, not
    // entrance_view).
    const view = layers.continuationOverride?.targetViewStrategy || t.shot;
    lines.push(`Scene: \`${t.subtype}\`${view ? ` / ${view}` : ''}.`);
  }
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
    '**Structure Language**:',
    bullet(c.structureLanguage),
  ].join('\n');
  return block('architectural_concept', 'Architectural Concept', body);
}

function renderArchitectureDna(layers) {
  const org = layers.architectureLanguage.spatialOrganization;
  const form = layers.architectureLanguage.architecturalCharacteristics;
  const strategy = layers.architectureLanguage.spatialPrinciples;
  const body = [
    '**Building DNA**:',
    `- Spatial strategy: ${strategy.slice(0, 4).join('; ') || 'n/a'}`,
    `- Form mechanisms: ${form.slice(0, 4).join('; ') || 'n/a'}`,
    `- Spatial organization: ${org.slice(0, 4).join('; ') || 'n/a'}`,
    '',
    'Maintain continuous wall↔ceiling↔floor relationships and a legible circulation hierarchy.',
  ].join('\n');
  return block('architecture_dna', 'Architecture DNA', body);
}

function renderBrandTranslation(layers) {
  const p = layers.projectIdentity;
  const body = [
    '> Brand is translated into mechanism, rhythm and surface behavior — never pasted as decoration.',
    '> Brand identity (logo, wordmark, signage text) is composited AFTER generation; do NOT render it in-scene.',
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
    '**Must Be Visible (spatial focal hierarchy; brand identity is post-composited)**:',
    bullet(layers.composition.mustBeVisible, '- (none)'),
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

// Universal negatives applied to every Phase 9B space prompt. These are
// generic (no brand/project names) and enforce two production invariants:
//   1. No in-scene brand identity — confirmed logo/wordmark is composited
//      post-generation (logo post-composite route), never drawn by the model.
//   2. No generic "AI clinic" fallback look.
//
// R8.5 redirected: trimmed from 4 lines back to 2 core guards (~250 chars,
// under the P9B-B ~366 char baseline). The R8.5.1 motif-as-architecture
// guard line was removed because R8.4 proved it does not structurally fix
// motif pollution — the fix is the action-verb rewrite IR at the source,
// not negative bloat. The brand-translation block already instructs the
// model to translate motifs into mechanism, not literal form.
const BASE_NEGATIVES = Object.freeze([
  'no rendered brand name, wordmark, logotype, signage text, or illuminated letters in the scene',
  'no generic AI clinic look, no stock-photo medical aesthetic template',
]);

function renderNegatives(layers) {
  const merged = [...BASE_NEGATIVES, ...layers.negatives];
  const body = [
    'The following MUST NOT appear in the generated image:',
    bullet(merged),
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

  // R11.1: optional small Continuation Intent block, placed right after Task
  // (before Spatial Intent). It only expresses source/target scene, preserve
  // grammar, change functional program — never a new brand analysis.
  const continuationIntentText = renderContinuationIntentBlock(input.taskContract?.continuation);
  const continuationBlock = continuationIntentText
    ? { id: 'continuation_intent', title: 'Continuation Intent', text: continuationIntentText }
    : null;

  const ordered = [
    renderTask(layers),
    ...(continuationBlock ? [continuationBlock] : []),
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

  // R10.4.1 Compiler Guard: fail BEFORE the provider if a decorative object
  // still slipped into a functional hard field. This is a belt-and-braces check
  // on top of the source-adapter demotion — the two must never disagree.
  const functionalGate = validateSpatialSemantics({
    functionalNetwork: layers._raw?.functionalNetwork ?? [],
    functionalRelationships: layers.architectureFunctionBridge?.operationConstraints ?? [],
    mustBeVisible: layers.composition?.mustBeVisible ?? [],
  });
  if (functionalGate.status === 'block') {
    const codes = [...new Set(functionalGate.findings.map((f) => f.code))].join(', ');
    throw Object.assign(
      new Error(`SPACE_DECORATIVE_OBJECT_SEMANTIC_LEAK: ${codes}`),
      { code: 'SPACE_DECORATIVE_OBJECT_SEMANTIC_LEAK', findings: functionalGate.findings },
    );
  }

  // R11.1 v1.2 Source Program Leakage Gate: in continuation mode the final
  // prompt must not re-introduce the dropped source program elements / tags /
  // view. Fail closed BEFORE the provider.
  if (input.taskContract?.generationBasis === 'continuation' && input.taskContract?.continuation) {
    enforceNoSourceProgramLeakage({
      contract: input.taskContract.continuation,
      finalPrompt,
    });
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
      semantic: layers.semantic
        ? {
            architectureSemanticsCount: layers.semantic.architectureSemantics.length,
            brandMotifSemanticsCount: layers.semantic.brandMotifSemantics.length,
            colorAccentSemanticsCount: layers.semantic.colorAccentSemantics.length,
            functionalSemanticsCount: layers.semantic.functionalSemantics.length,
            decorativeIdentitySemanticsCount: layers.semantic.decorativeIdentitySemantics.length,
            colorGeometryCouplingRisk: layers.semantic.colorGeometryCouplingRisk,
            sourceAdapterVersion: layers.sourceAdapterVersion,
          }
        : null,
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
  const industry = normalizeAnchorIndustry(layers.projectIdentity.industry);
  const sceneType = taskContract?.subtype || undefined;
  return { industry, sceneType };
}

function blockSource(id) {
  // Declares which V5 fields feed each block (for trace/debugging).
  // R8.5 redirected: architecture blocks now read the action-verb IR
  // (architectureStrategy / architectureForm / architectureOrganization),
  // not raw V5 Chinese prose lists.
  const map = {
    task: ['taskContract', 'projectFacts.brandName', 'projectFacts.industry'],
    spatial_intent: ['spatial.spatialConcept (normalized)', 'semantic.architectureStrategy'],
    architecture_language: ['semantic.architectureStrategy', 'semantic.architectureForm', 'semantic.architectureOrganization', 'materialSystem', 'lightingSystem'],
    architecture_context: ['architecture-anchors/registry.json'],
    architecture_function_bridge: ['projectFacts.brandRole', 'spatial.functionalRelationships', 'spatial.sceneProgram', 'spatial.brandRoleManifestation', 'diagnosis.brandMisreadRisks'],
    architectural_concept: ['spatial.spatialConcept (normalized)', 'semantic.architectureForm', 'semantic.architectureStrategy'],
    architecture_dna: ['semantic.architectureStrategy', 'semantic.architectureForm', 'semantic.architectureOrganization'],
    brand_translation: ['projectFacts', 'semantic.brandMotifSemantics', 'semantic.decorativeIdentitySemantics', 'semantic.colorAccentSemantics', 'spatial.brandRoleManifestation', '_raw.mustBeVisible (identity items only)'],
    functional_requirement: ['spatial.sceneProgram', 'spatial.functionalNetwork', 'composition.mustBeVisible (spatial items only)', 'spatial.positiveDifferentiators'],
    material: ['materialSystem[].material|behavior|forbidden'],
    lighting: ['lightingSystem.source|contrast|interactionWithMaterials|forbidden'],
    composition: ['taskContract.aspectRatio|scene', 'composition.mustBeVisible (spatial items only)', 'spatial.positiveDifferentiators'],
    rendering: ['(deterministic rendering standard)'],
    negative_constraints: ['taskContract.mustAvoid', 'diagnosis.brandMisreadRisks', 'materialSystem[].forbidden', 'lightingSystem.forbidden', 'colorSystem.forbidden', 'BASE_NEGATIVES (2 universal guards)'],
    continuation_intent: ['taskContract.continuation (source/target scene, preserve grammar, change program) — R11.1, no brand re-analysis'],
  };
  return map[id] || [];
}
