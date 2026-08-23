import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const c2 = path.join(root, 'docs', 'creative-intelligence', 'ci-w1c.8-g02-c.2');
const a3 = path.join(root, 'docs', 'creative-intelligence', 'ci-w1c.8-g02-a.3');
const c = path.join(root, 'docs', 'creative-intelligence', 'ci-w1c.8-g02-c');
const g01 = path.join(root, 'docs', 'creative-intelligence', 'ci-w1c.7.5-r1.7');

const canonicalize = (value) => Array.isArray(value)
  ? value.map(canonicalize)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
    : value;
const sha = (value) => createHash('sha256').update(value).digest('hex');
const fingerprint = (value) => sha(JSON.stringify(canonicalize(value)));
const readJson = (filename) => readFile(filename, 'utf8').then(JSON.parse);

const [authorization, identity, anchorMap, binding, originalBytes, g01Sha] = await Promise.all([
  readJson(path.join(c2, 'g02-attempt-1-repair.authorization.manifest.json')),
  readJson(path.join(a3, 'g02-source-identity.redacted.json')),
  readJson(path.join(a3, 'g02-ground-truth-anchor-map.json')),
  readJson(path.join(c2, 'g02-anchor-runtime-binding.json')),
  readFile(path.join(c, 'g02-attempt-1.execution.manifest.json')),
  readFile(path.join(g01, 'g01-frozen-baseline.manifest.sha256'), 'utf8'),
]);

const checks = [];
const add = (id, pass, detail) => checks.push({ id, pass: Boolean(pass), detail });
const auth = authorization.authorization ?? {};
const frozen = authorization.frozenInputs ?? {};
const boundary = authorization.executionBoundary ?? {};
const retry = authorization.retryPolicy ?? {};
const manifestCopy = structuredClone(authorization);
delete manifestCopy.manifestFingerprint;

add('REPAIR-AUTH-01', auth.humanAuthorized === true && auth.authorizationScope === 'G02 Attempt 1 Repair Run', 'independent human repair authorization');
add('REPAIR-AUTH-02', JSON.stringify(auth.approvedStages) === JSON.stringify(['Planning', 'Strategic']) && auth.allowConcept === false && auth.allowDirection === false && auth.allowImage === false, 'Planning and Strategic only');
add('REPAIR-AUTH-03', auth.provider === 'dashscope' && auth.model === 'qwen3.6-plus' && auth.timeoutMs === 360000, 'provider, model, and timeout frozen');
add('REPAIR-FROZEN-01', frozen.sourceSha256 === identity.source.sha256 && frozen.sourceSizeBytes === identity.source.sizeBytes, 'source identity unchanged');
add('REPAIR-FROZEN-02', frozen.g01Fingerprint === g01Sha.trim().split(/\s+/)[0], 'G01 fingerprint unchanged');
add('REPAIR-FROZEN-03', frozen.anchorMapFingerprint === fingerprint(anchorMap), 'Ground Truth Anchor Map fingerprint unchanged');
add('REPAIR-HISTORY-01', frozen.originalAttemptExecutionManifestSha256 === sha(originalBytes), 'Original Attempt 1 evidence preserved by content hash');
add('REPAIR-BIND-01', anchorMap.anchors.length === binding.anchors.length && binding.anchors.every((item) => item.planningClaimKeys.length > 0), 'all anchors have generic Planning-key bindings');
add('REPAIR-BUDGET-01', retry.countersAreIndependent === true && retry.maximumProviderAttemptsPerStage === 3 && retry.maximumTransportRetriesPerStage === 1 && retry.maximumSemanticRepairsPerStage === 1 && retry.maximumLiveCalls === 6, 'B contract retry budget retained');
add('REPAIR-SCOPE-01', boundary.planning === true && boundary.strategic === true && boundary.concept === false && boundary.direction === false && boundary.image === false && boundary.packaging === false && boundary.automaticG02DTransition === false, 'execution is stopAfter synthesis');
add('REPAIR-AUTH-04', authorization.manifestFingerprint === fingerprint(manifestCopy), 'authorization fingerprint canonical');

for (const check of checks) console.log(`${check.id} ${check.pass ? 'PASS' : 'FAIL'} - ${check.detail}`);
if (checks.some((check) => !check.pass)) process.exitCode = 1;

export { canonicalize, fingerprint };
