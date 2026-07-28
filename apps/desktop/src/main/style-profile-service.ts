import fs from 'node:fs/promises';
import path from 'node:path';
import type { StyleProfile } from '../../../../packages/project-contracts/src/index.ts';
import {
  compileStyleProfile,
  nextStyleProfileVersion,
  validateStyleProfile,
} from '../../../../packages/creative-production-runtime/src/style-profile.js';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';
import type { CreativeSessionService } from './creative-session-service.ts';

async function writeJson(filename: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) {
    throw Object.assign(new Error(`Style Profile 保存失败：${result.errorMessage}`), { code: 'STATE_PERSIST_FAILED' });
  }
}

async function readJson<T>(filename: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filename, 'utf8')) as T;
  } catch {
    return null;
  }
}

export function createStyleProfileService(projects: ProjectStore, sessions: CreativeSessionService) {
  async function locations(projectId: string) {
    const root = (await projects.paths(projectId)).root;
    return {
      root: path.join(root, 'style'),
      active: path.join(root, 'style', 'active-profile.json'),
    };
  }

  async function getActive(projectId: string): Promise<StyleProfile | null> {
    const target = await locations(projectId);
    const pointer = await readJson<{ profileId: string; filename: string }>(target.active);
    if (!pointer) return null;
    const profile = await readJson<StyleProfile>(path.join(target.root, pointer.filename));
    return profile ? validateStyleProfile(profile) as StyleProfile : null;
  }

  async function list(projectId: string): Promise<StyleProfile[]> {
    const target = await locations(projectId);
    const files = await fs.readdir(target.root).catch(() => []);
    const profiles = await Promise.all(files
      .filter((filename) => /^style-profile-v.+\.json$/i.test(filename))
      .map((filename) => readJson<StyleProfile>(path.join(target.root, filename))));
    return profiles.filter((item): item is StyleProfile => Boolean(item))
      .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  }

  async function compile(projectId: string, creativeDecision: unknown, overrides?: unknown): Promise<StyleProfile> {
    const active = await getActive(projectId);
    const version = active ? nextStyleProfileVersion(active.version, 'minor') : '1.0.0';
    const profile = compileStyleProfile({
      creativeDecision,
      version,
      overrides,
    }) as StyleProfile;
    if (profile.projectId !== projectId) {
      throw Object.assign(new Error('Creative Decision 与项目不匹配。'), { code: 'STYLE_PROFILE_INVALID' });
    }
    const target = await locations(projectId);
    await fs.mkdir(target.root, { recursive: true });
    const filename = `style-profile-v${profile.version}.json`;
    if (active) {
      await writeJson(
        path.join(target.root, `style-profile-v${active.version}.json`),
        { ...active, status: 'superseded', updatedAt: profile.updatedAt },
      );
    }
    await writeJson(path.join(target.root, filename), profile);
    await writeJson(target.active, {
      profileId: profile.id,
      version: profile.version,
      filename,
      updatedAt: profile.updatedAt,
    });
    await sessions.setActiveEntity(projectId, 'style_profile', profile);
    const session = await sessions.create(projectId);
    if (session.workflowState === 'CREATIVE_DECISION_COMPLETED') {
      await sessions.transition(projectId, 'STYLE_PROFILE_CREATED', `Style Profile ${profile.version} 已创建。`);
    }
    return profile;
  }

  async function confirm(projectId: string, profileId: string): Promise<StyleProfile> {
    const profiles = await list(projectId);
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) throw Object.assign(new Error('Style Profile 不存在。'), { code: 'STYLE_PROFILE_INVALID' });
    const confirmed = validateStyleProfile({ ...profile, status: 'confirmed', updatedAt: new Date().toISOString() }) as StyleProfile;
    const target = await locations(projectId);
    const filename = `style-profile-v${confirmed.version}.json`;
    await writeJson(path.join(target.root, filename), confirmed);
    await writeJson(target.active, {
      profileId: confirmed.id,
      version: confirmed.version,
      filename,
      updatedAt: confirmed.updatedAt,
    });
    await sessions.setActiveEntity(projectId, 'style_profile', confirmed);
    return confirmed;
  }

  return { compile, confirm, getActive, list };
}

export type StyleProfileService = ReturnType<typeof createStyleProfileService>;
