import crypto from "node:crypto";
import { migrateAnalysisPacket } from "../analysis-decisions/index.js";
import { atomicWriteJsonWithRetry } from "./runtime/atomic-write.js";
import { isAnalysisSourceAsset } from "./project-assets.js";
const PROJECT_VISUAL_CONTEXT_SHORT_CHAIN_SCHEMA_VERSION = "2.0";
const PROJECT_CONTEXT_SHORT_CHAIN_BUILDER_ID = "project-context-builder";
const PROJECT_CONTEXT_SHORT_CHAIN_BUILDER_VERSION = "project-context-builder@1.1.0";
function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function strings(...values) {
  const result = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== "string") return;
    const clean = value.trim();
    if (clean && !result.includes(clean)) result.push(clean);
  };
  values.forEach(visit);
  return result;
}
function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stableValue(item)])
  );
}
function sourceFingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}
function contextSemanticFingerprint(context, packagingTranslations = context.packagingTranslations) {
  return sourceFingerprint({
    projectId: context.projectId,
    brandCore: context.brandCore,
    lockedAssets: context.lockedAssets,
    visualIdentity: context.visualIdentity,
    styleBoundaries: context.styleBoundaries,
    confirmedDecisions: context.confirmedDecisions,
    sourceAssetRefs: context.sourceAssetRefs,
    promptSourceFingerprint: context.promptSourceObject?.provenance.sourceFingerprint ?? null,
    visualDecisionPacketFingerprint: context.visualDecisionPacket?.provenance.sourceFingerprint ?? null,
    packagingTranslationFingerprints: {
      analysisLed: packagingTranslations?.analysisLed?.sourceFingerprint ?? null,
      referenceFirst: packagingTranslations?.referenceFirst?.sourceFingerprint ?? null
    }
  });
}
function validatePackagingSource(source, projectId) {
  const errors = [];
  if (source.schemaVersion !== "1.0") errors.push("schemaVersion");
  if (source.projectId !== projectId) errors.push("projectId");
  if (!["analysis_led", "reference_first"].includes(source.sourceKind)) errors.push("sourceKind");
  if (!source.sourceFingerprint) errors.push("sourceFingerprint");
  if (source.translationContract !== "PackagingTranslationV2") errors.push("translationContract");
  if (!source.translation || !source.translation.packagingConcept && source.translation.status === "ready") {
    errors.push("translation");
  }
  if (source.sourceKind === "reference_first" && !source.producerRunId) errors.push("producerRunId");
  return errors;
}
function analysisPackagingSource(context) {
  const packet = context.visualDecisionPacket;
  if (!packet?.mediaTranslations?.packaging) return null;
  return {
    schemaVersion: "1.0",
    sourceKind: "analysis_led",
    projectId: context.projectId,
    producerRunId: context.provenance.structuredAnalysisRunId ?? null,
    sourceFingerprint: packet.provenance.sourceFingerprint,
    translationContract: "PackagingTranslationV2",
    generatedAt: packet.provenance.generatedAt || context.generatedAt,
    translation: packet.mediaTranslations.packaging
  };
}
function confidence(value, confirmed = false) {
  if (confirmed) return 1;
  return value ? 0.7 : 0;
}
function mergePromptSourceObject(context, extractedValue, structuredAnalysisRunId) {
  const migrated = migrateProjectVisualContext(context).promptSourceObject;
  const extracted = record(extractedValue);
  if (extracted.schemaVersion !== "1.0") return migrated;
  const extractedFacts = extracted.projectFacts ?? migrated.projectFacts;
  const extractedLocks = extracted.lockedAssets ?? migrated.lockedAssets;
  const logoAssetIds = [...context.lockedAssets.logoAssetIds];
  const hasLogo = logoAssetIds.length > 0;
  const sourceKinds = [
    ...context.provenance.sourceKinds,
    "structured_analysis"
  ].filter((item, index, values) => values.indexOf(item) === index);
  return {
    ...migrated,
    generatedAt: context.generatedAt,
    projectFacts: {
      ...migrated.projectFacts,
      ...extractedFacts,
      // ProjectRecord identity is authoritative over model inference.
      brandName: context.brandCore.name,
      industry: context.brandCore.industry !== "unknown" ? context.brandCore.industry : extractedFacts.industry,
      brandRole: extractedFacts.brandRole || context.brandCore.brandRole || ""
    },
    lockedAssets: {
      ...migrated.lockedAssets,
      ...extractedLocks,
      logoAssetIds,
      preferredLogoAssetId: logoAssetIds[0] ?? null,
      // See the comment in `visual-decision-packet.ts`: a project that has
      // A confirmed logo is bound by the Logo Locked contract, which
      // only accepts `post_composite` in Short-Chain Generation.
      logoUsageMode: hasLogo ? "post_composite" : "blank_area",
      confirmedColors: strings(
        context.lockedAssets.confirmedColors,
        extractedLocks.confirmedColors
      ),
      mustPreserve: strings(
        context.lockedAssets.mustPreserve,
        extractedLocks.mustPreserve
      ),
      immutableStructures: strings(
        context.lockedAssets.packageStructures,
        extractedLocks.immutableStructures
      )
    },
    sourceVisualState: extracted.sourceVisualState ?? migrated.sourceVisualState,
    upgradeTranslation: extracted.upgradeTranslation ?? migrated.upgradeTranslation,
    renderLanguage: extracted.renderLanguage ?? migrated.renderLanguage,
    negativeRules: {
      project: strings(
        context.styleBoundaries.mustAvoid,
        extracted.negativeRules?.project
      ),
      model: strings(
        migrated.negativeRules.model,
        extracted.negativeRules?.model
      )
    },
    confidence: extracted.confidence ?? migrated.confidence,
    provenance: {
      sourceKinds,
      ...structuredAnalysisRunId ? { structuredAnalysisRunId } : {},
      sourceFingerprint: sourceFingerprint({
        contextFingerprint: context.provenance.sourceFingerprint,
        extracted: stableValue(extracted),
        promptSourceBuilderVersion: "1.0.0"
      })
    }
  };
}
function migrateProjectVisualContext(context) {
  if (context.visualDecisionPacket) {
    context = {
      ...context,
      visualDecisionPacket: migrateVisualDecisionPacketShape(context.visualDecisionPacket)
    };
  }
  if (!context.packagingTranslations?.analysisLed) {
    const analysisLed = analysisPackagingSource(context);
    if (analysisLed) {
      context = {
        ...context,
        packagingTranslations: {
          schemaVersion: "1.0",
          ...context.packagingTranslations,
          analysisLed
        }
      };
    }
  }
  if (context.promptSourceObject?.schemaVersion === "1.0") {
    return context;
  }
  const hasLogo = context.lockedAssets.logoAssetIds.length > 0;
  const promptSourceObject = {
    schemaVersion: "1.0",
    projectId: context.projectId,
    generatedAt: context.generatedAt,
    projectFacts: {
      brandName: context.brandCore.name,
      industry: context.brandCore.industry,
      brandRole: context.brandCore.brandRole ?? "",
      businessModel: null,
      primaryOfferings: []
    },
    lockedAssets: {
      logoAssetIds: [...context.lockedAssets.logoAssetIds],
      preferredLogoAssetId: context.lockedAssets.logoAssetIds[0] ?? null,
      // See the comment in `visual-decision-packet.ts`: a project that has
      // A confirmed logo is bound by the Logo Locked contract, which
      // only accepts `post_composite` in Short-Chain Generation.
      logoUsageMode: hasLogo ? "post_composite" : "blank_area",
      confirmedColors: [...context.lockedAssets.confirmedColors],
      mustPreserve: [...context.lockedAssets.mustPreserve],
      immutableStructures: [...context.lockedAssets.packageStructures]
    },
    sourceVisualState: {
      valuableAssets: [...context.lockedAssets.mustPreserve],
      overusedElements: [],
      outdatedExpressions: [],
      genericIndustryCliches: [],
      brandMisreadRisks: []
    },
    upgradeTranslation: {
      preserve: [...context.lockedAssets.mustPreserve],
      weaken: [],
      remove: [],
      targetWorldview: [...context.visualIdentity.tone],
      toneBoundaries: context.visualIdentity.tone.map((target) => ({ target, avoid: [] })),
      transformations: []
    },
    renderLanguage: {
      colorBehavior: {
        primary: context.lockedAssets.confirmedColors.map((name) => ({
          name,
          role: "confirmed project color"
        })),
        secondary: [],
        accent: [],
        forbidden: []
      },
      materialBehavior: context.visualIdentity.materialBehavior.map((material) => ({
        material,
        behavior: [],
        brandRole: "",
        forbidden: []
      })),
      lightingBehavior: {
        source: [...context.visualIdentity.lightingBehavior],
        contrast: "",
        interactionWithMaterials: [],
        forbidden: []
      },
      graphicBehavior: [...context.visualIdentity.graphicBehavior]
    },
    negativeRules: {
      project: [...context.styleBoundaries.mustAvoid],
      model: ["\u968F\u673A\u4E2D\u6587", "\u9519\u8BEF\u82F1\u6587\u54C1\u724C\u540D", "\u81EA\u884C\u751F\u6210 slogan", "\u6A21\u7CCA\u6587\u5B57"]
    },
    confidence: {
      projectFacts: confidence(
        context.brandCore.name !== "unknown" && context.brandCore.industry !== "unknown",
        context.lockedAssets.brandNameLocked
      ),
      lockedAssets: confidence(
        context.lockedAssets.mustPreserve.length > 0 || hasLogo,
        hasLogo && context.lockedAssets.brandNameLocked
      ),
      sourceVisualState: 0,
      upgradeTranslation: context.visualIdentity.tone.length ? 0.4 : 0
    },
    provenance: {
      sourceKinds: [...context.provenance.sourceKinds, "legacy_migration"],
      ...context.provenance.structuredAnalysisRunId ? { structuredAnalysisRunId: context.provenance.structuredAnalysisRunId } : {},
      sourceFingerprint: sourceFingerprint({
        contextFingerprint: context.provenance.sourceFingerprint,
        migrationVersion: "1.0.0"
      })
    }
  };
  return { ...context, promptSourceObject };
}
function upsertProjectPackagingTranslation(value, source, generatedAt = (/* @__PURE__ */ new Date()).toISOString()) {
  const context = migrateProjectVisualContext(value);
  const errors = validatePackagingSource(source, context.projectId);
  if (errors.length) {
    throw Object.assign(new Error(`Packaging translation source invalid: ${errors.join(", ")}`), {
      code: "PROJECT_PACKAGING_TRANSLATION_INVALID"
    });
  }
  const packagingTranslations = {
    schemaVersion: "1.0",
    ...context.packagingTranslations,
    ...source.sourceKind === "analysis_led" ? { analysisLed: source } : { referenceFirst: source }
  };
  return {
    ...context,
    version: context.version + 1,
    generatedAt,
    packagingTranslations,
    provenance: {
      ...context.provenance,
      sourceFingerprint: contextSemanticFingerprint(context, packagingTranslations)
    }
  };
}
function removeProjectPackagingTranslation(value, sourceKind, expectedFingerprint, generatedAt = (/* @__PURE__ */ new Date()).toISOString()) {
  const context = migrateProjectVisualContext(value);
  const current = sourceKind === "analysis_led" ? context.packagingTranslations?.analysisLed : context.packagingTranslations?.referenceFirst;
  if (!current || expectedFingerprint && current.sourceFingerprint !== expectedFingerprint) return context;
  const packagingTranslations = {
    schemaVersion: "1.0",
    ...sourceKind === "analysis_led" ? {} : { analysisLed: context.packagingTranslations?.analysisLed },
    ...sourceKind === "reference_first" ? {} : { referenceFirst: context.packagingTranslations?.referenceFirst }
  };
  return {
    ...context,
    version: context.version + 1,
    generatedAt,
    packagingTranslations,
    provenance: {
      ...context.provenance,
      sourceFingerprint: contextSemanticFingerprint(context, packagingTranslations)
    }
  };
}
function assetRole(asset, project, structured) {
  if (project.logoFiles.includes(asset.relativePath) || project.logoFiles.includes(asset.originalName) || /(?:^|[-_.\s])(logo|标志|标识)(?:[-_.\s]|$)/iu.test(asset.originalName)) return "logo";
  const packageIds = strings(record(structured.lockedAssets).packageStructureAssetIds);
  if (packageIds.includes(asset.id)) return "package_structure";
  const productIds = strings(record(structured.lockedAssets).productAssetIds);
  if (productIds.includes(asset.id)) return "product";
  if (asset.mimeType.startsWith("image/")) return "visual_reference";
  return "source";
}
function migrateVisualDecisionPacketShape(packet) {
  return migrateAnalysisPacket(packet).packet;
}
function buildProjectVisualContext(input) {
  const { project } = input;
  const structured = record(input.structuredAnalysis);
  const suppliedPacket = record(structured.visualDecisionPacket);
  const brandCore = record(structured.brandCore);
  const structuredLocks = record(structured.lockedAssets);
  const visualIdentity = record(structured.visualIdentity);
  const boundaries = record(structured.styleBoundaries);
  const activeAssets = project.assets.filter((asset) => isAnalysisSourceAsset(asset) && asset.status === "ready");
  const sourceAssetRefs = activeAssets.map((asset) => ({
    assetId: asset.id,
    name: asset.originalName,
    relativePath: asset.relativePath,
    role: assetRole(asset, project, structured)
  }));
  const persistedLocks = input.lockedAssets ?? [];
  const logoAssetIds = strings(
    persistedLocks.filter((asset) => asset.type === "logo").map((asset) => asset.sourceAssetId),
    sourceAssetRefs.filter((asset) => asset.role === "logo").map((asset) => asset.assetId)
  );
  const lockedAssetIds = strings(
    persistedLocks.map((asset) => asset.id),
    structuredLocks.lockedAssetIds
  );
  const mustPreserve = strings(
    project.lockedFacts,
    persistedLocks.map((asset) => [asset.rule, ...asset.forbiddenChanges]),
    structuredLocks.mustPreserve
  );
  const confirmedDecisions = Array.isArray(structured.confirmedDecisions) ? structured.confirmedDecisions.flatMap((value, index) => {
    const decision = record(value);
    if (typeof decision.value !== "string" || !decision.value.trim()) return [];
    return [{
      id: typeof decision.id === "string" && decision.id.trim() ? decision.id.trim() : `structured-${index + 1}`,
      value: decision.value.trim(),
      source: "structured_analysis",
      ...typeof decision.confirmedAt === "string" ? { confirmedAt: decision.confirmedAt } : {}
    }];
  }) : [];
  for (const fact of project.lockedFacts) {
    confirmedDecisions.push({
      id: `project-fact-${sourceFingerprint(fact).slice(0, 12)}`,
      value: fact,
      source: "project_record"
    });
  }
  const uncertaintyDefaults = [
    ...strings(brandCore.audience).length ? [] : ["target_audience"],
    ...strings(visualIdentity.tone).length ? [] : ["visual_tone"],
    ...strings(visualIdentity.colorBehavior).length ? [] : ["color_behavior"]
  ];
  const fingerprintInput = {
    project: {
      id: project.id,
      projectName: project.projectName,
      brandName: project.brandName,
      industry: project.industry,
      logoLocked: project.logoLocked,
      lockedFacts: project.lockedFacts,
      assets: activeAssets.map(({ id, originalName, relativePath, mimeType, sha256 }) => ({
        id,
        originalName,
        relativePath,
        mimeType,
        sha256
      }))
    },
    lockedAssets: persistedLocks,
    structuredAnalysis: structured
  };
  const context = {
    schemaVersion: "2.0",
    projectId: project.id,
    version: (input.previousContext?.version ?? 0) + 1,
    generatedAt: input.generatedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
    brandCore: {
      name: strings(project.brandName, project.projectName, brandCore.name)[0] ?? "unknown",
      industry: strings(project.industry, project.detectedIndustry, brandCore.industry)[0] ?? "unknown",
      brandRole: strings(brandCore.brandRole)[0] ?? null,
      audience: strings(brandCore.audience)
    },
    lockedAssets: {
      logoAssetIds,
      brandNameLocked: Boolean(project.brandName),
      confirmedColors: strings(structuredLocks.confirmedColors),
      packageStructures: strings(structuredLocks.packageStructures),
      productAssetIds: strings(
        structuredLocks.productAssetIds,
        sourceAssetRefs.filter((asset) => asset.role === "product").map((asset) => asset.assetId)
      ),
      lockedAssetIds,
      mustPreserve
    },
    visualIdentity: {
      tone: strings(visualIdentity.tone),
      colorBehavior: strings(visualIdentity.colorBehavior),
      graphicBehavior: strings(visualIdentity.graphicBehavior),
      materialBehavior: strings(visualIdentity.materialBehavior),
      compositionBehavior: strings(visualIdentity.compositionBehavior),
      lightingBehavior: strings(visualIdentity.lightingBehavior)
    },
    styleBoundaries: {
      mustAvoid: strings(boundaries.mustAvoid),
      uncertainItems: strings(boundaries.uncertainItems, uncertaintyDefaults)
    },
    confirmedDecisions,
    sourceAssetRefs,
    provenance: {
      builderId: PROJECT_CONTEXT_SHORT_CHAIN_BUILDER_ID,
      builderVersion: PROJECT_CONTEXT_SHORT_CHAIN_BUILDER_VERSION,
      sourceKinds: [
        "project_record",
        "original_asset",
        ...Object.keys(structured).length ? ["structured_analysis"] : [],
        ...confirmedDecisions.some((decision) => decision.source === "user_confirmation") ? ["user_confirmation"] : []
      ],
      ...input.structuredAnalysisRunId ? { structuredAnalysisRunId: input.structuredAnalysisRunId } : {},
      sourceFingerprint: sourceFingerprint(fingerprintInput)
    },
    ...suppliedPacket.schemaVersion === "1.0" && suppliedPacket.projectId === project.id ? { visualDecisionPacket: migrateVisualDecisionPacketShape(suppliedPacket) } : input.previousContext?.visualDecisionPacket ? { visualDecisionPacket: migrateVisualDecisionPacketShape(input.previousContext.visualDecisionPacket) } : {}
  };
  const migrated = migrateProjectVisualContext(context);
  return {
    ...migrated,
    promptSourceObject: mergePromptSourceObject(
      migrated,
      structured.promptSourceObject ?? input.previousContext?.promptSourceObject,
      input.structuredAnalysisRunId
    )
  };
}
function validateProjectVisualContext(value) {
  const context = record(value);
  const errors = [];
  if (context.schemaVersion !== "2.0") errors.push("schemaVersion must be 2.0");
  if (typeof context.projectId !== "string" || !context.projectId) errors.push("projectId is required");
  if (!Number.isInteger(context.version) || Number(context.version) < 1) errors.push("version must be a positive integer");
  if (!record(context.brandCore).name) errors.push("brandCore.name is required");
  if (!Array.isArray(record(context.lockedAssets).mustPreserve)) errors.push("lockedAssets.mustPreserve must be an array");
  if (!Array.isArray(context.sourceAssetRefs)) errors.push("sourceAssetRefs must be an array");
  if (!record(context.provenance).sourceFingerprint) errors.push("provenance.sourceFingerprint is required");
  if (context.visualDecisionPacket && (record(context.visualDecisionPacket).schemaVersion !== "1.0" || record(context.visualDecisionPacket).projectId !== context.projectId)) errors.push("visualDecisionPacket must be schema 1.0 and belong to the project");
  const translations = record(context.packagingTranslations);
  if (Object.keys(translations).length) {
    if (translations.schemaVersion !== "1.0") errors.push("packagingTranslations.schemaVersion must be 1.0");
    for (const [slot, expectedKind] of [["analysisLed", "analysis_led"], ["referenceFirst", "reference_first"]]) {
      if (!translations[slot]) continue;
      const source = translations[slot];
      const sourceErrors = validatePackagingSource(source, String(context.projectId));
      if (source.sourceKind !== expectedKind) sourceErrors.push("slot sourceKind");
      if (sourceErrors.length) errors.push(`packagingTranslations.${slot} invalid: ${sourceErrors.join(", ")}`);
    }
  }
  return { valid: errors.length === 0, errors };
}
async function writeProjectVisualContext(filePath, context) {
  const validation = validateProjectVisualContext(context);
  if (!validation.valid) {
    throw Object.assign(new Error(`Project Visual Context invalid: ${validation.errors.join("; ")}`), {
      code: "PROJECT_VISUAL_CONTEXT_VNEXT_INVALID"
    });
  }
  const result = await atomicWriteJsonWithRetry(filePath, context);
  if (!result.success) {
    throw Object.assign(new Error(result.errorMessage ?? "Project Visual Context write failed"), {
      code: "PROJECT_VISUAL_CONTEXT_VNEXT_WRITE_FAILED"
    });
  }
}
export {
  PROJECT_CONTEXT_SHORT_CHAIN_BUILDER_ID,
  PROJECT_CONTEXT_SHORT_CHAIN_BUILDER_VERSION,
  PROJECT_VISUAL_CONTEXT_SHORT_CHAIN_SCHEMA_VERSION,
  buildProjectVisualContext,
  migrateProjectVisualContext,
  removeProjectPackagingTranslation,
  upsertProjectPackagingTranslation,
  validateProjectVisualContext,
  writeProjectVisualContext
};
