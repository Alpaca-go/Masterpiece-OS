import { getDeliverablePolicy } from '../deliverables/deliverable-policies.js';

const error = (code, message, detail) => ({
  code,
  gate: 'task_executability',
  message,
  ...(detail ? { detail } : {}),
});

export function evaluateDeliverableGate({
  deliverable,
  userIntentResolution,
  compiledPrompt,
  referencePlan,
}) {
  const errors = [];
  if (!deliverable) return [error('DELIVERABLE_MISSING', '请选择本次生图交付类型。')];
  let policy;
  try {
    policy = getDeliverablePolicy(deliverable);
  } catch {
    return [error('DELIVERABLE_UNSUPPORTED', `不支持的交付类型：${deliverable}`)];
  }
  if (userIntentResolution?.conflicts?.length) {
    errors.push(error(
      'DELIVERABLE_USER_INTENT_CONFLICT',
      userIntentResolution.conflicts[0].message,
      userIntentResolution.conflicts[0],
    ));
  }
  const prompt = String(compiledPrompt ?? '');
  const missingConcepts = policy.requiredPromptConcepts.filter((concept) => !prompt.includes(concept));
  if (missingConcepts.length) {
    errors.push(error(
      deliverable === 'interior_scene'
        ? 'INTERIOR_SCENE_SPATIAL_REQUIREMENTS_MISSING'
        : deliverable === 'storefront_scene'
          ? 'STOREFRONT_SCENE_REQUIREMENTS_MISSING'
          : 'DELIVERABLE_PROMPT_INCOMPLETE',
      `交付 Prompt 缺少：${missingConcepts.join('、')}`,
      { missingConcepts },
    ));
  }
  const selectedRoles = new Set((referencePlan?.selected ?? []).map((item) => item.role));
  const missingRoles = policy.requiredReferenceRoles.filter((role) => !selectedRoles.has(role));
  if (missingRoles.length) {
    errors.push(error(
      deliverable === 'packaging_render' && missingRoles.includes('structure_reference')
        ? 'PACKAGING_STRUCTURE_REFERENCE_MISSING'
        : 'DELIVERABLE_REFERENCE_MISMATCH',
      `参考图计划缺少：${missingRoles.join('、')}`,
      { missingRoles },
    ));
  }
  if (
    deliverable === 'interior_scene'
    && (referencePlan?.selected ?? []).some((item) => item.role === 'analysis_only' || item.role === 'excluded')
  ) {
    errors.push(error('INTERIOR_SCENE_FLATLAY_CONFLICT', '空间任务选择了仅分析或已排除的 VI 物料。'));
  }
  return errors;
}
