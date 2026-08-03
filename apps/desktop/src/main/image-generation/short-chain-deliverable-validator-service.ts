import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  PublicSettings,
  ShortChainDeliverableValidation,
  ShortChainTaskContract,
  SpatialBrandOrchestration,
} from '../../shared/types.ts';
import { validateShortChainDeliverableEvidence } from '@masterpiece/image-generation-runtime/short-chain/index.js';
import {
  loadGlobalSpaceEvaluationProfile,
  loadProjectSpaceEvaluationProfile,
} from '@masterpiece/image-generation-runtime';
import { createQwenReasoner } from '@masterpiece/model-runtime/qwen-reasoner.js';
import type { ProjectStore } from '../project-store.ts';
import type { ProjectContextService } from '../project-context-service.ts';
import { atomicWriteJsonWithRetry } from '../runtime/atomic-write.ts';
import type { ImageGenerationService } from './service.ts';

interface Credentials {
  apiKey: string;
  baseUrl: string;
  model: string;
  protocol?: string;
}

interface ValidateInput {
  projectId: string;
  taskContract: ShortChainTaskContract;
  runId: string;
  validatorProfileId?: string;
  spatialBrandOrchestration?: SpatialBrandOrchestration | null;
  spatialCompiledContext?: {
    foundationSnapshot?: Record<string, unknown>;
    projectCanon?: {
      brandSignageContract?: {
        logoSymbol?: { wallHeightRatio?: { max?: number } };
        fullLockup?: { wallWidthRatio?: { max?: number } };
      };
    };
    selectedAnchors?: Array<{
      assetId?: string;
      projectRelativePath?: string;
    }>;
    structureReferences?: Array<{
      assetId?: string;
      projectRelativePath?: string;
    }>;
  } | null;
}

function parseJson(value: string): Record<string, unknown> {
  const clean = value.trim()
    .replace(/^```(?:json)?\s*/iu, '')
    .replace(/\s*```$/u, '');
  const parsed = JSON.parse(clean);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Deliverable validator returned a non-object result');
  }
  return parsed as Record<string, unknown>;
}

export function createShortChainDeliverableValidatorService(
  projects: ProjectStore,
  getImageGeneration: () => ImageGenerationService,
  readSettings: () => Promise<PublicSettings>,
  readCredentials: (profileId?: string) => Promise<Credentials>,
  projectContext?: ProjectContextService,
) {
  async function persist(
    projectId: string,
    runId: string,
    value: unknown,
  ): Promise<void> {
    const target = path.join(
      (await projects.paths(projectId)).root,
      'image-generation-short-chain',
      'validations',
      `${runId}.json`,
    );
    const write = await atomicWriteJsonWithRetry(target, value);
    if (!write.success) throw new Error(write.errorMessage ?? 'Validation result write failed');
  }

  async function validate(input: ValidateInput): Promise<ShortChainDeliverableValidation> {
    const run = await getImageGeneration().getRun(input.runId);
    if (!run || run.projectId !== input.projectId || run.status !== 'succeeded' || !run.images[0]) {
      throw Object.assign(new Error('A succeeded image run is required for deliverable validation'), {
        code: 'SHORT_CHAIN_VALIDATION_RUN_INVALID',
      });
    }
    const image = run.images[0];
    const runtimeResourcesPath = typeof process.resourcesPath === 'string'
      ? process.resourcesPath
      : process.cwd();
    const packagedConfigRoot = path.join(runtimeResourcesPath, 'config', 'spatial');
    const configRoot = await fs.access(packagedConfigRoot).then(() => packagedConfigRoot).catch(() => undefined);
    const spatialEvaluationProfiles = input.spatialCompiledContext
      ? {
        global: loadGlobalSpaceEvaluationProfile({ configRoot }),
        project: await Promise.resolve()
          .then(() => loadProjectSpaceEvaluationProfile(input.projectId, { configRoot }))
          .catch((error: NodeJS.ErrnoException) => error.code === 'ENOENT' ? null : Promise.reject(error)),
      }
      : null;
    const settings = await readSettings();
    const validatorProfileId = input.validatorProfileId
      || settings.profiles.find((profile) =>
        profile.isEnabled
        && profile.hasApiKey
        && profile.modelType === 'analysis'
        && profile.protocol === 'openai-chat-multimodal')?.id;
    if (!validatorProfileId) {
      const validation = validateShortChainDeliverableEvidence({
        projectId: input.projectId,
        taskContract: input.taskContract,
        runId: run.runId,
        imageId: image.imageId,
        evidence: {},
        spatialBrandOrchestration: input.spatialBrandOrchestration,
        spatialCompiledContext: input.spatialCompiledContext,
        spatialEvaluationProfiles,
      }) as ShortChainDeliverableValidation;
      await persist(input.projectId, run.runId, validation);
      return validation;
    }
    const credentials = await readCredentials(validatorProfileId);
    if (credentials.protocol !== 'openai-chat-multimodal') {
      throw Object.assign(new Error('Deliverable validation requires a multimodal analysis profile'), {
        code: 'SHORT_CHAIN_VALIDATOR_PROFILE_INCOMPATIBLE',
      });
    }
    const runRoot = await getImageGeneration().runRoot(run.runId);
    if (!runRoot) throw new Error('Image run directory is missing');
    const imagePath = path.join(runRoot, image.relativePath);
    const context = await projectContext?.getShortChain(input.projectId).catch(() => undefined);
    const projectPaths = await projects.paths(input.projectId);
    const selectedReferences = (context?.sourceAssetRefs ?? [])
      .filter((asset) => input.taskContract.referenceAssetIds.includes(asset.assetId));
    const referenceAttachments = await Promise.all(selectedReferences.map(async (asset) => {
      const assetPath = path.resolve(projectPaths.input, asset.relativePath);
      return fs.access(assetPath).then(() => ({
        assetId: asset.assetId,
        path: assetPath,
        mediaType: 'image' as const,
        format: path.extname(assetPath).slice(1),
        readable: true,
      })).catch(() => null);
    }));
    const goldenReferenceAttachments = await Promise.all(
      (input.spatialCompiledContext?.selectedAnchors ?? []).map(async (anchor) => {
        if (!anchor.assetId || !anchor.projectRelativePath) return null;
        const assetPath = path.resolve(projectPaths.root, anchor.projectRelativePath);
        return fs.access(assetPath).then(() => ({
          assetId: anchor.assetId,
          path: assetPath,
          mediaType: 'image' as const,
          format: path.extname(assetPath).slice(1),
          readable: true,
        })).catch(() => null);
      }),
    );
    const structureReferenceAttachments = await Promise.all(
      (input.spatialCompiledContext?.structureReferences ?? []).map(async (reference) => {
        if (!reference.assetId || !reference.projectRelativePath) return null;
        const assetPath = path.resolve(projectPaths.root, reference.projectRelativePath);
        return fs.access(assetPath).then(() => ({
          assetId: reference.assetId,
          path: assetPath,
          mediaType: 'image' as const,
          format: path.extname(assetPath).slice(1),
          readable: true,
        })).catch(() => null);
      }),
    );
    const promptSource = context?.promptSourceObject;
    const targetTone = promptSource?.upgradeTranslation.toneBoundaries
      .map((item) => item.target)
      .filter(Boolean)
      .join('; ')
      || context?.visualIdentity.tone.join('; ')
      || '(not confirmed)';
    const toneAvoid = promptSource?.upgradeTranslation.toneBoundaries
      .flatMap((item) => item.avoid)
      .join('; ')
      || '(none confirmed)';
    const lockedRequirements = [
      ...(context?.lockedAssets.mustPreserve ?? []),
      ...(promptSource?.lockedAssets.mustPreserve ?? []),
    ];
    const reasoner = createQwenReasoner({
      apiKey: credentials.apiKey,
      model: credentials.model,
      baseUrl: credentials.baseUrl,
    });
    const response = await reasoner({
      prompt: {
        messages: [
          {
            role: 'system',
            content: 'You validate whether a generated image matches its requested deliverable. Inspect only visible image evidence. Return strict JSON without markdown.',
          },
          {
            role: 'user',
            content: [
              `Requested family: ${input.taskContract.deliverableFamily}`,
              `Requested subtype: ${input.taskContract.subtype}`,
              `Requested shot/composition: ${input.taskContract.shot}`,
              `Must include: ${input.taskContract.mustInclude.join('; ') || '(none)'}`,
              `Must avoid: ${input.taskContract.mustAvoid.join('; ') || '(none)'}`,
              `Logo mode: ${input.taskContract.logoUsageMode || 'blank_area'}`,
              `Confirmed brand tone: ${targetTone}`,
              `Tone boundaries to avoid: ${toneAvoid}`,
              `Locked visible requirements: ${lockedRequirements.join('; ') || '(none)'}`,
              `Selected locked references: ${selectedReferences.map((asset, index) =>
                `reference image ${index + 1}=${asset.name} (${asset.role})`).join('; ') || '(none)'}`,
              `Scene Role: ${input.spatialBrandOrchestration?.sceneRole || '(not scheduled)'}`,
              `Brand Intensity: ${input.spatialBrandOrchestration?.brandIntensity || '(not scheduled)'}`,
              `Approved maximum Logo occurrences: ${input.spatialBrandOrchestration?.assetBudget.textBudget.lockedLogoGroups ?? '(not scheduled)'}`,
              `Approved maximum visible assets: ${input.spatialBrandOrchestration
                ? Number(Boolean(input.spatialBrandOrchestration.assetBudget.primaryAsset)) + input.spatialBrandOrchestration.assetBudget.secondaryAssets.length
                : '(not scheduled)'}`,
              `Text safety zones: ${input.spatialBrandOrchestration?.textSafetyZones.map((zone) => `${zone.zoneId}=${zone.policy}`).join('; ') || '(not scheduled)'}`,
              `Locked Spatial Foundation snapshot: ${JSON.stringify(input.spatialCompiledContext?.foundationSnapshot ?? null)}`,
              `Global space evaluator dimensions: ${spatialEvaluationProfiles?.global.dimensions.map((item: { id: string }) => item.id).join(', ') || '(not enabled)'}`,
              `Project Golden evaluator dimensions: ${spatialEvaluationProfiles?.project?.dimensions.map((item: { id: string }) => item.id).join(', ') || '(not enabled)'}`,
              `Project Golden gate dimensions: ${JSON.stringify(spatialEvaluationProfiles?.project?.gateDimensions ?? null)}`,
              `Allowed project fatal failure tags: ${spatialEvaluationProfiles?.project?.fatalFailureTags.join(', ') || '(not enabled)'}`,
              `Logo scale contract: ${JSON.stringify(input.spatialCompiledContext?.projectCanon?.brandSignageContract ?? null)}`,
              `Golden style anchors: ${(input.spatialCompiledContext?.selectedAnchors ?? []).map((item) => item.assetId).filter(Boolean).join(', ') || '(none)'}`,
              `Structure-only references: ${(input.spatialCompiledContext?.structureReferences ?? []).map((item) => item.assetId).filter(Boolean).join(', ') || '(none)'}`,
              '',
              'Return exactly:',
              JSON.stringify({
                detectedFamily: 'space|packaging|vi|poster|unknown',
                detectedSubtype: 'visible subtype or unknown',
                visibleEvidence: ['only concrete visible evidence'],
                missingRequiredItems: ['requested structures visibly missing'],
                forbiddenItemsFound: ['forbidden visible content'],
                lockedAssetViolations: ['visible violations only'],
                brandMatch: 'matched|mismatched|uncertain',
                brandToneMatch: 'matched|mismatched|uncertain',
                sceneCompleteness: 'complete|incomplete|uncertain',
                logoTextStatus: 'correct|incorrect|absent|uncertain|not_required',
                qualityIssues: ['visible rendering or composition defects'],
                observedLogoCount: 0,
                observedApprovedAssetCount: 0,
                unexpectedTextBlocks: ['unapproved visible text block and location'],
                smallTextViolation: false,
                assetZoneViolations: ['asset and wrong visible zone'],
                sceneRoleMatch: true,
                foundationPreservation: {
                  architectureAestheticPreserved: true,
                  spatialScalePreserved: true,
                  largeSpaceIntentPreserved: true,
                  functionalZoningPreserved: true,
                  cameraRolePreserved: true,
                },
                globalSpaceScores: Object.fromEntries(
                  (spatialEvaluationProfiles?.global.dimensions ?? [])
                    .map((item: { id: string }) => [item.id, 0]),
                ),
                projectGoldenScores: Object.fromEntries(
                  (spatialEvaluationProfiles?.project?.dimensions ?? [])
                    .map((item: { id: string }) => [item.id, 0]),
                ),
                projectFailureTags: ['visible project failure tags only'],
                projectCalibrationChecks: {
                  anchorStyleAligned: true,
                  genericFuturisticClinicPresent: false,
                  architectureSkinReplaced: true,
                  purpleSurfaceOveruse: false,
                  technologyShowroomLightingPresent: false,
                  brandArchitecturallyIntegrated: true,
                  largeSpaceIntentPreserved: true,
                },
                logoScale: {
                  symbolWallHeightRatio: 0.0,
                  fullLockupWallWidthRatio: 0.0,
                  signageDominatesFirstRead: false,
                },
                lockedAssetQa: [{
                  assetId: 'exact selected assetId',
                  assetType: 'logo|ip_character|icon|packaging_front|other',
                  occurrenceCount: 1,
                  contourSimilarity: 0.0,
                  aspectRatioDeviation: 0.0,
                  textExactMatch: true,
                  ocrConfidence: 0.0,
                  materialMatch: true,
                  craftMatch: true,
                  assetOwnershipMatch: true,
                  materialConfidence: 0.0,
                  visibleWidthPx: 0,
                  placementMatch: true,
                  unexpectedLogoCount: 0,
                  identitySimilarity: 0.0,
                  proportionMatch: true,
                  signatureFeaturesMatch: true,
                  primaryColorMatch: true,
                  surfaceMatch: true,
                  occlusionMatch: true,
                  seriesConsistencyMatch: true,
                }],
                packagingQa: {
                  logoFidelity: 0.0,
                  structureMatch: true,
                  materialMatch: true,
                  commercialPhotography: true,
                  productHierarchyMatch: true,
                  groupRelationshipMatch: true,
                  seriesConsistencyMatch: true,
                  boxStructureMatch: true,
                  insertStructureMatch: true,
                  productArrangementMatch: true,
                  structuralRealism: true,
                },
              }),
              'For a space result, complete means one continuous enterable scene with floor, walls, ceiling, usable function, circulation, foreground, middle ground, background, and credible scale.',
              selectedReferences.length
                ? 'User-selected reference content is explicitly allowed and required, including any Logo, Icon, lettering or IP character visible in those references. In blank_area mode, reject only unrelated or invented logos, words, letters or pseudo-text; never reject faithful selected-reference content merely because the task inherited blank_area mode.'
                : 'In reference Logo mode, flag distorted, invented, duplicated, or misspelled identity. In blank_area mode, any visible logo, word, letters, or pseudo-text is incorrect.',
              'In post_composite Logo mode, the model image must leave every Logo, brand name, slogan, signage word, letter, pseudo-text, and exact brand icon system absent and provide clean placement areas. Do not report an absent identity, icon system, or blank signage area as missing; deterministic post-compositing is validated separately. If visibleEvidence mentions any model-rendered text or lettering, logoTextStatus must be incorrect, never absent.',
              'Evaluate brand tone from visible color/material/light/form behavior, not from prompt wording.',
              'For Golden style anchors, compare only material behaviour, lighting behaviour, architectural skin, integrated brand expression, decorative density and refined feminine medical-aesthetic tone. Never require the generated room to copy Anchor scale, layout, circulation or exact composition.',
              'For structure-only references, compare only room envelope, scale, ceiling height, depth, apertures, zoning, circulation, camera view and major fixture positions. Treat every source material, colour, ceiling design, light style, brand wall, decoration, Logo and generic clinical/futuristic tone as visual skin that must be replaced.',
              'Estimate Logo symbol height divided by its carrier wall height and full-lockup width divided by its carrier wall width. Report the numeric ratios and whether signage dominates the first read. A symbol ratio above 0.15, lockup ratio above 0.28, or first-read domination is logo_oversized.',
              'Use anchor_style_drift, generic_futuristic_clinic, architecture_skin_not_replaced, purple_surface_overuse, technology_showroom_lighting, brand_integration_applied_not_integrated and large_space_intent_lost only when directly supported by visible evidence. These are hard failures.',
              'Compare the generated image (first attachment) against every selected locked reference attachment in order. Every selected reference is a mandatory visible asset, regardless of its automatically detected role. It must be immediately recognizable as a concrete Logo, Icon, IP character, graphic, product or structure applied to the finished design. Matching only palette, lighting, line rhythm, geometry, mood or general style does not count. Report each omitted, unrecognizable, materially altered or merely abstracted selected asset separately in lockedAssetViolations.',
              'For each selected reference, return one lockedAssetQa item using the exact assetId. Count visible occurrences, estimate contour similarity and aspect-ratio deviation against the reference, check exact readable text at 96px or larger, check requested material and planned primary placement, and count unrelated or duplicate logo-like marks. Do not omit a selected asset from lockedAssetQa.',
              'Apply asset-specific rules: Logo locks contour, negative space, typography, arrangement and proportions; IP character locks identity, head-to-body proportion range, facial feature positions, primary colors, signature clothing and accessories while allowing pose/expression/view/material/light; icon locks its graphic unit but has no OCR requirement. Set assetType and the matching QA fields accordingly.',
              'For glass, storefront, reflective metal, curved wall, partial occlusion and distant wayfinding requests, separately judge surface integration and preservation of credible transparency/reflection/curvature/foreground occlusion. When a prior-view reference is attached, judge cross-angle identity, material and scale consistency through seriesConsistencyMatch.',
              'For a scheduled spatial orchestration, count complete visible Logos and approved literal assets, list only unapproved text blocks, flag unreadable small text, report assets outside their assigned zones, and judge whether the visible hierarchy matches the requested Scene Role. Do not count palette, pattern rhythm or abstract style inheritance as extra literal assets.',
              'For a canonical Packaging shot (PKG-*), always return packagingQa from visible evidence. Logo fidelity compares the visible mark with the selected identity reference; structure, material and photography fields judge the manufactured package rather than the background set.',
              'Do not infer correctness from this text. If the image cannot prove a field, use unknown/uncertain.',
            ].join('\n'),
          },
        ],
        attachments: [{
          assetId: image.imageId,
          path: imagePath,
          mediaType: 'image',
          format: path.extname(imagePath).slice(1),
          readable: true,
        },
        ...referenceAttachments.filter((item): item is NonNullable<typeof item> => Boolean(item)),
        ...goldenReferenceAttachments.filter((item): item is NonNullable<typeof item> => Boolean(item)),
        ...structureReferenceAttachments.filter((item): item is NonNullable<typeof item> => Boolean(item)),
        ],
      },
      signal: new AbortController().signal,
      maximumDurationMs: 120_000,
    });
    const validation = validateShortChainDeliverableEvidence({
      projectId: input.projectId,
      taskContract: input.taskContract,
      runId: run.runId,
      imageId: image.imageId,
      evidence: parseJson(response.reportMarkdown),
      spatialBrandOrchestration: input.spatialBrandOrchestration,
      spatialCompiledContext: input.spatialCompiledContext,
      spatialEvaluationProfiles,
    }) as ShortChainDeliverableValidation;
    await persist(input.projectId, run.runId, {
      ...validation,
      validatorProvider: response.provider,
      validatorModel: response.model,
      validatorRunId: response.runId,
    });
    return validation;
  }

  return { validate };
}

export type ShortChainDeliverableValidatorService = ReturnType<typeof createShortChainDeliverableValidatorService>;
