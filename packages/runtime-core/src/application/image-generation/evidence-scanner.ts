// Run evidence scanner for the Shared Runtime.
//
// This is the FIRST of two layers. It knows the filesystem paths
// and reads the 9 evidence files into a pure-data EvidenceBundle.
// The runtime validator (packages/image-generation-runtime/src/space/
// gates/evidence-integrity-gate.js) consumes the bundle without
// ever reading the filesystem.
//
// Design intent (r2.0 §8):
//   - Filesystem knowledge lives HERE. The runtime does not know
//     project roots, compile artifact dirs, or run dirs.
//   - Binding EXTRACTION (not enforcement) lives HERE. The scanner
//     extracts runId / taskId / promptHash / imageHash /
//     referenceIds / targetScene / generationBasis from the files
//     and packages them into bundle.bindings. The runtime
//     validator checks these against the caller's context.
//   - Per-file sha256 is computed here (so the runtime can
//     cross-check output.png against run.json's claim without
//     re-reading the file).
//   - The scanner is a single async function. No factory, no
//     singleton. The caller passes the dirs it already knows.

import crypto from 'node:crypto';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import type {
  EvidenceBundle,
  ShortChainEvidenceFileName,
  ShortChainEvidenceFileRecord,
  ShortChainEvidenceValidationContext,
  ShortChainEvidenceCheckpoint,
} from '@masterpiece/image-generation-contracts/index.ts';
import { validateShortChainEvidenceIntegrity } from '@masterpiece/image-generation-runtime/core/space-generation-core.js';

const EVIDENCE_BUNDLE_VERSION = '1.0';

// r2.0 §8: the 9 evidence files the scanner reads. Mirrors the
// contract union; kept as a typed array for safety.
const EVIDENCE_FILE_NAMES: ShortChainEvidenceFileName[] = [
  'task-contract.json',
  'target-scene-projection.json',
  'prompt-source-map.json',
  'reference-trace.json',
  'provider-payload.redacted.json',
  'trace.json',
  'run.json',
  'output.png',
  'validations/summary.json',
];

export interface ShortChainEvidenceScannerInput {
  projectId: string;
  taskId: string;
  /** runId is required for the evidence files in the run directory. */
  runId: string | null;
  /** <projectRoot>/image-generation-vnext/compilations/<taskId>. */
  compileArtifactDir: string;
  /** <projectRoot>/image-generation/<runId>; null when the run never started. */
  runDir: string | null;
  /** <projectRoot>/image-generation-vnext/validations; null when no validated flow. */
  validationsDir: string | null;
  /** Optional clock override for tests. */
  now?: () => Date;
}

/**
 * Resolve the on-disk path for one of the 9 evidence files.
 */
function resolveFilePath(
  name: ShortChainEvidenceFileName,
  input: ShortChainEvidenceScannerInput,
  runFirstImageName: string | null,
): { path: string; exists: boolean } {
  const compileDir = input.compileArtifactDir;
  if (name === 'task-contract.json'
    || name === 'target-scene-projection.json'
    || name === 'prompt-source-map.json'
    || name === 'reference-trace.json'
    || name === 'provider-payload.redacted.json'
    || name === 'trace.json') {
    const p = path.join(compileDir, name);
    return { path: p, exists: true };
  }
  if (name === 'run.json') {
    if (!input.runDir) return { path: '', exists: false };
    return { path: path.join(input.runDir, name), exists: true };
  }
  if (name === 'output.png') {
    if (!input.runDir) return { path: '', exists: false };
    // The "preserved first" image is run.images[0].relativePath. The
    // scanner does not know the file name in advance (it differs
    // per run), so we use the firstImageName computed during the
    // run.json read. If run.json is missing, the caller passes
    // null and output.png is marked absent. The relativePath is
    // the FULL project-relative path (e.g. "images/img-1.png"),
    // so we join it directly to runDir without an extra "images"
    // segment.
    if (!runFirstImageName) return { path: '', exists: false };
    return { path: path.join(input.runDir, runFirstImageName), exists: true };
  }
  if (name === 'validations/summary.json') {
    if (!input.validationsDir) return { path: '', exists: false };
    return { path: path.join(input.validationsDir, `${input.taskId}.summary.json`), exists: true };
  }
  return { path: '', exists: false };
}

function detectKind(name: ShortChainEvidenceFileName, buf: Buffer | null): ShortChainEvidenceFileRecord['kind'] {
  if (name === 'output.png') return 'image';
  if (buf === null) return null;
  // Cheap signature probe: JSON object / array / text.
  const trimmed = buf.subarray(0, Math.min(buf.length, 16)).toString('utf8').trimStart();
  if (trimmed.startsWith('{')) return 'json-object';
  if (trimmed.startsWith('[')) return 'json-array';
  return 'text';
}

function parseJsonSafely(buf: Buffer): { payload: unknown; error: string | null } {
  try {
    const parsed = JSON.parse(buf.toString('utf8'));
    return { payload: parsed, error: null };
  } catch (error) {
    return { payload: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function sha256OfBuffer(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Read the run.json file and extract the first image's relative
 * path. Returns null when run.json is missing, unreadable, or has
 * no image.
 */
async function readFirstImageName(runDir: string | null): Promise<string | null> {
  if (!runDir) return null;
  try {
    const raw = await fsp.readFile(path.join(runDir, 'run.json'), 'utf8');
    const json = JSON.parse(raw) as { images?: Array<{ relativePath?: string }> };
    const first = Array.isArray(json.images) ? json.images[0] : null;
    if (first && typeof first === 'object' && typeof first.relativePath === 'string') {
      return first.relativePath;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Read a single evidence file. Returns the per-file record
 * (always present in the output, even when missing / unreadable).
 */
async function readOne(
  name: ShortChainEvidenceFileName,
  resolvedPath: string,
): Promise<ShortChainEvidenceFileRecord> {
  let exists = false;
  let sizeBytes = 0;
  let sha256: string | null = null;
  let kind: ShortChainEvidenceFileRecord['kind'] = null;
  let payload: unknown = null;
  let error: string | null = null;
  if (!resolvedPath) {
    return { name, path: resolvedPath, exists, sizeBytes, sha256, kind, payload, error: null };
  }
  try {
    const stat = await fsp.stat(resolvedPath);
    exists = true;
    sizeBytes = stat.size;
    if (sizeBytes === 0) {
      kind = detectKind(name, null);
      return { name, path: resolvedPath, exists, sizeBytes, sha256: null, kind, payload: null, error: null };
    }
    const buf = await fsp.readFile(resolvedPath);
    sha256 = sha256OfBuffer(buf);
    kind = detectKind(name, buf);
    if (kind === 'json-object' || kind === 'json-array') {
      const parsed = parseJsonSafely(buf);
      payload = parsed.payload;
      if (parsed.error) error = parsed.error;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  return { name, path: resolvedPath, exists, sizeBytes, sha256, kind, payload, error };
}

/**
 * Extract the binding snapshot from the bundle's per-file records.
 * Mirrors the runtime validator's extractEvidenceBindings but
 * uses the bundle's already-parsed payloads.
 */
function extractBindingsFromBundle(bundle: EvidenceBundle): EvidenceBundle['bindings'] {
  const contract = bundle.files.find((r) => r.name === 'task-contract.json');
  const run = bundle.files.find((r) => r.name === 'run.json');
  const trace = bundle.files.find((r) => r.name === 'trace.json');
  const payload = bundle.files.find((r) => r.name === 'provider-payload.redacted.json');
  const refTrace = bundle.files.find((r) => r.name === 'reference-trace.json');

  const contractObj = (contract && contract.payload && typeof contract.payload === 'object')
    ? contract.payload as Record<string, unknown> : null;
  const runObj = (run && run.payload && typeof run.payload === 'object')
    ? run.payload as Record<string, unknown> : null;
  const traceObj = (trace && trace.payload && typeof trace.payload === 'object')
    ? trace.payload as Record<string, unknown> : null;
  const traceTrace = (traceObj && traceObj.trace && typeof traceObj.trace === 'object')
    ? traceObj.trace as Record<string, unknown> : null;
  const payloadObj = (payload && payload.payload && typeof payload.payload === 'object')
    ? payload.payload as Record<string, unknown> : null;
  const refObj = (refTrace && refTrace.payload && typeof refTrace.payload === 'object')
    ? refTrace.payload as Record<string, unknown> : null;

  // runId from run.json
  const runId = (runObj && typeof runObj.runId === 'string') ? runObj.runId : null;
  // taskId from task-contract.json
  const taskId = (contractObj && typeof contractObj.taskId === 'string') ? contractObj.taskId : null;
  // promptHash from trace.json's trace.sourceFingerprint, fallback to provider-payload.redacted.json
  let promptHash: string | null = null;
  if (traceTrace && typeof traceTrace.sourceFingerprint === 'string') {
    promptHash = traceTrace.sourceFingerprint;
  } else if (payloadObj && typeof payloadObj.promptHash === 'string') {
    promptHash = payloadObj.promptHash;
  }
  // imageHash from run.json's images[0].sha256
  let imageHash: string | null = null;
  if (runObj && Array.isArray(runObj.images) && runObj.images[0]) {
    const first = runObj.images[0] as { sha256?: string };
    if (typeof first.sha256 === 'string') imageHash = first.sha256;
  }
  // referenceIds: prefer reference-trace.json's references[].id
  let referenceIds: string[] = [];
  if (refObj && Array.isArray(refObj.references)) {
    referenceIds = (refObj.references as Array<{ id?: string }>)
      .map((entry) => (entry && typeof entry.id === 'string') ? entry.id : '')
      .filter((id) => id.length > 0);
  } else if (contractObj && Array.isArray(contractObj.referenceAssetIds)) {
    referenceIds = (contractObj.referenceAssetIds as string[])
      .filter((id) => typeof id === 'string' && id.length > 0);
  }
  // targetScene = task-contract.subtype
  const targetScene = (contractObj && typeof contractObj.subtype === 'string') ? contractObj.subtype : null;
  // generationBasis
  let generationBasis: 'standard' | 'reference_first' | 'continuation' | null = null;
  if (contractObj) {
    const basis = contractObj.generationBasis;
    if (basis === 'standard' || basis === 'reference_first' || basis === 'continuation') {
      generationBasis = basis;
    }
  }
  return { runId, taskId, promptHash, imageHash, referenceIds, targetScene, generationBasis };
}

/**
 * Scan the 9 evidence files for a given (project, task, run) and
 * return a pure-data EvidenceBundle. The bundle is the data
 * contract between the evidence scanner and the runtime validator.
 *
 * The scanner:
 *   - never THROWS on missing / unreadable files; each file is
 *     recorded with `exists: false` / `error: ...` in the bundle
 *   - extracts the binding snapshot (runId / taskId / promptHash /
 *     imageHash / referenceIds / targetScene / generationBasis)
 *     for the runtime validator
 *   - computes sha256 of every readable file (so the runtime can
 *     cross-check output.png against run.json's claim without
 *     re-reading the file)
 */
export async function scanShortChainEvidence(input: ShortChainEvidenceScannerInput): Promise<EvidenceBundle> {
  // Step 1: read run.json's first image name so we know where
  // output.png is. Done in parallel with the compile-dir reads.
  const firstImageNamePromise = readFirstImageName(input.runDir);
  // Step 2: read the 6 compile-dir files in parallel.
  const compileNames: ShortChainEvidenceFileName[] = [
    'task-contract.json',
    'target-scene-projection.json',
    'prompt-source-map.json',
    'reference-trace.json',
    'provider-payload.redacted.json',
    'trace.json',
  ];
  const compileReads = await Promise.all(
    compileNames.map(async (name) => {
      const { path: p } = resolveFilePath(name, input, null);
      return readOne(name, p);
    }),
  );
  // Step 3: resolve runDir files (run.json + output.png) now that
  // we have firstImageName.
  const firstImageName = await firstImageNamePromise;
  const runPath = resolveFilePath('run.json', input, null);
  const outputPath = resolveFilePath('output.png', input, firstImageName);
  const validationsPath = resolveFilePath('validations/summary.json', input, null);
  const [runRec, outputRec, valRec] = await Promise.all([
    readOne('run.json', runPath.path),
    readOne('output.png', outputPath.path),
    readOne('validations/summary.json', validationsPath.path),
  ]);
  const files: ShortChainEvidenceFileRecord[] = [
    ...compileReads,
    runRec,
    outputRec,
    valRec,
  ];
  // Ensure all 9 file names are present (defensive — the explicit
  // EVIDENCE_FILE_NAMES list is the single source of truth).
  for (const name of EVIDENCE_FILE_NAMES) {
    if (!files.some((f) => f.name === name)) {
      files.push({
        name,
        path: '',
        exists: false,
        sizeBytes: 0,
        sha256: null,
        kind: null,
        payload: null,
        error: 'scanner did not record this file',
      });
    }
  }
  const now = input.now ?? (() => new Date());
  const bundle: EvidenceBundle = {
    schemaVersion: EVIDENCE_BUNDLE_VERSION,
    projectId: input.projectId,
    taskId: input.taskId,
    compileArtifactDir: input.compileArtifactDir,
    runDir: input.runDir,
    validationsDir: input.validationsDir,
    files,
    // bindings is filled after construction; the type allows
    // undefined-safe initialization via the helper below.
    bindings: {
      runId: null,
      taskId: null,
      promptHash: null,
      imageHash: null,
      referenceIds: [],
      targetScene: null,
      generationBasis: null,
    },
    capturedAt: now().toISOString(),
  };
  bundle.bindings = extractBindingsFromBundle(bundle);
  return bundle;
}

/**
 * High-level orchestrator: scan + validate in one call. The
 * runtime service / smoke runner / UI all use this.
 */
export async function runShortChainEvidenceCheckpoint(
  input: ShortChainEvidenceScannerInput,
  context: ShortChainEvidenceValidationContext = {},
): Promise<ShortChainEvidenceCheckpoint> {
  const bundle = await scanShortChainEvidence(input);
  // The runtime validator is a JS module; its return value
  // structurally matches ShortChainEvidenceCheckpoint but TypeScript
  // needs the cast.
  return validateShortChainEvidenceIntegrity(bundle, context) as ShortChainEvidenceCheckpoint;
}
