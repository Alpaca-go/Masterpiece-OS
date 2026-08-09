import { getVNextTemplate } from './template-registry.js';

export const SHORT_CHAIN_TEMPLATE_ROUTER_VERSION = 'short-chain-template-router@1.0.0';

export function routeVNextTemplates(task, options = {}) {
  const model = options.model || 'seedream-5.0-pro';
  const ids = [
    `family.${task.deliverableFamily}`,
    `subtype.${task.deliverableFamily}.${task.subtype}`,
    `shot.${task.deliverableFamily}.${task.shot}`,
  ];
  const templates = ids.map((id) => {
    const template = getVNextTemplate(id);
    if (!template) throw new Error(`No vNext template registered for ${id}`);
    if (!template.appliesTo.models.includes(model)) {
      throw new Error(`Template ${id} does not support model ${model}`);
    }
    return template;
  });
  if (templates.some((template) => template.deliverableFamily !== task.deliverableFamily)) {
    throw new Error('Template route crossed deliverable families');
  }
  return {
    familyTemplateId: templates[0].id,
    subtypeTemplateId: templates[1].id,
    shotTemplateId: templates[2].id,
    templateVersions: Object.fromEntries(templates.map((template) => [template.id, template.version])),
    templates,
  };
}

