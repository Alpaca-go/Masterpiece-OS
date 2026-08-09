// Final Acceptance Artifact Integrity Gate (R10.4.1 §15-§27).
//
// Every final-acceptance sample must be provably bound to its real run and
// output: runId, imageSha256, promptHash, compilerId, commitSha, baselineId,
// generatedAt. The gate is FAIL-CLOSED: any mismatch (image hash, run id,
// prompt hash, compiler, stale sample, historical sample, wrong baseline)
// blocks final acceptance. It must never be warning-only.
//
// It is pure/offline — no filesystem, no provider, no network.

import crypto from 'node:crypto';

export const FINAL_ACCEPTANCE_INTEGRITY_VERSION = 'final-acceptance-artifact-integrity@1.0.0';

export const REQUIRED_EVALUATION_FIELDS = Object.freeze([
  'schemaVersion',
  'sampleId',
  'runId',
  'imageSha256',
  'promptHash',
  'compilerId',
  'commitSha',
  'baselineId',
  'generatedAt',
  'evaluatedAt',
  'result',
  'humanEvaluation',
  'scores',
]);

/**
 * Verify that a final-acceptance sample is a genuine, fresh artifact of the
 * current run/compiler/commit.
 *
 * @param {object} input
 * @param {object} input.evaluation          evaluation.json (must carry the
 *   R10.4.1 required fields, §17)
 * @param {object} input.run                 run.json (source run record)
 * @param {Buffer} input.outputBuffer        bytes of output.png (for sha256)
 * @param {string} input.compiledPromptHash  sha256 of the compiled final prompt
 * @param {string[]} input.acceptedCompilerIds  expected production compiler ids
 * @param {string} input.expectedBaselineId  e.g. 'r10.4.1-post-repair'
 * @param {string} input.repairCommitSha     R10.4.1 repair commit
 * @param {string} input.repairCommitTime    ISO timestamp of the repair commit
 *   (freshness: generatedAt must be >= repair commit time)
 * @param {boolean} [input.allowHistorical]  set true only for carried-forward
 *   evidence (must then be marked historicalOnly and excluded from the fresh
 *   pass count, §24)
 * @returns {{ status:string, checks:object, staleSample:boolean,
 *             sampleIsFresh:boolean, historicalOnly:boolean, findings:string[] }}
 */
export function verifyFinalAcceptanceArtifactIntegrity({
  evaluation = {},
  run = {},
  outputBuffer = null,
  compiledPromptHash = '',
  acceptedCompilerIds = [],
  expectedBaselineId = '',
  repairCommitSha = '',
  repairCommitTime = '',
  allowHistorical = false,
} = {}) {
  const findings = [];
  const check = (name, pass, detail) => {
    if (!pass) findings.push(`${name}: ${detail}`);
    return Boolean(pass);
  };

  // Required evaluation fields present.
  for (const field of REQUIRED_EVALUATION_FIELDS) {
    check(`field.${field}`, Object.prototype.hasOwnProperty.call(evaluation, field), `missing evaluation.${field}`);
  }

  // runId binding.
  const runIdMatched = check('runId', evaluation.runId && evaluation.runId === run.runId, `evaluation.runId=${evaluation.runId} run.runId=${run.runId}`);

  // imageSha256 binding (recompute from the actual output bytes).
  const computedHash = outputBuffer && outputBuffer.length
    ? crypto.createHash('sha256').update(outputBuffer).digest('hex')
    : '';
  const imageHashMatched = check('imageSha256', computedHash === evaluation.imageSha256, `computed=${computedHash.slice(0, 12)} evaluation=${evaluation.imageSha256?.slice(0, 12)}`);

  // promptHash binding (evaluation.promptHash == compiled prompt hash).
  const promptHashMatched = check('promptHash', compiledPromptHash && compiledPromptHash === evaluation.promptHash, `compiled=${compiledPromptHash.slice(0, 12)} evaluation=${evaluation.promptHash?.slice(0, 12)}`);

  // compilerId binding.
  const compilerMatched = check('compilerId', acceptedCompilerIds.includes(evaluation.compilerId), `compilerId=${evaluation.compilerId} accepted=[${acceptedCompilerIds.join(',')}]`);

  // baseline binding.
  const baselineMatched = check('baselineId', evaluation.baselineId === expectedBaselineId, `baselineId=${evaluation.baselineId} expected=${expectedBaselineId}`);

  // commit binding + freshness.
  const commitMatched = check('commitSha', Boolean(evaluation.commitSha), 'missing commitSha');
  const generatedAt = evaluation.generatedAt ? new Date(evaluation.generatedAt).getTime() : NaN;
  const repairAt = repairCommitTime ? new Date(repairCommitTime).getTime() : NaN;
  const staleSample = Number.isFinite(generatedAt) && Number.isFinite(repairAt)
    ? generatedAt < repairAt
    : true;
  check('freshness', !staleSample, `generatedAt=${evaluation.generatedAt} repairCommitTime=${repairCommitTime}`);

  const historicalOnly = Boolean(allowHistorical && (!runIdMatched || !imageHashMatched || staleSample));

  const status = findings.length ? 'block' : 'pass';
  return {
    schemaVersion: '1.0',
    version: FINAL_ACCEPTANCE_INTEGRITY_VERSION,
    status,
    checks: {
      runIdMatched,
      imageHashMatched,
      promptHashMatched,
      compilerMatched,
      commitMatched,
      baselineMatched,
      sampleIsFresh: !staleSample,
    },
    staleSample,
    sampleIsFresh: !staleSample,
    historicalOnly,
    findings,
  };
}
