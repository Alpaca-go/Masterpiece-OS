import { arrayValue, enumValue, numberValue, objectValue, stringArray, stringValue } from '../../runtime-contracts.js';

export function validateFinalAudit(value) {
  const audit = objectValue(value?.finalAudit || value, 'finalAudit');
  const dimensions = objectValue(audit.dimensions, 'finalAudit.dimensions');
  const issues = arrayValue(audit.issues || [], 'finalAudit.issues').map((raw, index) => { const path = `finalAudit.issues[${index}]`; const item = objectValue(raw, path); const issuePath = stringValue(item.path, `${path}.path`); if (!issuePath.startsWith('/')) throw new Error(`${path}.path 必须是 JSON Pointer`); const allowedRepairPaths = stringArray(item.allowedRepairPaths, `${path}.allowedRepairPaths`, { min: 1 }); if (allowedRepairPaths.some((itemPath) => !itemPath.startsWith('/'))) throw new Error(`${path}.allowedRepairPaths 必须是 JSON Pointer`); return { issueId: `issue-${index + 1}`, severity: enumValue(item.severity, ['critical', 'major', 'minor'], `${path}.severity`), path: issuePath, reason: stringValue(item.reason, `${path}.reason`), allowedRepairPaths }; });
  const status = enumValue(audit.status, ['pass', 'needs-patch', 'fail'], 'finalAudit.status');
  if (status === 'pass' && issues.some((item) => item.severity !== 'minor')) throw new Error('finalAudit.status=pass 时不得包含 critical/major 问题');
  return { status, score: numberValue(audit.score, 'finalAudit.score', { min: 0, max: 100 }), dimensions: Object.fromEntries(['identityAccuracy', 'evidenceBoundary', 'strategicDepth', 'geneDistinctiveness', 'thesisCoverage', 'visualDistinctiveness', 'taskExecutability', 'crossFieldConsistency'].map((key) => [key, numberValue(dimensions[key], `finalAudit.dimensions.${key}`, { min: 0, max: 100 })])), issues };
}
