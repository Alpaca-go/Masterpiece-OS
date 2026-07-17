import { arrayValue, enumValue, objectValue, stringArray, stringValue } from '../../runtime-contracts.js';

export function validateCompiledImageTasks(value, visual) {
  const planned = new Map(visual.taskPlan.map((task) => [task.taskId, task]));
  const tasks = arrayValue(value?.compiledImageTasks || value, 'compiledImageTasks', { min: visual.taskPlan.length, max: visual.taskPlan.length }).map((raw, index) => {
    const path = `compiledImageTasks[${index}]`;
    const item = objectValue(raw, path);
    const taskId = stringValue(item.taskId, `${path}.taskId`);
    const skeleton = planned.get(taskId);
    if (!skeleton) throw new Error(`${path}.taskId 未在任务骨架中定义`);
    const previous = stringArray(item.consistencyWithPreviousTasks || [], `${path}.consistencyWithPreviousTasks`, { min: skeleton.role === 'anchor-image' ? 0 : 1 });
    if (skeleton.role === 'anchor-image' && previous.length) throw new Error(`${path}.consistencyWithPreviousTasks Anchor 必须为空`);
    const textPolicy = objectValue(item.textPolicy, `${path}.textPolicy`);
    const logoPolicy = objectValue(item.logoPolicy, `${path}.logoPolicy`);
    const finalPrompt = stringValue(item.finalPrompt, `${path}.finalPrompt`);
    const words = finalPrompt.trim().split(/\s+/).length;
    if (words < 180 || words > 350) throw new Error(`${path}.finalPrompt 必须为 180～350 个英文词，当前 ${words}`);
    return { taskId, subject: stringValue(item.subject, `${path}.subject`), environment: stringValue(item.environment, `${path}.environment`), narrativeMoment: stringValue(item.narrativeMoment, `${path}.narrativeMoment`), requiredElements: stringArray(item.requiredElements, `${path}.requiredElements`, { min: 1 }), optionalElements: stringArray(item.optionalElements || [], `${path}.optionalElements`), prohibitedElements: stringArray(item.prohibitedElements, `${path}.prohibitedElements`, { min: 1 }), composition: stringValue(item.composition, `${path}.composition`), focus: stringValue(item.focus, `${path}.focus`), camera: stringValue(item.camera, `${path}.camera`), color: stringValue(item.color, `${path}.color`), material: stringValue(item.material, `${path}.material`), lighting: stringValue(item.lighting, `${path}.lighting`), atmosphere: stringValue(item.atmosphere, `${path}.atmosphere`), lockedAssets: stringArray(item.lockedAssets || [], `${path}.lockedAssets`), textPolicy: { mode: enumValue(textPolicy.mode, ['no-text', 'limited-verified-text', 'use-provided-text'], `${path}.textPolicy.mode`), allowedText: stringArray(textPolicy.allowedText || [], `${path}.textPolicy.allowedText`) }, logoPolicy: { mode: enumValue(logoPolicy.mode, ['use-provided-logo', 'reserve-placeholder', 'no-logo'], `${path}.logoPolicy.mode`) }, consistencyWithGlobalSystem: stringArray(item.consistencyWithGlobalSystem, `${path}.consistencyWithGlobalSystem`, { min: 1 }), consistencyWithPreviousTasks: previous, differenceFromOtherTasks: stringArray(item.differenceFromOtherTasks, `${path}.differenceFromOtherTasks`, { min: 1 }), aspectRatio: stringValue(item.aspectRatio, `${path}.aspectRatio`), finalPrompt };
  });
  if (new Set(tasks.map((task) => task.taskId)).size !== planned.size) throw new Error('compiledImageTasks 存在重复或缺失任务');
  return tasks.sort((a, b) => visual.taskPlan.findIndex((item) => item.taskId === a.taskId) - visual.taskPlan.findIndex((item) => item.taskId === b.taskId));
}
