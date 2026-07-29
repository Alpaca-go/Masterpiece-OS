import { createVNextTaskContract } from './task-contract.js';
import { routeVNextTemplates } from './template-router.js';
import { compileVNextPrompt } from './prompt-compiler.js';
import { createSeedreamVNextAdapter } from './seedream-adapter.js';

export function compileVNextImageGeneration(input) {
  const started = performance.now();
  const adapter = input.adapter || createSeedreamVNextAdapter({ model: input.model });
  const taskContract = createVNextTaskContract(input.task, { now: input.now });
  const route = routeVNextTemplates(taskContract, { model: adapter.id });
  const compiledPrompt = compileVNextPrompt({
    projectContext: input.projectContext,
    taskContract,
    route,
    adapter,
    projectPromptAsset: input.projectPromptAsset,
  });
  const payload = adapter.compile(compiledPrompt);
  compiledPrompt.trace.promptCharacters = [...compiledPrompt.finalPrompt].length;
  compiledPrompt.trace.compileDurationMs = Number((performance.now() - started).toFixed(3));
  return { taskContract, route, compiledPrompt, payload };
}
