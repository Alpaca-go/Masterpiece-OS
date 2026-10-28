import path from "node:path";
import { createArtDirectionStore } from '../../art-direction-store.js';
import fs from 'node:fs/promises';
import { createProjectDesignDirectionStore } from '../../project-design-direction.js';
import { validateShortChainDeliverableEvidence } from "../../generation-runtime/core/space-generation-core.js";
import { createDefaultAnalysisReasoner } from "../../model-runtime/analysis-provider-registry.js";
import { atomicWriteJsonWithRetry } from "../runtime/atomic-write.js";
function parseJson(value) {
  const clean = value.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
  const parsed = JSON.parse(clean);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Deliverable validator returned a non-object result");
  }
  return parsed;
}
function createDeliverableValidatorService(projects, getImageGeneration, readSettings, readCredentials, projectContext, reasonerFactory = createDefaultAnalysisReasoner) {
  async function persist(projectId, runId, value) {
    const target = path.join(
      (await projects.paths(projectId)).root,
      "image-generation-vnext",
      "validations",
      `${runId}.json`
    );
    const write = await atomicWriteJsonWithRetry(target, value);
    if (!write.success) throw new Error(write.errorMessage ?? "Validation result write failed");
  }
  async function validate(input) {
    const run = await getImageGeneration().getRun(input.runId);
    if (!run || run.projectId !== input.projectId || run.status !== "succeeded" || !run.images[0]) {
      throw Object.assign(new Error("A succeeded image run is required for deliverable validation"), {
        code: "VNEXT_VALIDATION_RUN_INVALID"
      });
    }
    const image = run.images[0];
    const settings = await readSettings();
    const validatorProfileId = input.validatorProfileId || settings.profiles.find((profile) => profile.isEnabled && profile.hasApiKey && profile.modelType === "analysis" && profile.protocol === "openai-chat-multimodal")?.id;
    if (!validatorProfileId) {
      const validation2 = validateShortChainDeliverableEvidence({
        projectId: input.projectId,
        taskContract: input.taskContract,
        runId: run.runId,
        imageId: image.imageId,
        evidence: {}
      });
      await persist(input.projectId, run.runId, validation2);
      return validation2;
    }
    const credentials = await readCredentials(validatorProfileId);
    if (credentials.protocol !== "openai-chat-multimodal") {
      throw Object.assign(new Error("Deliverable validation requires a multimodal analysis profile"), {
        code: "VNEXT_VALIDATOR_PROFILE_INCOMPATIBLE"
      });
    }
    const runRoot = await getImageGeneration().runRoot(run.runId);
    if (!runRoot) throw new Error("Image run directory is missing");
    const imagePath = path.join(runRoot, image.relativePath);
    const context = await projectContext?.getShortChain(input.projectId).catch(() => void 0);
    const promptSource = context?.promptSourceObject;
    const art = input.taskContract.generationBasis === 'art_direction_reference';
    const artCapture = art ? await createArtDirectionStore(projects).resolve(input.taskContract.artDirection,input.projectId,input.taskContract.artDirection.model) : null;
    const execution = !art && input.taskContract.deliverableFamily==='space' ? JSON.parse(await fs.readFile(path.join(runRoot,'source-context-snapshot.json'),'utf8')) : null;
    const designDirection = execution ? await createProjectDesignDirectionStore(projects).resolve(input.projectId,execution.designDirection || null) : null;
    const confirmed = artCapture?.confirmation || designDirection?.confirmation;
    const targetTone = confirmed ? confirmed.spatialTranslation.spatialConcept : promptSource?.upgradeTranslation.toneBoundaries.map((item) => item.target).filter(Boolean).join("; ") || context?.visualIdentity.tone.join("; ") || "(not confirmed)";
    const toneAvoid = confirmed ? (confirmed.creativeDecision?.toneBoundaries || []).flatMap(item=>item.avoid || []).join('; ') : promptSource?.upgradeTranslation.toneBoundaries.flatMap((item) => item.avoid).join("; ") || "(none confirmed)";
    const lockedRequirements = [
      ...context?.lockedAssets.mustPreserve ?? [],
      ...promptSource?.lockedAssets.mustPreserve ?? []
    ];
    const reasoner = reasonerFactory(credentials);
    const response = await reasoner({
      prompt: {
        messages: [
          {
            role: "system",
            content: "You validate whether a generated image matches its requested deliverable. Inspect only visible image evidence. Return strict JSON without markdown."
          },
          {
            role: "user",
            content: [
              `Requested family: ${input.taskContract.deliverableFamily}`,
              `Requested subtype: ${input.taskContract.subtype}`,
              `Requested shot/composition: ${input.taskContract.shot}`,
              `Must include: ${input.taskContract.mustInclude.join("; ") || "(none)"}`,
              `Must avoid: ${input.taskContract.mustAvoid.join("; ") || "(none)"}`,
              `Logo mode: ${input.taskContract.logoUsageMode || "blank_area"}`,
              `Confirmed brand tone: ${targetTone}`,
              `Tone boundaries to avoid: ${toneAvoid}`,
              `Locked requirements (identity is deferred in post_composite mode): ${lockedRequirements.join("; ") || "(none)"}`,
              "",
              "Return exactly:",
              JSON.stringify({
                detectedFamily: "space|packaging|vi|poster|unknown",
                detectedSubtype: "visible subtype or unknown",
                visibleEvidence: ["only concrete visible evidence"],
                missingRequiredItems: ["requested structures visibly missing"],
                missingRequiredStructures: ["only missing physical structures; never deferred identity"],
                forbiddenItemsFound: ["forbidden visible content"],
                forbiddenNonIdentityItems: ["only forbidden non-identity content; identity belongs in generatedIdentityEvidence"],
                lockedAssetViolations: ["visible violations only; no identity absence in post_composite mode"],
                nonIdentityLockedAssetViolations: ["only visible non-identity asset violations"],
                generatedIdentityEvidence: ["location and visible shape of unintended generated text or logo; empty if absent"],
                brandMatch: "matched|mismatched|uncertain",
                brandToneMatch: "matched|mismatched|uncertain",
                sceneCompleteness: "complete|incomplete|uncertain",
                logoTextStatus: "correct|incorrect|absent|uncertain|not_required",
                qualityIssues: ["visible rendering or composition defects"]
              }),
              "For a space result, complete means one continuous enterable scene with floor, walls, ceiling, usable function, circulation, foreground, middle ground, background, and credible scale.",
              "In reference Logo mode, flag distorted, invented, duplicated, or misspelled identity. In blank_area mode, any visible logo, word, letters, or pseudo-text is incorrect.",
              "In post_composite mode this is the pre-composite generation stage. Logo and identity typography MUST be absent. Never report their absence as missingRequiredItems, forbiddenItemsFound or nonIdentityLockedAssetViolations. Logo fidelity/completeness is deferred to the actual post-composite stage. Independently report any wrongly generated letters, pseudo-text or logo as logoTextStatus=incorrect with concrete generatedIdentityEvidence (location and visible marks). A clean blank area is logoTextStatus=absent.",
              "In in_image mode the supplied brand name MUST appear in-scene as part of the design. Report logoTextStatus=correct only when the visible brand text matches the supplied name exactly with no garbled, misspelled, duplicated or extra text; use incorrect for wrong or extra text, and absent when no brand text is visible. Do not treat the supplied brand text as forbidden content.",
              "Evaluate brand tone from visible color/material/light/form behavior, not from prompt wording.",
              "Do not infer correctness from this text. If the image cannot prove a field, use unknown/uncertain."
            ].join("\n")
          }
        ],
        attachments: [{
          assetId: image.imageId,
          path: imagePath,
          mediaType: "image",
          format: path.extname(imagePath).slice(1),
          readable: true
        }]
      },
      signal: new AbortController().signal,
      maximumDurationMs: 12e4
    });
    const validation = validateShortChainDeliverableEvidence({
      projectId: input.projectId,
      taskContract: input.taskContract,
      runId: run.runId,
      imageId: image.imageId,
      evidence: parseJson(response.reportMarkdown)
    });
    await persist(input.projectId, run.runId, {
      ...validation,
      ...art ? {artDirectionSnapshotSha256:artCapture.snapshot.snapshotSha256,userConfirmationSha256:artCapture.snapshot.confirmationSha256} : {},
      ...designDirection ? {designDirection:designDirection.snapshot} : {},
      validatorProvider: response.provider,
      validatorModel: response.model,
      validatorRunId: response.runId
    });
    return validation;
  }
  return { validate };
}
export {
  createDeliverableValidatorService
};
