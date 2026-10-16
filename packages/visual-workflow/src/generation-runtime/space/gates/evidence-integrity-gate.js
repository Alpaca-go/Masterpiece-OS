const VNEXT_EVIDENCE_INTEGRITY_GATE_VERSION = "vnext-evidence-integrity-gate@1.0.0";
const VNEXT_EVIDENCE_FILE_NAMES = Object.freeze([
  "task-contract.json",
  "target-scene-projection.json",
  "prompt-source-map.json",
  "reference-trace.json",
  "provider-payload.redacted.json",
  "trace.json",
  "run.json",
  "output.png",
  "validations/summary.json"
]);
function computeRequiredFiles(generationBasis, expectedValidated) {
  const required = [
    "task-contract.json",
    "provider-payload.redacted.json",
    "trace.json",
    "run.json",
    "output.png"
  ];
  if (generationBasis === "reference_first" || generationBasis === "continuation") {
    required.push("reference-trace.json");
  }
  if (expectedValidated) {
    required.push("validations/summary.json");
  }
  return required;
}
function findFile(bundle, name) {
  return bundle.files.find((record) => record.name === name);
}
function issue(severity, code, message, file) {
  return { severity, code, message, file: file ?? null };
}
function readRunId(bundle) {
  const record = findFile(bundle, "run.json");
  if (!record || !record.payload || typeof record.payload !== "object") return null;
  const runId = record.payload.runId;
  return typeof runId === "string" && runId.length > 0 ? runId : null;
}
function readTaskId(bundle) {
  const record = findFile(bundle, "task-contract.json");
  if (!record || !record.payload || typeof record.payload !== "object") return null;
  const taskId = record.payload.taskId;
  return typeof taskId === "string" && taskId.length > 0 ? taskId : null;
}
function readPromptHash(bundle) {
  const trace = findFile(bundle, "trace.json");
  if (trace && trace.payload && typeof trace.payload === "object") {
    const traceRec = trace.payload.trace;
    if (traceRec && typeof traceRec === "object") {
      const fp = traceRec.sourceFingerprint;
      if (typeof fp === "string" && fp.length > 0) return fp;
    }
  }
  const payload = findFile(bundle, "provider-payload.redacted.json");
  if (payload && payload.payload && typeof payload.payload === "object") {
    const ph = payload.payload.promptHash;
    if (typeof ph === "string" && ph.length > 0) return ph;
  }
  return null;
}
function readImageHash(bundle) {
  const record = findFile(bundle, "run.json");
  if (!record || !record.payload || typeof record.payload !== "object") return null;
  const images = record.payload.images;
  if (!Array.isArray(images) || images.length === 0) return null;
  const first = images[0];
  if (!first || typeof first !== "object") return null;
  const sha = first.sha256;
  return typeof sha === "string" && sha.length > 0 ? sha : null;
}
function readReferenceIds(bundle) {
  const trace = findFile(bundle, "reference-trace.json");
  if (trace && trace.payload && typeof trace.payload === "object") {
    const refs = trace.payload.references;
    if (Array.isArray(refs)) {
      return refs.map((entry) => entry && typeof entry === "object" ? entry.id : null).filter((id) => typeof id === "string" && id.length > 0);
    }
  }
  const contract = findFile(bundle, "task-contract.json");
  if (contract && contract.payload && typeof contract.payload === "object") {
    const ids = contract.payload.referenceAssetIds;
    if (Array.isArray(ids)) {
      return ids.filter((id) => typeof id === "string" && id.length > 0);
    }
  }
  return [];
}
function readTargetScene(bundle) {
  const contract = findFile(bundle, "task-contract.json");
  if (!contract || !contract.payload || typeof contract.payload !== "object") return null;
  const subtype = contract.payload.subtype;
  return typeof subtype === "string" && subtype.length > 0 ? subtype : null;
}
function readGenerationBasis(bundle) {
  const contract = findFile(bundle, "task-contract.json");
  if (!contract || !contract.payload || typeof contract.payload !== "object") return null;
  const basis = contract.payload.generationBasis;
  if (basis === "standard" || basis === "reference_first" || basis === "continuation") {
    return basis;
  }
  return null;
}
function extractEvidenceBindings(bundle) {
  return {
    runId: readRunId(bundle),
    taskId: readTaskId(bundle),
    promptHash: readPromptHash(bundle),
    imageHash: readImageHash(bundle),
    referenceIds: readReferenceIds(bundle),
    targetScene: readTargetScene(bundle),
    generationBasis: readGenerationBasis(bundle)
  };
}
function validateShortChainEvidenceIntegrity(bundle, context = {}) {
  if (!bundle || typeof bundle !== "object") {
    throw new Error("validateShortChainEvidenceIntegrity: bundle is required");
  }
  if (!Array.isArray(bundle.files)) {
    throw new Error("validateShortChainEvidenceIntegrity: bundle.files must be an array");
  }
  const issues = [];
  const missingRequired = [];
  const requiredFiles = computeRequiredFiles(
    context.expectedGenerationBasis ?? null,
    Boolean(context.expectedValidated)
  );
  for (const name of requiredFiles) {
    const record = findFile(bundle, name);
    if (!record) {
      missingRequired.push(name);
      issues.push(issue(
        "block",
        "EVIDENCE_REQUIRED_FILE_MISSING",
        `Required evidence file "${name}" is missing from the bundle.`,
        name
      ));
      continue;
    }
    if (!record.exists) {
      missingRequired.push(name);
      issues.push(issue(
        "block",
        "EVIDENCE_REQUIRED_FILE_MISSING",
        `Required evidence file "${name}" is absent on disk.`,
        name
      ));
      continue;
    }
    if (record.error) {
      missingRequired.push(name);
      issues.push(issue(
        "block",
        "EVIDENCE_FILE_UNREADABLE",
        `Required evidence file "${name}" is unreadable: ${record.error}`,
        name
      ));
      continue;
    }
    if (record.sizeBytes === 0) {
      const severity = name === "output.png" ? "block" : "warn";
      issues.push(issue(
        severity,
        "EVIDENCE_FILE_SIZE_SUSPICIOUS",
        `Evidence file "${name}" is 0 bytes.`,
        name
      ));
    }
  }
  for (const record of bundle.files) {
    if (requiredFiles.includes(record.name)) continue;
    if (!record.exists) continue;
    if (record.error) {
      issues.push(issue(
        "warn",
        "EVIDENCE_FILE_UNREADABLE",
        `Optional evidence file "${record.name}" is unreadable: ${record.error}`,
        record.name
      ));
    } else if (record.sizeBytes === 0) {
      issues.push(issue(
        "warn",
        "EVIDENCE_FILE_SIZE_SUSPICIOUS",
        `Optional evidence file "${record.name}" is 0 bytes.`,
        record.name
      ));
    }
  }
  const bindings = bundle.bindings ?? extractEvidenceBindings(bundle);
  if (bindings.imageHash) {
    const output = findFile(bundle, "output.png");
    if (output && output.sha256 && output.sha256 !== bindings.imageHash) {
      issues.push(issue(
        "block",
        "EVIDENCE_IMAGE_HASH_MISMATCH",
        `output.png actual sha256 (${output.sha256}) does not match run.json's claim (${bindings.imageHash}).`,
        "output.png"
      ));
    }
  }
  if (context.expectedProjectId && bundle.projectId !== context.expectedProjectId) {
    issues.push(issue(
      "block",
      "EVIDENCE_PROJECT_MISMATCH",
      `projectId mismatch: bundle=${bundle.projectId}, expected=${context.expectedProjectId}.`,
      null
    ));
  }
  if (context.expectedTaskId) {
    if (bindings.taskId && bindings.taskId !== context.expectedTaskId) {
      issues.push(issue(
        "block",
        "EVIDENCE_TASK_MISMATCH",
        `taskId mismatch: task-contract.json says "${bindings.taskId}", expected "${context.expectedTaskId}".`,
        "task-contract.json"
      ));
    }
  }
  if (context.expectedRunId) {
    if (bindings.runId && bindings.runId !== context.expectedRunId) {
      issues.push(issue(
        "block",
        "EVIDENCE_RUN_MISMATCH",
        `runId mismatch: run.json says "${bindings.runId}", expected "${context.expectedRunId}".`,
        "run.json"
      ));
    }
  }
  if (context.expectedPromptHash) {
    if (bindings.promptHash && bindings.promptHash !== context.expectedPromptHash) {
      issues.push(issue(
        "block",
        "EVIDENCE_PROMPT_HASH_MISMATCH",
        `promptHash mismatch: trace.json says "${bindings.promptHash}", expected "${context.expectedPromptHash}".`,
        "trace.json"
      ));
    }
  }
  if (context.expectedReferenceIds) {
    const expected = [...context.expectedReferenceIds].sort();
    const actual = [...bindings.referenceIds].sort();
    if (expected.length !== actual.length || expected.some((id, i) => id !== actual[i])) {
      issues.push(issue(
        "block",
        "EVIDENCE_REFERENCE_ID_MISMATCH",
        `referenceIds mismatch: actual=[${actual.join(",")}], expected=[${expected.join(",")}].`,
        "reference-trace.json"
      ));
    }
  }
  if (context.expectedTargetScene) {
    if (bindings.targetScene && bindings.targetScene !== context.expectedTargetScene) {
      issues.push(issue(
        "block",
        "EVIDENCE_TARGET_SCENE_MISMATCH",
        `targetScene mismatch: task-contract.json says "${bindings.targetScene}", expected "${context.expectedTargetScene}".`,
        "task-contract.json"
      ));
    }
  }
  if (context.expectedGenerationBasis) {
    if (bindings.generationBasis && bindings.generationBasis !== context.expectedGenerationBasis) {
      issues.push(issue(
        "block",
        "EVIDENCE_GENERATION_BASIS_MISMATCH",
        `generationBasis mismatch: task-contract.json says "${bindings.generationBasis}", expected "${context.expectedGenerationBasis}".`,
        "task-contract.json"
      ));
    }
  }
  if (context.expectedValidated) {
    const summary = findFile(bundle, "validations/summary.json");
    const summaryMissing = !summary || !summary.exists || !!summary.error;
    if (summaryMissing) {
      const genericIdx = issues.findIndex(
        (entry) => entry.file === "validations/summary.json" && entry.code === "EVIDENCE_REQUIRED_FILE_MISSING"
      );
      if (genericIdx >= 0) {
        issues.splice(genericIdx, 1);
        const mrIdx = missingRequired.indexOf("validations/summary.json");
        if (mrIdx >= 0) missingRequired.splice(mrIdx, 1);
      }
      let message = "Validated flow expected a validations/summary.json but the bundle has none.";
      if (summary && summary.error) {
        message = `Validated flow expected a validations/summary.json but it is unreadable: ${summary.error}.`;
      }
      issues.push(issue(
        "block",
        "EVIDENCE_VALIDATIONS_SUMMARY_MISSING",
        message,
        "validations/summary.json"
      ));
    }
  }
  if (context.expectedGenerationBasis === "reference_first" || context.expectedGenerationBasis === "continuation") {
    const trace = findFile(bundle, "reference-trace.json");
    const hasAnyRef = bindings.referenceIds.length > 0;
    const traceMissing = !trace || !trace.exists || !!trace.error || !hasAnyRef;
    if (traceMissing) {
      const genericIdx = issues.findIndex(
        (entry) => entry.code === "EVIDENCE_REQUIRED_FILE_MISSING" && entry.file === "reference-trace.json"
      );
      if (genericIdx >= 0) {
        issues.splice(genericIdx, 1);
        const mrIdx = missingRequired.indexOf("reference-trace.json");
        if (mrIdx >= 0) missingRequired.splice(mrIdx, 1);
      }
      let message = `generationBasis is "${context.expectedGenerationBasis}" but reference-trace.json is missing, unreadable, or has no references.`;
      if (trace && trace.error) {
        message = `generationBasis is "${context.expectedGenerationBasis}" but reference-trace.json is unreadable: ${trace.error}.`;
      } else if (!hasAnyRef) {
        message = `generationBasis is "${context.expectedGenerationBasis}" but the bundle reports zero reference IDs.`;
      }
      issues.push(issue(
        "block",
        "EVIDENCE_REFERENCE_TRACE_MISSING",
        message,
        "reference-trace.json"
      ));
    }
  }
  const pass = issues.every((entry) => entry.severity !== "block");
  return {
    schemaVersion: "1.0",
    projectId: bundle.projectId,
    taskId: bundle.taskId,
    version: VNEXT_EVIDENCE_INTEGRITY_GATE_VERSION,
    files: bundle.files.map((record) => ({
      path: record.path,
      exists: record.exists,
      sizeBytes: record.sizeBytes,
      kind: record.kind
    })),
    missingRequired,
    bindings,
    issues,
    pass,
    checkedAt: bundle.capturedAt
  };
}
export {
  VNEXT_EVIDENCE_FILE_NAMES,
  VNEXT_EVIDENCE_INTEGRITY_GATE_VERSION,
  extractEvidenceBindings,
  validateShortChainEvidenceIntegrity
};
