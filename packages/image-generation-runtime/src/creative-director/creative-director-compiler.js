import { buildCreativeDirectorPrompt } from './creative-director-prompt.js';
import { parseCreativeDirectorResponse } from './creative-director-parser.js';
import { repairCreativeDirectorBrief } from './creative-director-repair.js';
import { validateCreativeDirectorBrief } from './creative-director-validation.js';

export async function compileTransformationBrief(input, { invokeModel } = {}) {
  if (typeof invokeModel !== 'function') throw new Error('CREATIVE_DIRECTOR_MODEL_CALL_MISSING');
  const prompt = buildCreativeDirectorPrompt(input);
  const rawResponse = await invokeModel({ prompt, modelConfig: input.modelConfig });
  const parsed = parseCreativeDirectorResponse(rawResponse);
  const brief = repairCreativeDirectorBrief(parsed, input);
  const validation = validateCreativeDirectorBrief(brief, input);
  if (!validation.valid) {
    const error = new Error('CREATIVE_DIRECTOR_BRIEF_INVALID'); error.issues = validation.issues; throw error;
  }
  return { brief, prompt, validation, rawResponse };
}
