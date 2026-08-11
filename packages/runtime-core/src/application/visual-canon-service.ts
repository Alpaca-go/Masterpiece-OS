import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  VisualCanon,
  VisualExploration,
} from '@masterpiece/project-contracts/index.ts';
import {
  buildVisualCanon,
  confirmVisualCanon,
  migrateVisualCanon,
  nextVisualCanonVersion,
  validateVisualCanon,
} from '@masterpiece/creative-production-runtime/visual-canon.js';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';
import type { CreativeSessionService } from './creative-session-service.ts';
import type { StyleProfileService } from './style-profile-service.ts';
import type { LockedAssetsService } from './locked-assets-service.ts';
import type { AnchorCandidateService } from './anchor-candidate-service.ts';

async function writeJson(filename: string, value: unknown) {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) throw Object.assign(new Error(`Visual Canon 保存失败：${result.errorMessage}`), {
    code: 'STATE_PERSIST_FAILED',
  });
}

async function readJson<T>(filename: string): Promise<T | null> {
  try { return JSON.parse(await fs.readFile(filename, 'utf8')) as T; } catch { return null; }
}

export function createVisualCanonService(
  projects: ProjectStore,
  sessions: CreativeSessionService,
  styles: StyleProfileService,
  lockedAssets: LockedAssetsService,
  anchors: AnchorCandidateService,
) {
  async function locations(projectId: string) {
    const projectRoot = (await projects.paths(projectId)).root;
    return {
      root: path.join(projectRoot, 'canon'),
      active: path.join(projectRoot, 'canon', 'active-canon.json'),
    };
  }

  async function getActive(projectId: string): Promise<VisualCanon | null> {
    const target = await locations(projectId);
    const pointer = await readJson<{ filename: string }>(target.active);
    if (!pointer) return null;
    const canon = await readJson<VisualCanon>(path.join(target.root, pointer.filename));
    if (!canon) return null;
    const [profiles, session] = await Promise.all([
      styles.list(projectId),
      sessions.create(projectId),
    ]);
    return validateVisualCanon(migrateVisualCanon(canon, {
      styleProfile: profiles.find((profile) =>
        profile.id === canon.styleProfileId && profile.version === canon.styleProfileVersion),
      industryAttributes: [
        session.understanding?.projectIdentity.industry,
        session.projectContext.industry,
      ],
    })) as VisualCanon;
  }

  async function list(projectId: string): Promise<VisualCanon[]> {
    const target = await locations(projectId);
    const files = await fs.readdir(target.root).catch(() => []);
    const [values, profiles, session] = await Promise.all([
      Promise.all(files.filter((file) => /^visual-canon-v.+\.json$/iu.test(file))
        .map((file) => readJson<VisualCanon>(path.join(target.root, file)))),
      styles.list(projectId),
      sessions.create(projectId),
    ]);
    return values.filter((value): value is VisualCanon => Boolean(value))
      .map((value) => validateVisualCanon(migrateVisualCanon(value, {
        styleProfile: profiles.find((profile) =>
          profile.id === value.styleProfileId && profile.version === value.styleProfileVersion),
        industryAttributes: [
          session.understanding?.projectIdentity.industry,
          session.projectContext.industry,
        ],
      })) as VisualCanon)
      .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  }

  async function build(projectId: string, input: {
    primaryCandidateId: string;
    primary?: Record<string, unknown>;
    supporting?: Array<{ candidateId: string; type?: string; role?: string; observations?: unknown }>;
    sharedRules?: string[];
    variationRules?: string[];
  }): Promise<VisualCanon> {
    const [styleProfile, locks, active, primaryAnchor, session] = await Promise.all([
      styles.getActive(projectId),
      lockedAssets.list(projectId),
      getActive(projectId),
      anchors.get(projectId, input.primaryCandidateId),
      sessions.create(projectId),
    ]);
    if (!styleProfile || !primaryAnchor) {
      throw Object.assign(new Error('Visual Canon 缺少 Style Profile 或 Primary Anchor。'), {
        code: 'VISUAL_CANON_INPUT_MISSING',
      });
    }
    const supporting = await Promise.all((input.supporting ?? []).map(async (item) => ({
      ...item,
      anchor: await anchors.get(projectId, item.candidateId),
    })));
    const version = active ? nextVisualCanonVersion(active.version) : '1.0.0';
    const canon = buildVisualCanon({
      projectId,
      version,
      styleProfile,
      lockedAssets: locks,
      primary: { ...(input.primary ?? {}), anchor: primaryAnchor },
      supporting,
      sharedRules: input.sharedRules,
      variationRules: input.variationRules,
      industryAttributes: [
        session.understanding?.projectIdentity.industry,
        session.projectContext.industry,
      ],
    }) as VisualCanon;
    const target = await locations(projectId);
    await fs.mkdir(target.root, { recursive: true });
    if (active) await writeJson(path.join(target.root, `visual-canon-v${active.version}.json`), {
      ...active,
      status: 'superseded',
      updatedAt: canon.updatedAt,
    });
    const filename = `visual-canon-v${canon.version}.json`;
    await writeJson(path.join(target.root, filename), canon);
    await writeJson(target.active, { canonId: canon.id, version: canon.version, filename, updatedAt: canon.updatedAt });
    await sessions.transition(projectId, 'CANON_BUILDING', `Visual Canon ${canon.version} 已构建，等待确认。`);
    return canon;
  }

  async function buildFromExploration(projectId: string, input: {
    exploration: VisualExploration;
    observations?: {
      colors?: string[];
      materials?: string[];
      lighting?: string[];
      graphicLanguage?: string[];
      compositionDensity?: string;
      spatialStructure?: string;
      displayStrategy?: string;
    };
    sharedRules?: string[];
    variationRules?: string[];
  }): Promise<VisualCanon> {
    const exploration = input.exploration;
    const selected = exploration.concepts.find((item) =>
      item.id === exploration.selectedConceptId);
    if (exploration.projectId !== projectId
      || exploration.status !== 'selected'
      || !selected
      || selected.status !== 'generated') {
      throw Object.assign(new Error('Visual Canon 需要当前项目中 Designer-selected Concept。'), {
        code: 'VISUAL_CONCEPT_NOT_SELECTED',
      });
    }
    const [styleProfile, locks, active, session] = await Promise.all([
      styles.getActive(projectId),
      lockedAssets.list(projectId),
      getActive(projectId),
      sessions.create(projectId),
    ]);
    if (!styleProfile
      || styleProfile.id !== exploration.styleProfileId
      || styleProfile.version !== exploration.styleProfileVersion) {
      throw Object.assign(new Error('Designer Selection 绑定的 Style Profile 已过期。'), {
        code: 'VISUAL_EXPLORATION_STALE',
      });
    }
    const version = active ? nextVisualCanonVersion(active.version) : '1.0.0';
    const canon = buildVisualCanon({
      projectId,
      version,
      styleProfile,
      lockedAssets: locks,
      sourceExplorationId: exploration.id,
      selectedConceptId: selected.id,
      primary: {
        concept: selected,
        explorationId: exploration.id,
        role: `Designer-selected ${selected.title}`,
        observations: {
          colors: styleProfile.colorSystem?.primary ?? [],
          materials: styleProfile.materialAndTexture?.materials ?? [],
          lighting: [styleProfile.lightingSystem?.type].filter(Boolean),
          graphicLanguage: styleProfile.graphicLanguage?.coreMotifs ?? [],
          compositionDensity: styleProfile.compositionSystem?.density,
          spatialStructure: selected.type === 'space' ? selected.objective : undefined,
          displayStrategy: selected.objective,
          preservedLockedAssetIds: locks.map((item) => item.id),
          ...input.observations,
        },
      },
      sharedRules: [
        selected.objective,
        ...(input.sharedRules ?? styleProfile.promptComponents?.required ?? []),
      ],
      variationRules: input.variationRules,
      industryAttributes: [
        session.understanding?.projectIdentity.industry,
        session.projectContext.industry,
      ],
      coreVisualMetaphor: exploration.selection?.rationale,
    }) as VisualCanon;
    const target = await locations(projectId);
    await fs.mkdir(target.root, { recursive: true });
    if (active) {
      await writeJson(path.join(target.root, `visual-canon-v${active.version}.json`), {
        ...active,
        status: 'superseded',
        updatedAt: canon.updatedAt,
      });
    }
    const filename = `visual-canon-v${canon.version}.json`;
    await writeJson(path.join(target.root, filename), canon);
    await writeJson(target.active, {
      canonId: canon.id,
      version: canon.version,
      filename,
      updatedAt: canon.updatedAt,
    });
    await sessions.transition(
      projectId,
      'CANON_BUILDING',
      `已从 Designer Selection 建立 Visual Canon ${canon.version}。`,
    );
    return canon;
  }

  async function confirm(projectId: string, canonId: string): Promise<VisualCanon> {
    const candidates = await list(projectId);
    const canon = candidates.find((item) => item.id === canonId);
    if (!canon) throw Object.assign(new Error('Visual Canon 不存在。'), { code: 'VISUAL_CANON_MISSING' });
    const confirmed = confirmVisualCanon(canon) as VisualCanon;
    const target = await locations(projectId);
    const filename = `visual-canon-v${confirmed.version}.json`;
    await writeJson(path.join(target.root, filename), confirmed);
    await writeJson(target.active, {
      canonId: confirmed.id,
      version: confirmed.version,
      filename,
      updatedAt: confirmed.updatedAt,
    });
    await sessions.setActiveEntity(projectId, 'visual_canon', confirmed);
    await sessions.transition(projectId, 'VISUAL_CANON_CONFIRMED', `Visual Canon ${confirmed.version} 已确认。`);
    return confirmed;
  }

  return { build, buildFromExploration, confirm, getActive, list };
}

export type VisualCanonService = ReturnType<typeof createVisualCanonService>;
