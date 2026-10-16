import path from 'node:path';

export const workflowBackend = 'packages/visual-workflow/';
export const workflowFrontend = 'apps/web/src/features/visual-workflow/';
export const workflowIntegrations = new Set(['apps/web-runtime/src/node-runtime-host.ts', 'apps/web-runtime/src/local-rpc-server.ts', 'apps/web/src/App.tsx', 'apps/web/src/lib/useUrlScreen.ts']);
const uiLibraries = new Set(['react', 'react-router-dom', 'marked', 'dompurify']);

// Inspect all module-loading forms, including re-exports and CommonJS. Do not
// give relative paths or dynamic imports a way around the package boundary.
export function checkWorkflowSource(root, relative, body) {
  const issues = [];
  const backend = relative.startsWith(workflowBackend + 'src/');
  const frontend = relative.startsWith(workflowFrontend);
  const integrated = workflowIntegrations.has(relative);
  const within = (target, directory) => target.startsWith(path.resolve(root, directory) + path.sep);
  const file = path.resolve(root, relative);
  const modules = [...body.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)(['"`])([^'"`]+)\1/gu)].map(match => match[2]);
  for (const specifier of modules) {
    const local = specifier.startsWith('.') || path.isAbsolute(specifier);
    const target = local ? path.resolve(path.dirname(file), specifier) : null;
    if (backend || frontend) {
      if (local && !within(target, backend ? workflowBackend : workflowFrontend)) issues.push('dependency escapes its workflow owner');
      if (!local && !(backend ? specifier.startsWith('node:') || specifier === 'sharp' : uiLibraries.has(specifier))) issues.push('unapproved external dependency');
      if (specifier.includes('${')) issues.push('computed module loading cannot be verified');
    } else if (!integrated && (specifier.startsWith('@masterpiece/visual-workflow') || target && (within(target, workflowBackend) || within(target, workflowFrontend)))) {
      issues.push('another capability consumes isolated workflow implementation');
    }
  }
  if ((backend || frontend) && /\b(?:import|require)\s*\(\s*[^\s'"`]/u.test(body)) issues.push('nonliteral module loading cannot be verified');
  if (backend && /process\s*(?:\.\s*env|\[\s*['"]env['"]\s*\])/u.test(body)) issues.push('global environment is not workflow configuration');
  if (frontend && /window\s*(?:\.\s*masterpiece|\[\s*['"]masterpiece['"]\s*\])|@masterpiece\//u.test(body)) issues.push('shared business API/contract access');
  if (!backend && !frontend && !integrated && /@masterpiece\/visual-workflow|visual-workflow:|features\/visual-workflow|packages\/visual-workflow/u.test(body)) issues.push('another capability calls the isolated workflow');
  return issues.map(issue => `${relative}: ${issue}`);
}
