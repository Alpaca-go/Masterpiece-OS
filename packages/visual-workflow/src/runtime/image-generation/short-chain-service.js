import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  compileShortChainGeneration,
  listShortChainTemplateOptions,
  deriveGenerationFlowState,
  assertSpaceGenerationRouteGateA,
  assertProviderPromptGateB,
  resolveSpaceReferences,
  assertSpaceReferenceAvailable,
  resolveContinuationReference,
  runSpaceQualityGate,
  resolveEffectiveMaxReferences,
  createSeedreamShortChainAdapter
} from "../../generation-runtime/core/space-generation-core.js";
import {
  resolveReferenceAssets
} from "../../generation-runtime/reference-engine/reference-asset-resolver.js";
import { atomicWriteJsonWithRetry } from "../runtime/atomic-write.js";
import {
  postCompositeConfirmedLogo
} from "./logo-post-composite.js";
function assertReferenceAssetsResolvable(explicitIds, sourceAssetRefs, projectId) {
  if (!explicitIds || explicitIds.length === 0) return;
  const known = new Set(sourceAssetRefs.map((ref) => ref.assetId));
  const missing = explicitIds.filter((id) => !known.has(id));
  if (missing.length === 0) return;
  const err = new Error(
    `REFERENCE_ASSET_NOT_FOUND: ${missing.length} reference asset(s) not found in project ${projectId}: ${missing.join(", ")}. Re-upload the asset(s) or rebuild the project analysis context.`
  );
  Object.assign(err, {
    code: "REFERENCE_ASSET_NOT_FOUND",
    missingAssetIds: [...missing],
    projectId
  });
  throw err;
}
async function resolveExplicitReferencesOrThrow(explicitIds, projectId, projects) {
  if (!explicitIds || explicitIds.length === 0) return [];
  const [projectPaths, project] = await Promise.all([
    projects.paths(projectId),
    projects.get(projectId)
  ]);
  const { resolved, failures } = await resolveReferenceAssets(
    explicitIds,
    { projectRoot: projectPaths.root, verifySha256: false },
    project.assets
  );
  if (failures.length > 0) {
    const first = failures[0];
    throw Object.assign(
      new Error(`${first.code}: ${first.message}`),
      { code: first.code, referenceAssetId: first.assetId, failures }
    );
  }
  return resolved.map((record) => ({
    assetId: record.assetId,
    role: record.role,
    relativePath: record.relativePath,
    // P3-D3.7B: surface the asset usage so consumers can derive the
    // project-root-relative path with ONE interpretation authority
    // (analysis_source is relative to <projectRoot>/input;
    // generation_reference is already relative to <projectRoot>).
    usage: project.assets.find((asset) => asset.id === record.assetId)?.usage
  }));
}
const SESSION_FILENAME = "creative-session.json";
function aspectSize(aspectRatio) {
  return {
    "1:1": "2048*2048",
    "4:3": "2048*1536",
    "3:4": "1536*2048",
    "16:9": "2560*1440",
    "9:16": "1440*2560"
  }[aspectRatio];
}
function promptBlockIds(prompt, blocks) {
  return blocks.filter((block) => block.title && prompt.includes(`# ${block.title}`)).map((block) => block.id);
}
async function writeJson(filename, value) {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) {
    throw Object.assign(new Error(result.errorMessage ?? `Failed to write ${path.basename(filename)}`), {
      code: "VNEXT_COMPILE_ARTIFACT_WRITE_FAILED"
    });
  }
}
function createShortChainGenerationService(projects, projectContext, getImageGeneration, getValidator, getSimilarityAudit) {
  async function vnextRoot(projectId) {
    return path.join((await projects.paths(projectId)).root, "image-generation-vnext");
  }
  async function readSession(projectId) {
    const root = await vnextRoot(projectId);
    const stored = await fs.readFile(path.join(root, SESSION_FILENAME), "utf8").then((value) => JSON.parse(value)).catch(() => null);
    if (stored?.schemaVersion === "1.0" && stored.projectId === projectId) return stored;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return {
      schemaVersion: "1.0",
      projectId,
      currentTask: null,
      history: [],
      implicitAnchors: {},
      projectPromptAssets: {},
      createdAt: now,
      updatedAt: now
    };
  }
  async function saveSession(session) {
    await writeJson(path.join(await vnextRoot(session.projectId), SESSION_FILENAME), session);
    return session;
  }
  async function readCompilation(projectId, taskId) {
    const directory = path.join(await vnextRoot(projectId), "compilations", path.basename(taskId));
    const [taskContract, compiledPrompt, payload] = await Promise.all([
      fs.readFile(path.join(directory, "task-contract.json"), "utf8").then(JSON.parse),
      fs.readFile(path.join(directory, "compiled-prompt.json"), "utf8").then(JSON.parse),
      fs.readFile(path.join(directory, "model-payload.json"), "utf8").then(JSON.parse)
    ]);
    if (taskContract.projectId !== projectId || taskContract.taskId !== taskId) {
      throw Object.assign(new Error("Short-Chain compilation does not belong to this project/task"), {
        code: "VNEXT_COMPILE_ARTIFACT_INVALID"
      });
    }
    return { taskContract, compiledPrompt, payload, artifactDirectory: directory };
  }
  async function compile(input) {
    const context = await projectContext.getShortChain(input.projectId).catch(() => projectContext.rebuildShortChain(input.projectId));
    const packetLogoAssetIds = context.visualDecisionPacket?.lockedAssets.filter((item) => item.type === "logo").map((item) => item.assetId) ?? [];
    const logoAssetIds = packetLogoAssetIds.length ? packetLogoAssetIds : context.promptSourceObject?.lockedAssets.logoAssetIds.length ? context.promptSourceObject.lockedAssets.logoAssetIds : context.lockedAssets.logoAssetIds;
    const preferredLogoAssetId = packetLogoAssetIds[0] || context.promptSourceObject?.lockedAssets.preferredLogoAssetId || logoAssetIds[0] || null;
    const logoUsageMode = input.task.logoUsageMode || (preferredLogoAssetId ? "post_composite" : "blank_area");
    if (preferredLogoAssetId && logoUsageMode !== "post_composite") {
      throw Object.assign(
        new Error("LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED: confirmed Logo must use post-composite mode."),
        { code: "LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED" }
      );
    }
    if (logoUsageMode === "post_composite" && !preferredLogoAssetId) {
      throw Object.assign(
        new Error(`${logoUsageMode} Logo mode requires a confirmed Logo asset`),
        { code: "VNEXT_LOGO_REFERENCE_MISSING" }
      );
    }
    const logoAssetIdSet = new Set(logoAssetIds);
    const requestedReferenceIds = input.task.referenceAssetIds ?? [];
    const referenceAssetIds = logoUsageMode === "reference" ? [.../* @__PURE__ */ new Set([preferredLogoAssetId, ...requestedReferenceIds])] : requestedReferenceIds.filter((assetId) => !logoAssetIdSet.has(assetId));
    const paths = await projects.paths(input.projectId);
    const approvedCreativeDecision = await fs.readFile(
      path.join(paths.root, "outputs", "creative_decision.json"),
      "utf8"
    ).then((value) => JSON.parse(value)).catch(() => void 0);
    const userConfirmedVisualDecision = await fs.readFile(
      path.join(paths.root, "project-context", "user-confirmed-visual-decision.json"),
      "utf8"
    ).then((value) => JSON.parse(value)).catch(() => void 0);
    const projectPromptAsset = await fs.readFile(
      path.join(
        paths.root,
        "image-generation-vnext",
        "prompt-assets",
        `${input.task.deliverableFamily}.json`
      ),
      "utf8"
    ).then((value) => JSON.parse(value)).catch(() => void 0);
    const result = compileShortChainGeneration({
      projectContext: context,
      model: input.model,
      projectPromptAsset,
      approvedCreativeDecision,
      userConfirmedVisualDecision,
      task: {
        ...input.task,
        projectId: input.projectId,
        logoUsageMode,
        referenceAssetIds
      }
    });
    const artifactDirectory = path.join(
      paths.root,
      "image-generation-vnext",
      "compilations",
      result.taskContract.taskId
    );
    await fs.mkdir(artifactDirectory, { recursive: true });
    const spaceGenerationTrace = result.compiledPrompt.trace.spaceGeneration;
    const targetSceneProjection = spaceGenerationTrace?.targetSceneAuthority ?? null;
    const basePromptSourceMap = result.compiledPrompt.sourceMap ?? {};
    const promptSourceMap = targetSceneProjection ? {
      ...basePromptSourceMap,
      operationConstraintsSource: targetSceneProjection.operationConstraintsSource,
      brandManifestationSource: targetSceneProjection.brandManifestationSource,
      architecture_function_bridge: {
        fields: basePromptSourceMap.architecture_function_bridge ?? [],
        operationConstraintsSource: targetSceneProjection.operationConstraintsSource,
        targetScene: targetSceneProjection.targetScene
      },
      brand_role_manifestation: {
        source: targetSceneProjection.brandManifestationSource,
        targetScene: targetSceneProjection.targetScene,
        preservedMechanisms: targetSceneProjection.preservedMechanisms ?? [],
        replacedSceneObjects: targetSceneProjection.replacedSceneObjects ?? []
      }
    } : basePromptSourceMap;
    await Promise.all([
      writeJson(path.join(artifactDirectory, "task-contract.json"), result.taskContract),
      writeJson(path.join(artifactDirectory, "compiled-prompt.json"), result.compiledPrompt),
      writeJson(path.join(artifactDirectory, "model-payload.json"), result.payload),
      writeJson(path.join(artifactDirectory, "provider-payload-preview.json"), result.payload),
      writeJson(path.join(artifactDirectory, "prompt-source-map.json"), promptSourceMap),
      ...targetSceneProjection ? [
        writeJson(path.join(artifactDirectory, "target-scene-projection.json"), targetSceneProjection)
      ] : [],
      ...result.compiledPrompt.effectiveVisualDecisionPacket ? [
        writeJson(
          path.join(artifactDirectory, "effective-visual-decision-packet.json"),
          result.compiledPrompt.effectiveVisualDecisionPacket
        )
      ] : [],
      writeJson(path.join(artifactDirectory, "trace.json"), {
        projectId: input.projectId,
        taskId: result.taskContract.taskId,
        contextVersion: result.compiledPrompt.projectContextVersion,
        contextFingerprint: context.provenance.sourceFingerprint,
        route: result.compiledPrompt.route,
        trace: result.compiledPrompt.trace,
        spaceGeneration: result.compiledPrompt.trace.spaceGeneration,
        compiledAt: result.compiledPrompt.compiledAt
      }),
      ...logoUsageMode === "post_composite" ? [
        writeJson(path.join(artifactDirectory, "logo-post-composite-plan.json"), {
          schemaVersion: "1.0",
          projectId: input.projectId,
          taskId: result.taskContract.taskId,
          logoAssetId: preferredLogoAssetId,
          status: "awaiting_generation_and_placement",
          source: packetLogoAssetIds.includes(preferredLogoAssetId || "") ? "visual_decision_packet.lockedAssets" : "project_context.lockedAssets",
          createdAt: result.compiledPrompt.compiledAt
        })
      ] : [],
      fs.writeFile(
        path.join(artifactDirectory, "compiled-prompt.md"),
        `${result.compiledPrompt.editablePrompt}
`,
        "utf8"
      )
    ]);
    console.info(JSON.stringify({
      event: "VNEXT_IMAGE_PROMPT_COMPILED",
      projectId: input.projectId,
      taskId: result.taskContract.taskId,
      deliverableFamily: result.taskContract.deliverableFamily,
      subtype: result.taskContract.subtype,
      shot: result.taskContract.shot,
      contextVersion: result.compiledPrompt.projectContextVersion,
      templateIds: Object.keys(result.compiledPrompt.route.templateVersions),
      adapterId: result.compiledPrompt.trace.adapterId,
      promptCharacters: result.compiledPrompt.trace.promptCharacters,
      compileDurationMs: result.compiledPrompt.trace.compileDurationMs
    }));
    const session = await readSession(input.projectId);
    await saveSession({
      ...session,
      currentTask: result.taskContract,
      history: [...session.history, {
        id: crypto.randomUUID(),
        type: "compiled",
        taskId: result.taskContract.taskId,
        deliverableFamily: result.taskContract.deliverableFamily,
        subtype: result.taskContract.subtype,
        shot: result.taskContract.shot,
        promptFingerprint: result.compiledPrompt.trace.sourceFingerprint,
        createdAt: result.compiledPrompt.compiledAt
      }],
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return {
      taskContract: result.taskContract,
      compiledPrompt: result.compiledPrompt,
      payload: result.payload,
      artifactDirectory
    };
  }
  async function start(input) {
    let compilation = await readCompilation(input.projectId, input.taskId);
    const currentContext = await projectContext.getShortChain(input.projectId);
    let preflight = compilation.compiledPrompt.preflightReport;
    const cachedTraceFile = JSON.parse(
      await fs.readFile(path.join(compilation.artifactDirectory, "trace.json"), "utf8")
    );
    const preflightBlocked = preflight?.status !== "pass";
    const contextFingerprintStale = cachedTraceFile.contextFingerprint !== currentContext.provenance.sourceFingerprint;
    if (preflightBlocked || contextFingerprintStale) {
      try {
        const task = compilation.taskContract;
        const apiProfileId = (await projects.get(input.projectId)).apiProfileId;
        const recompiled = await compile({
          projectId: input.projectId,
          task: {
            taskId: task.taskId,
            deliverableFamily: task.deliverableFamily,
            subtype: task.subtype,
            shot: task.shot,
            count: task.count,
            aspectRatio: task.aspectRatio,
            currentInstruction: task.currentInstruction,
            generationBasis: task.generationBasis,
            mustInclude: [...task.mustInclude],
            mustAvoid: [...task.mustAvoid],
            referenceAssetIds: [...task.referenceAssetIds],
            logoUsageMode: task.logoUsageMode
          },
          ...apiProfileId ? { apiProfileId } : {}
        });
        const recompiledTraceFile = JSON.parse(
          await fs.readFile(path.join(recompiled.artifactDirectory, "trace.json"), "utf8")
        );
        if (recompiledTraceFile.contextFingerprint === currentContext.provenance.sourceFingerprint) {
          compilation = recompiled;
          preflight = recompiled.compiledPrompt.preflightReport;
        }
      } catch (recompileError) {
        preflight = compilation.compiledPrompt.preflightReport;
      }
    }
    if (preflight?.status !== "pass") {
      throw Object.assign(new Error(
        `PROMPT_PREFLIGHT_BLOCKED: ${(preflight?.findings || []).map((item) => item.code).filter(Boolean).join(", ")}`
      ), {
        code: preflight?.findings?.[0]?.code || "PROMPT_PREFLIGHT_BLOCKED",
        findings: preflight?.findings || []
      });
    }
    if (compilation.taskContract.count !== 1) {
      throw Object.assign(new Error("Short-Chain formal-first generation starts with exactly one image"), {
        code: "VNEXT_FORMAL_FIRST_COUNT_INVALID"
      });
    }
    const lockedLogoAssetIds = /* @__PURE__ */ new Set([
      ...currentContext.visualDecisionPacket?.lockedAssets.filter((item) => item.type === "logo").map((item) => item.assetId) ?? [],
      ...currentContext.promptSourceObject?.lockedAssets.logoAssetIds ?? [],
      ...currentContext.lockedAssets.logoAssetIds
    ]);
    const traceFile = JSON.parse(
      await fs.readFile(path.join(compilation.artifactDirectory, "trace.json"), "utf8")
    );
    if (traceFile.contextFingerprint !== currentContext.provenance.sourceFingerprint) {
      throw Object.assign(new Error("Project context changed after compilation; compile the task again"), {
        code: "VNEXT_COMPILE_INPUT_STALE"
      });
    }
    const session = await readSession(input.projectId);
    const implicitAnchor = session.implicitAnchors[compilation.taskContract.deliverableFamily];
    const explicitIds = compilation.taskContract.referenceAssetIds;
    const generationBasis = compilation.taskContract.generationBasis ?? (explicitIds.length ? "reference_first" : "standard");
    const isSpace = compilation.taskContract.deliverableFamily === "space";
    const spaceCompilation = compilation.compiledPrompt.phase9b;
    const isProductionSpaceCompilation = isSpace && Boolean(spaceCompilation?.compilerId);
    let references;
    let referenceTrace = null;
    let spaceQualityGate = null;
    let actualPrompt = compilation.compiledPrompt.finalPrompt;
    let isEditedPrompt = false;
    if (isProductionSpaceCompilation) {
      let resolved;
      if (generationBasis === "continuation") {
        const continuationAssetId = explicitIds[0];
        const confirmed = continuationAssetId ? session.confirmedGeneratedOutputs?.[continuationAssetId] : null;
        const sourceRun = confirmed ? await getImageGeneration().getRun(confirmed.sourceRunId) : null;
        const sourceImage = continuationAssetId ? sourceRun?.images?.find((img) => img.imageId === continuationAssetId.split("-").pop()) ?? sourceRun?.images?.[0] : null;
        if (!continuationAssetId || !confirmed || confirmed.confirmationState !== "confirmed" || confirmed.projectId !== input.projectId || !sourceRun || !sourceImage) {
          throw Object.assign(
            new Error("SPACE_CONTINUATION_REFERENCE_REQUIRED: Continuation requires the original confirmed generated output."),
            { code: "SPACE_CONTINUATION_REFERENCE_REQUIRED" }
          );
        }
        resolved = resolveContinuationReference({
          confirmed,
          projectRelativePath: `image-generation/${sourceRun.runId}/${sourceImage.relativePath}`,
          targetScene: compilation.taskContract.continuation?.targetScene,
          viewStrategy: compilation.taskContract.continuation?.targetFunctionalProgram?.viewStrategy
        });
      } else {
        const explicitAssets = await resolveExplicitReferencesOrThrow(
          explicitIds,
          input.projectId,
          projects
        );
        const architectureAnchorImages = (spaceCompilation?.referenceImages ?? []).filter((img) => img.imagePath).map((img) => ({ anchorId: img.anchorId, imagePath: img.imagePath }));
        const adapter = createSeedreamShortChainAdapter({ model: compilation.payload.model });
        const effectiveMax = resolveEffectiveMaxReferences({
          generationBasis,
          adapterCapability: adapter.capability
        }).effectiveMax;
        resolved = resolveSpaceReferences({
          generationBasis,
          explicitAssets,
          implicitAnchor: implicitAnchor ? { imageId: implicitAnchor.imageId, projectRelativePath: implicitAnchor.projectRelativePath } : null,
          architectureAnchorImages,
          maxReferences: effectiveMax
        });
      }
      references = resolved.references.map((ref) => ({
        id: ref.id,
        role: ref.role,
        projectRelativePath: ref.projectRelativePath,
        source: ref.source
      }));
      referenceTrace = resolved.trace;
      assertSpaceReferenceAvailable(references, { generationBasis });
      const spaceCompilerBlocks = compilation.compiledPrompt.blocks ?? [];
      const blocksById = Object.fromEntries(
        spaceCompilerBlocks.map((b) => [b.id, b])
      );
      const blockIds = spaceCompilerBlocks.map((b) => b.id);
      const resolvedQualityGate = runSpaceQualityGate({
        finalPrompt: compilation.compiledPrompt.finalPrompt,
        blockIds,
        blocksById,
        referenceCount: references.length,
        hasExplicitReferenceBypass: generationBasis === "standard"
      });
      if (resolvedQualityGate.status !== "pass") {
        const blocked = resolvedQualityGate.findings.filter((f) => f.severity === "block");
        if (blocked.length) {
          throw Object.assign(new Error(
            `SPACE_QUALITY_GATE_BLOCKED: ${blocked.map((f) => f.code).join(", ")}`
          ), {
            code: blocked[0]?.code || "SPACE_QUALITY_GATE_BLOCKED",
            findings: resolvedQualityGate.findings
          });
        }
      }
      spaceQualityGate = resolvedQualityGate;
      const compiledPrompt = compilation.compiledPrompt.finalPrompt;
      const editedPromptRaw = input.editedPrompt?.trim();
      actualPrompt = editedPromptRaw || compiledPrompt;
      isEditedPrompt = Boolean(editedPromptRaw);
      const compiledBlocks = compilation.compiledPrompt.blocks ?? [];
      const compileSpaceTrace = compilation.compiledPrompt.trace.spaceGeneration ?? {};
      const spatialSemanticReport = compileSpaceTrace.spatialSemanticReport ?? {
        status: "block",
        findings: [{ code: "SPACE_SPATIAL_SEMANTIC_REPORT_MISSING" }]
      };
      const gateA = assertSpaceGenerationRouteGateA({
        taskContract: compilation.taskContract,
        compilerMode: compileSpaceTrace.canonicalCompilerMode ?? "r8_6_golden",
        trace: {
          spaceGeneration: {
            ...compileSpaceTrace,
            promptCharacters: Number(compileSpaceTrace.promptCharacters) || [...compiledPrompt].length
          }
        },
        blockIds: promptBlockIds(compiledPrompt, compiledBlocks),
        providerReferenceCount: references.length,
        referenceMode: generationBasis === "reference_first" || generationBasis === "continuation" ? "reference_assisted" : "text_only",
        referenceSources: references.map((reference) => reference.source),
        spatialSemanticReport,
        requestedAspectRatio: compilation.taskContract.aspectRatio,
        providerAspectRatio: compilation.payload.aspectRatio,
        providerSize: aspectSize(compilation.taskContract.aspectRatio)
      });
      if (!gateA) {
        throw Object.assign(new Error("Space compile integrity gate A was not applied."), {
          code: "SPACE_COMPILER_ROUTE_MISMATCH"
        });
      }
      const gateBAdapter = createSeedreamShortChainAdapter({ model: compilation.payload.model });
      const gateB = assertProviderPromptGateB({
        actualPrompt,
        compiledPrompt,
        providerCapability: gateBAdapter.capability,
        generationBasis,
        targetScene: compilation.taskContract.subtype,
        targetSceneLabel: compilation.taskContract.subtype,
        isEdited: isEditedPrompt
      });
      const runSpaceTrace = {
        ...compileSpaceTrace,
        generationBasis,
        referenceMode: generationBasis === "reference_first" || generationBasis === "continuation" ? "reference_assisted" : "text_only",
        referenceIds: references.map((reference) => reference.id),
        referenceSources: references.map((reference) => reference.source),
        routeIntegrity: gateA.routeIntegrity,
        spatialSemanticReport,
        // Phase D: separate run-time gate trace. Gate A is the compile
        // time check, Gate B is the actual-prompt check.
        providerPromptGate: gateB,
        isEditedPrompt
      };
      await Promise.all([
        writeJson(path.join(compilation.artifactDirectory, "reference-trace.json"), {
          schemaVersion: "1.0",
          referenceMode: generationBasis === "reference_first" || generationBasis === "continuation" ? "reference_assisted" : "text_only",
          providerReferenceCount: references.length,
          references: references.map((reference) => ({
            id: reference.id,
            source: reference.source
          }))
        }),
        writeJson(path.join(compilation.artifactDirectory, "provider-payload.redacted.json"), {
          model: compilation.payload.model,
          prompt: actualPrompt,
          size: aspectSize(compilation.taskContract.aspectRatio),
          aspectRatio: compilation.taskContract.aspectRatio,
          references: references.map((reference) => ({ id: reference.id, source: reference.source })),
          // r2.0 §4.13: record which gate passed and whether the prompt
          // was edited. The redacte d payload is the audit trail; the
          // gate result is sufficient to know it was checked.
          gates: {
            compileIntegrity: { status: gateA.routeIntegrity.status, version: gateA.routeIntegrity.version },
            providerPrompt: { status: "pass", version: gateB.version, isEdited: isEditedPrompt }
          }
        }),
        // The compile trace.json is FROZEN at compile time. The
        // run-time spaceGeneration goes into a separate file. This
        // matches §9 (回滚): "纠偏是运行时叠加", and keeps the
        // compile artifact directory as the immutable "facts of
        // that compile".
        writeJson(path.join(compilation.artifactDirectory, "trace.json"), {
          projectId: input.projectId,
          taskId: compilation.taskContract.taskId,
          contextFingerprint: currentContext.provenance.sourceFingerprint,
          route: compilation.compiledPrompt.route,
          trace: compilation.compiledPrompt.trace,
          spaceGeneration: compileSpaceTrace,
          compiledAt: compilation.compiledPrompt.compiledAt
        }),
        // r2.0 §4.13: run-level trace lives next to run.json, NOT in
        // the compile artifact directory. A correction retry appends
        // a new run-trace file rather than mutating the original.
        writeJson(path.join(compilation.artifactDirectory, "run-trace.json"), {
          schemaVersion: "1.0",
          runSpaceTrace,
          gateA: {
            status: gateA.routeIntegrity.status,
            version: gateA.routeIntegrity.version
          },
          gateB: {
            status: "pass",
            version: gateB.version,
            isEdited: isEditedPrompt,
            characterCount: gateB.characterCount,
            checks: gateB.checks
          }
        })
      ]);
    } else {
      const explicitResolved = await resolveExplicitReferencesOrThrow(
        explicitIds,
        input.projectId,
        projects
      );
      const explicitReferences = explicitResolved.flatMap((asset) => {
        const id = asset.assetId;
        const projectRelativePath = asset.usage === "generation_reference" ? asset.relativePath : `input/${asset.relativePath}`;
        return [{
          id,
          role: lockedLogoAssetIds.has(id) || asset.role === "logo" ? "identity_reference" : asset.role === "package_structure" ? "structure_reference" : "core_reference",
          projectRelativePath
        }];
      });
      references = [
        ...explicitReferences,
        ...implicitAnchor ? [{
          id: implicitAnchor.imageId,
          role: "core_reference",
          projectRelativePath: implicitAnchor.projectRelativePath
        }] : []
      ].slice(0, 2);
    }
    const run = await getImageGeneration().startCompiledCreativeTask({
      projectId: input.projectId,
      compiledPrompt: actualPrompt,
      promptVersion: compilation.compiledPrompt.trace.sourceFingerprint,
      snapshot: {
        schemaVersion: "vnext-1.0",
        projectContextVersion: compilation.compiledPrompt.projectContextVersion,
        taskContract: compilation.taskContract,
        route: compilation.compiledPrompt.route,
        trace: compilation.compiledPrompt.trace,
        implicitAnchor,
        ...referenceTrace ? { referenceTrace } : {},
        ...spaceQualityGate ? { spaceQualityGate } : {}
      },
      sourceMap: {
        pipelineMode: "vnext",
        taskId: compilation.taskContract.taskId,
        contextFingerprint: currentContext.provenance.sourceFingerprint,
        templateVersions: compilation.compiledPrompt.route.templateVersions,
        implicitAnchorRunId: implicitAnchor?.runId
      },
      references,
      event: "VNEXT_FORMAL_RESULT_STARTED",
      apiProfileId: input.apiProfileId,
      // A selected API Profile owns the provider's deployable endpoint model.
      // The adapter id is a compilation contract and may not be callable.
      modelId: input.apiProfileId ? void 0 : compilation.payload.model,
      size: aspectSize(compilation.taskContract.aspectRatio),
      dryRun: input.dryRun
    });
    if (isProductionSpaceCompilation) {
      await writeJson(path.join(compilation.artifactDirectory, "run.json"), run);
      const generatedRoot = await getImageGeneration().runRoot(run.runId);
      const firstImage = run.images[0];
      if (run.status === "succeeded" && generatedRoot && firstImage) {
        await fs.copyFile(
          path.join(generatedRoot, firstImage.relativePath),
          path.join(compilation.artifactDirectory, "output.png")
        );
      }
    }
    await saveSession({
      ...session,
      currentTask: compilation.taskContract,
      history: [...session.history, {
        id: crypto.randomUUID(),
        type: "generated",
        taskId: compilation.taskContract.taskId,
        deliverableFamily: compilation.taskContract.deliverableFamily,
        subtype: compilation.taskContract.subtype,
        shot: compilation.taskContract.shot,
        promptFingerprint: compilation.compiledPrompt.trace.sourceFingerprint,
        runId: run.runId,
        imageId: run.images[0]?.imageId,
        createdAt: run.createdAt,
        // R11.2.2 §33-§36: record the generation mode and the continuation
        // lineage so the UI can show "参考优先 / 空间延展" badges and
        // "Reception → Consultation" on outputs.
        generationBasis: compilation.taskContract.generationBasis,
        ...compilation.taskContract.generationBasis === "continuation" && compilation.taskContract.continuation ? {
          continuationLineage: {
            sourceScene: compilation.taskContract.continuation.sourceScene,
            targetScene: compilation.taskContract.continuation.targetScene,
            sourceRunId: compilation.taskContract.continuation.sourceRunId
          }
        } : {}
      }],
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return run;
  }
  async function confirmDirection(projectId, runId, imageId) {
    const run = await getImageGeneration().getRun(runId);
    if (!run || run.projectId !== projectId || run.status !== "succeeded") {
      throw Object.assign(new Error("Only a succeeded result can become an implicit anchor"), {
        code: "VNEXT_ANCHOR_RESULT_INVALID"
      });
    }
    const image = run.images.find((candidate) => candidate.imageId === imageId);
    if (!image) throw new Error("Generated image does not exist");
    const session = await readSession(projectId);
    const generated = [...session.history].reverse().find((entry) => entry.type === "generated" && entry.runId === runId);
    if (!generated) throw new Error("Short-Chain generation history entry does not exist");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return saveSession({
      ...session,
      implicitAnchors: {
        ...session.implicitAnchors,
        [generated.deliverableFamily]: {
          deliverableFamily: generated.deliverableFamily,
          runId,
          imageId,
          projectRelativePath: `image-generation/${runId}/${image.relativePath}`,
          promptFingerprint: generated.promptFingerprint,
          confirmedAt: now
        }
      },
      history: [...session.history, {
        ...generated,
        id: crypto.randomUUID(),
        type: "direction_confirmed",
        imageId,
        createdAt: now
      }],
      updatedAt: now
    });
  }
  async function confirmGeneratedOutput(projectId, runId, imageId) {
    const run = await getImageGeneration().getRun(runId);
    if (!run || run.projectId !== projectId || run.status !== "succeeded") {
      throw Object.assign(new Error("Only a succeeded result can be confirmed for continuation"), {
        code: "SPACE_CONTINUATION_SOURCE_INVALID"
      });
    }
    const session = await readSession(projectId);
    const generatedEntry = [...session.history].reverse().find((entry2) => entry2.type === "generated" && entry2.runId === runId);
    const isSpaceRun = generatedEntry?.deliverableFamily === "space";
    if (!isSpaceRun) {
      throw Object.assign(new Error("Continuation source must be a space generated output"), {
        code: "SPACE_CONTINUATION_SOURCE_INVALID"
      });
    }
    const image = run.images.find((candidate) => candidate.imageId === imageId);
    if (!image) throw new Error("Generated image does not exist");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const assetId = `asset-${runId}-${imageId}`;
    const existing = session.confirmedGeneratedOutputs?.[assetId];
    const entry = {
      assetId,
      projectId,
      // R11.2.1 asset identity: generated space output, continuation source.
      assetOrigin: "generated_output",
      deliverableFamily: "space",
      generationRole: "continuation_source",
      sourceRunId: runId,
      sourceTaskId: run.taskId,
      sourceScene: generatedEntry?.subtype || "space",
      confirmationState: "confirmed",
      confirmedAt: existing?.confirmedAt ?? now,
      confirmationSource: "user_explicit",
      imageSha256: image.sha256,
      compilerId: "phase9b-quality-compiler",
      baselineId: "r10.4.1-post-repair"
    };
    await saveSession({
      ...session,
      confirmedGeneratedOutputs: {
        ...session.confirmedGeneratedOutputs ?? {},
        [assetId]: entry
      },
      history: [...session.history, {
        id: crypto.randomUUID(),
        type: "direction_confirmed",
        taskId: run.taskId,
        deliverableFamily: "space",
        subtype: run.deliverable ?? "space",
        shot: "entrance_view",
        promptFingerprint: assetId,
        runId,
        imageId,
        createdAt: now
      }],
      updatedAt: now
    });
    return entry;
  }
  async function revokeGeneratedOutput(projectId, assetId) {
    const session = await readSession(projectId);
    const existing = session.confirmedGeneratedOutputs?.[assetId];
    if (!existing || existing.projectId !== projectId) {
      throw Object.assign(new Error("Confirmed continuation source does not exist"), {
        code: "SPACE_CONTINUATION_SOURCE_INVALID"
      });
    }
    const revoked = { ...existing, confirmationState: "revoked" };
    await saveSession({
      ...session,
      confirmedGeneratedOutputs: {
        ...session.confirmedGeneratedOutputs ?? {},
        [assetId]: revoked
      },
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return revoked;
  }
  async function getConfirmedGeneratedOutputs(projectId) {
    const session = await readSession(projectId);
    return session.confirmedGeneratedOutputs ?? {};
  }
  async function runSimilarityAuditIfTriggered(result, compilation) {
    const auditService = getSimilarityAudit?.();
    if (!auditService) return null;
    const taskContract = compilation.taskContract;
    if (taskContract.generationBasis !== "reference_first") return null;
    const relation = taskContract.referenceSceneRelation ?? "unknown";
    if (relation !== "cross_scene") return null;
    if (!result.firstImage) return null;
    const references = (taskContract.referenceAssetIds ?? []).filter((id) => Boolean(id)).map((assetId) => ({ assetId, projectRelativePath: `assets/${assetId}` }));
    if (references.length === 0) return null;
    try {
      return await auditService.audit({
        projectId: result.initialRun.projectId,
        runId: result.initialRun.runId,
        // imageId intentionally omitted; the audit service reads
        // run.images[0] itself (Phase E invariant).
        references,
        targetScene: {
          family: taskContract.deliverableFamily,
          subtype: taskContract.subtype,
          ...taskContract.shot ? { shot: taskContract.shot } : {},
          mustInclude: taskContract.mustInclude,
          mustAvoid: taskContract.mustAvoid
        },
        referenceSceneRelation: relation
      });
    } catch (error) {
      console.warn(JSON.stringify({
        event: "VNEXT_SIMILARITY_AUDIT_UNAVAILABLE",
        projectId: result.initialRun.projectId,
        runId: result.initialRun.runId,
        taskId: taskContract.taskId,
        error: error instanceof Error ? error.message : String(error),
        errorCode: error?.code
      }));
      return "unavailable";
    }
  }
  async function startValidated(input) {
    const validator = getValidator?.();
    if (!validator) throw new Error("Short-Chain deliverable validator is not configured");
    const compilation = await readCompilation(input.projectId, input.taskId);
    const initial = await start(input);
    if (initial.status !== "succeeded" || !initial.images[0]) {
      throw Object.assign(new Error(initial.errorMessage || "Initial image generation failed"), {
        code: initial.errorCode || "VNEXT_INITIAL_GENERATION_FAILED"
      });
    }
    const first = initial.images[0];
    const firstImage = {
      runId: initial.runId,
      imageId: first.imageId,
      relativePath: first.relativePath,
      mimeType: first.mimeType,
      sha256: first.sha256,
      sizeBytes: first.sizeBytes
    };
    let initialValidation;
    try {
      initialValidation = await validator.validate({
        projectId: input.projectId,
        taskContract: compilation.taskContract,
        runId: initial.runId,
        validatorProfileId: input.validatorProfileId
      });
    } catch {
      // Validator failure must not discard a successfully generated paid image.
      initialValidation = {
        status: "unverified", runId: initial.runId, imageId: first.imageId,
        retryRecommended: false, humanReviewRequired: true,
        errorCode: "DELIVERABLE_VALIDATION_UNAVAILABLE"
      };
    }
    const result = {
      initialRun: initial,
      initialValidation,
      terminalStatus: initialValidation.status,
      automaticRetryCount: 0,
      flowState: deriveGenerationFlowState({ initialRun: initial, initialValidation }),
      firstImage,
      selectedImage: firstImage,
      attempts: [{ role: "initial", run: initial, validation: initialValidation }],
      correctionPolicy: {
        automaticRegeneration: "disabled",
        nextAction: "human_review",
        operation: "text_to_image_regeneration",
        imageEditingSupported: false,
        sourceImageAttached: false,
        contentPreservationGuaranteed: false,
        message: "No second image was requested. Text-only regeneration cannot guarantee preservation of the original scene."
      },
      logoIntegrity: compilation.taskContract.logoUsageMode === "post_composite" ? "pending_post_composite" : "requires_identity_review",
      qualityAcceptance: "pending_human_review",
      similarityAudit: null
    };
    const audit = await runSimilarityAuditIfTriggered(result, compilation);
    const finalResult = {
      ...result,
      similarityAudit: audit
    };
    await writeJson(
      path.join(await vnextRoot(input.projectId), "validations", `${initial.runId}.summary.json`),
      finalResult
    );
    await writeJson(
      path.join(await vnextRoot(input.projectId), "validations", `${input.taskId}.summary.json`),
      finalResult
    );
    return finalResult;
  }
  async function continueSameType(projectId, currentInstruction, apiProfileId, dryRun) {
    const session = await readSession(projectId);
    if (!session.currentTask) throw new Error("No current Short-Chain task to continue");
    const {
      schemaVersion: _schemaVersion,
      taskId: _taskId,
      projectId: _taskProjectId,
      createdAt: _createdAt,
      ...task
    } = session.currentTask;
    const compiled = await compile({
      projectId,
      task: {
        ...task,
        currentInstruction,
        count: 1
      }
    });
    return start({ projectId, taskId: compiled.taskContract.taskId, apiProfileId, dryRun });
  }
  async function saveProjectPromptAsset(input) {
    const session = await readSession(input.projectId);
    const previous = await fs.readFile(
      path.join(await vnextRoot(input.projectId), "prompt-assets", `${input.deliverableFamily}.json`),
      "utf8"
    ).then((value) => JSON.parse(value)).catch(() => null);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const asset = {
      schemaVersion: "1.0",
      id: previous?.id ?? `project-prompt-${crypto.randomUUID()}`,
      projectId: input.projectId,
      deliverableFamily: input.deliverableFamily,
      name: input.name.trim() || `${input.deliverableFamily} project prompt`,
      version: (previous?.version ?? 0) + 1,
      promptFragments: [...new Set(input.promptFragments.map((item) => item.trim()).filter(Boolean))],
      negativeConstraints: [...new Set((input.negativeConstraints ?? []).map((item) => item.trim()).filter(Boolean))],
      source: "user_saved",
      createdAt: previous?.createdAt ?? now,
      updatedAt: now
    };
    if (!asset.promptFragments.length) throw new Error("Project prompt asset cannot be empty");
    await writeJson(
      path.join(await vnextRoot(input.projectId), "prompt-assets", `${input.deliverableFamily}.json`),
      asset
    );
    const task = session.currentTask;
    return saveSession({
      ...session,
      projectPromptAssets: {
        ...session.projectPromptAssets,
        [input.deliverableFamily]: asset.id
      },
      history: task ? [...session.history, {
        id: crypto.randomUUID(),
        type: "prompt_asset_saved",
        taskId: task.taskId,
        deliverableFamily: input.deliverableFamily,
        subtype: task.subtype,
        shot: task.shot,
        promptFingerprint: asset.id,
        createdAt: now
      }] : session.history,
      updatedAt: now
    }).then(() => asset);
  }
  async function postCompositeLogo(input) {
    if (input.confirmedByUser !== true) {
      throw Object.assign(new Error("Logo post-composite requires explicit user confirmation"), {
        code: "LOGO_POST_COMPOSITE_CONFIRMATION_REQUIRED"
      });
    }
    const [run, project, paths] = await Promise.all([
      getImageGeneration().getRun(input.runId),
      projects.get(input.projectId),
      projects.paths(input.projectId)
    ]);
    if (!run || run.projectId !== input.projectId || run.status !== "succeeded") {
      throw Object.assign(new Error("Logo post-composite requires a succeeded project run"), {
        code: "LOGO_POST_COMPOSITE_RUN_INVALID"
      });
    }
    const image = run.images.find((item) => item.imageId === input.imageId);
    if (!image) {
      throw Object.assign(new Error("Generated image does not exist in the selected run"), {
        code: "LOGO_POST_COMPOSITE_IMAGE_MISSING"
      });
    }
    const logoAsset = project.assets.find((item) => item.id === input.logoAssetId);
    if (!logoAsset || logoAsset.status !== "ready") {
      throw Object.assign(new Error("Confirmed Logo asset does not exist in the project"), {
        code: "LOGO_POST_COMPOSITE_ASSET_MISSING"
      });
    }
    const runRoot = await getImageGeneration().runRoot(input.runId);
    if (!runRoot) throw new Error("Image generation run root is unavailable");
    const snapshot = await fs.readFile(
      path.join(runRoot, "source-context-snapshot.json"),
      "utf8"
    ).then((value) => JSON.parse(value)).catch(() => null);
    if (snapshot?.taskContract?.logoUsageMode !== "post_composite") {
      throw Object.assign(new Error("Selected run was not generated with a blank post-composite identity area"), {
        code: "LOGO_POST_COMPOSITE_MODE_REQUIRED"
      });
    }
    const scenePath = path.resolve(runRoot, image.relativePath);
    const logoPath = path.resolve(paths.input, logoAsset.relativePath);
    const outputPath = path.join(runRoot, "images", `${path.parse(image.relativePath).name}.post-composite.png`);
    const composite = await postCompositeConfirmedLogo({
      scenePath,
      logoPath,
      outputPath,
      sourceCrop: input.sourceCrop,
      placement: input.placement,
      removeBackground: input.removeBackground
    });
    const audit = {
      schemaVersion: "1.0",
      status: "completed",
      validationStage: "post_composite",
      logoIntegrity: "source_recorded_pending_visual_review",
      qualityAcceptance: "pending_human_review",
      projectId: input.projectId,
      runId: input.runId,
      sourceImageId: input.imageId,
      sourceImagePath: scenePath,
      logoAssetId: logoAsset.id,
      logoAssetOriginalName: logoAsset.originalName,
      logoAssetProjectRelativePath: `input/${logoAsset.relativePath}`,
      confirmationSource: "user_confirmed",
      ...composite,
      completedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await writeJson(path.join(runRoot, "logo-post-composite.json"), audit);
    return audit;
  }
  async function preflightReferenceAssets(input) {
    const { projectId, assetIds } = input;
    const uniqueIds = Array.from(new Set(assetIds));
    if (uniqueIds.length === 0) {
      return { projectId, results: [] };
    }
    const [projectPaths, project] = await Promise.all([
      projects.paths(projectId),
      projects.get(projectId)
    ]);
    const { resolved, failures } = await resolveReferenceAssets(
      uniqueIds,
      // Same options as resolveExplicitReferencesOrThrow: SHA verification
      // off (the project store records SHA at import time; the resolver
      // exposes REFERENCE_ASSET_SHA_MISMATCH only when verifySha256 is true).
      { projectRoot: projectPaths.root, verifySha256: false },
      project.assets
    );
    const byId = /* @__PURE__ */ new Map();
    for (const r of resolved) byId.set(r.assetId, { status: "resolved", assetId: r.assetId, record: r });
    for (const f of failures) byId.set(f.assetId, { status: "failed", assetId: f.assetId, failure: f });
    return {
      projectId,
      results: uniqueIds.map(
        (id) => byId.get(id) ?? {
          status: "failed",
          assetId: id,
          failure: {
            assetId: id,
            code: "REFERENCE_ASSET_NOT_FOUND",
            message: `asset ${id} did not return a result from the resolver`
          }
        }
      )
    };
  }
  return {
    compile,
    start,
    startValidated,
    getSession: readSession,
    confirmDirection,
    continueSameType,
    confirmGeneratedOutput,
    revokeGeneratedOutput,
    getConfirmedGeneratedOutputs,
    postCompositeLogo,
    saveProjectPromptAsset,
    listOptions: listShortChainTemplateOptions,
    // r2.0 §4.11 / Phase C-3: UI preflight. The renderer calls this after
    // loadProjectAssets and on importFiles, so the user can see per-asset
    // resolution status (resolved / failed with code) BEFORE clicking
    // "use as reference". The same resolver vnext-service.start() uses, so
    // preflight pass = generation will not fail on REFERENCE_ASSET_* codes.
    preflightReferenceAssets
  };
}
export {
  assertReferenceAssetsResolvable,
  createShortChainGenerationService
};
