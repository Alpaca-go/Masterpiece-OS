import type { ReferenceStyleCapsule } from '@masterpiece/project-contracts/index.ts';
import type { CreativeSessionService } from './creative-session-service.ts';
import type { LockedAssetsService } from './locked-assets-service.ts';
import type { ReferenceAnchorService } from './reference-anchor-service.ts';
import type { StyleProfileService } from './style-profile-service.ts';
import type { VisualMigrationReferencePackService } from './visual-migration-reference-pack-service.ts';
import type { VisualMigrationCanonService } from './visual-migration-canon-service.ts';

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function compileDecision(projectId: string, capsule: ReferenceStyleCapsule) {
  const inherited = unique([
    ...capsule.inheritedStyle.color,
    ...capsule.inheritedStyle.layoutAndTypography,
    ...capsule.inheritedStyle.graphicLanguage,
    ...capsule.inheritedStyle.materialAndPhotography,
    ...capsule.inheritedStyle.extensionMechanism,
  ]);
  const prohibited = unique([
    ...capsule.userAvoidance,
    ...capsule.prohibitedReferenceIdentity.brandNames,
    ...capsule.prohibitedReferenceIdentity.logos,
    ...capsule.prohibitedReferenceIdentity.slogans,
    ...capsule.prohibitedReferenceIdentity.signatureGraphics,
    ...capsule.prohibitedReferenceIdentity.proprietaryPatterns,
  ]);
  return {
    schemaVersion: '6.0',
    id: `creative-decision-quick-${capsule.sourceRunId}`,
    projectId,
    version: '1.0.0',
    brandCoreJudgment: capsule.currentProject.lockedFacts,
    currentVisualProblems: capsule.humanNotes,
    retainedAssets: capsule.currentProject.lockedFacts,
    reconstructableAssets: inherited,
    inheritedReferenceMechanisms: inherited,
    prohibitedReferenceContent: prohibited,
    visualUpgradeThesis: capsule.anchorGoal,
    primaryDirection: {
      name: 'Quick Extraction Direction',
      summary: capsule.anchorGoal,
      keywords: inherited.slice(0, 8),
      mood: [],
    },
    styleBoundaries: {
      allowed: inherited,
      forbidden: prohibited,
    },
    outputPriorities: capsule.currentProject.businessTouchpoints,
    risks: unique([...capsule.humanNotes, ...capsule.uncertainties]),
    createdAt: new Date().toISOString(),
  };
}

export function createQuickStyleExtractionService(
  referenceAnchors: ReferenceAnchorService,
  sessions: CreativeSessionService,
  lockedAssets: LockedAssetsService,
  styles: StyleProfileService,
  visualMigrationReferencePacks: VisualMigrationReferencePackService,
  visualMigrationCanons: VisualMigrationCanonService,
) {
  async function extract(projectId: string, referenceAnchorRunId: string) {
    const [run, active] = await Promise.all([
      referenceAnchors.getRun(referenceAnchorRunId),
      styles.getActive(projectId),
    ]);
    if (!run || run.projectId !== projectId || run.decision !== 'approved') {
      throw Object.assign(new Error('快速提取只接受当前项目中已人工通过的 Reference Anchor。'), {
        code: 'QUICK_EXTRACTION_SOURCE_INVALID',
      });
    }
    const creativeDecisionId = `creative-decision-quick-${referenceAnchorRunId}`;
    if (active && active.source?.creativeDecisionId !== creativeDecisionId) {
      throw Object.assign(new Error('项目已有 active Style Profile，请继续现有生产链路。'), {
        code: 'QUICK_EXTRACTION_STYLE_EXISTS',
      });
    }
    const capsule = await referenceAnchors.getCapsule(referenceAnchorRunId);
    if (capsule.currentProjectId !== projectId) {
      throw Object.assign(new Error('Reference Style Capsule 与当前项目不匹配。'), {
        code: 'QUICK_EXTRACTION_SOURCE_INVALID',
      });
    }
    const packResult = await visualMigrationReferencePacks.createOrGet(projectId, referenceAnchorRunId);
    const session = await sessions.create(projectId);
    if (active) {
      const currentLocks = await lockedAssets.list(projectId);
      const canonResult = await visualMigrationCanons.createOrGet({
        projectId,
        referenceAnchorRunId,
        referencePackId: packResult.manifest.referencePackId,
        capsule,
        styleProfile: active,
        lockedAssets: currentLocks,
      });
      await sessions.setVisualMigrationReference(projectId, {
        referencePackId: packResult.manifest.referencePackId,
        sourceReferenceAnchorRunId: referenceAnchorRunId,
        sourceFingerprint: packResult.manifest.sourceFingerprint,
      });
      await sessions.setVisualMigrationCanon(projectId, {
        canonId: canonResult.canon.canonId,
        canonFingerprint: canonResult.canon.canonFingerprint,
        sourceFingerprint: canonResult.canon.sourceFingerprint,
        referencePackId: canonResult.canon.source.referencePackId,
      });
      return {
        session: await sessions.create(projectId),
        styleProfile: active,
        lockedAssets: currentLocks,
        sourceRunId: referenceAnchorRunId,
        projectId,
        referenceAnchorRunId,
        referencePackId: packResult.manifest.referencePackId,
        sourceFingerprint: packResult.manifest.sourceFingerprint,
        visualMigrationCanonId: canonResult.canon.canonId,
        visualMigrationCanonFingerprint: canonResult.canon.canonFingerprint,
        visualMigrationCanonSourceFingerprint: canonResult.canon.sourceFingerprint,
        visualMigrationCanonCreated: canonResult.created,
        creativeDecisionId,
        styleProfileId: active.id,
        created: packResult.created,
      };
    }
    if (session.workflowState !== 'SESSION_CREATED') {
      throw Object.assign(new Error(`当前 Session 状态 ${session.workflowState} 不允许快速提取。`), {
        code: 'QUICK_EXTRACTION_STATE_INVALID',
      });
    }
    const decision = compileDecision(projectId, capsule);
    await sessions.recordDecision(projectId, {
      type: 'quick_style_extraction',
      summary: capsule.anchorGoal,
      rationale: `由已通过的 Reference Style Capsule ${capsule.sourceRunId} 编译。`,
      outcome: 'confirmed',
      source: 'user',
    });
    await sessions.transition(
      projectId,
      'CREATIVE_DECISION_COMPLETED',
      'Quick Extraction 已进入标准 Creative Decision 流程。',
    );
    const locks = await lockedAssets.compile(projectId);
    const profile = await styles.compile(projectId, decision, {
      colorSystem: { primary: capsule.inheritedStyle.color },
      graphicLanguage: { coreMotifs: capsule.inheritedStyle.graphicLanguage },
      compositionSystem: {
        hierarchy: capsule.inheritedStyle.layoutAndTypography,
        focalPointRules: capsule.inheritedStyle.extensionMechanism,
      },
      materialAndTexture: {
        materials: capsule.inheritedStyle.materialAndPhotography,
      },
      typographyCompatibility: capsule.inheritedStyle.layoutAndTypography,
    });
    const canonResult = await visualMigrationCanons.createOrGet({
      projectId,
      referenceAnchorRunId,
      referencePackId: packResult.manifest.referencePackId,
      capsule,
      styleProfile: profile,
      lockedAssets: locks,
    });
    await sessions.setVisualMigrationReference(projectId, {
      referencePackId: packResult.manifest.referencePackId,
      sourceReferenceAnchorRunId: referenceAnchorRunId,
      sourceFingerprint: packResult.manifest.sourceFingerprint,
    });
    await sessions.setVisualMigrationCanon(projectId, {
      canonId: canonResult.canon.canonId,
      canonFingerprint: canonResult.canon.canonFingerprint,
      sourceFingerprint: canonResult.canon.sourceFingerprint,
      referencePackId: canonResult.canon.source.referencePackId,
    });
    return {
      session: await sessions.create(projectId),
      styleProfile: profile,
      lockedAssets: locks,
      sourceRunId: referenceAnchorRunId,
      projectId,
      referenceAnchorRunId,
      referencePackId: packResult.manifest.referencePackId,
      sourceFingerprint: packResult.manifest.sourceFingerprint,
      visualMigrationCanonId: canonResult.canon.canonId,
      visualMigrationCanonFingerprint: canonResult.canon.canonFingerprint,
      visualMigrationCanonSourceFingerprint: canonResult.canon.sourceFingerprint,
      visualMigrationCanonCreated: canonResult.created,
      creativeDecisionId,
      styleProfileId: profile.id,
      created: packResult.created,
    };
  }

  return { extract };
}

export type QuickStyleExtractionService = ReturnType<typeof createQuickStyleExtractionService>;
