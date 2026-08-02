/**
 * 生图功能：上游上下文加载（§7）。
 *
 * 从已批准的 Reference Anchor 运行 + 当前项目 Resolved Context 组装 GenerationContext：
 *   - resolvedContext：projects/<projectId>/outputs/resolved-project-context.json
 *   - capsule + brief + run.json：<dataPath>/reference-runs/<referenceRunId>/...
 *   - references：reference_style（参考图 input/reference-assets）+ current_project_logo（项目锁定 Logo 资产）
 *
 * 本加载器只做文件读取与必要 sha256 计算，不调用任何模型（§7.2）。
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  ImageGenerationReference,
  ReferenceStyleCapsule,
  ResolvedProjectContext,
} from '../../shared/types';
import type { ProjectStore } from '../project-store.ts';
import { resolveProjectRoot } from './paths.ts';
import { resolveProjectAssetPath } from './context-loaders/loader-utils.ts';

export interface GenerationContext {
  resolvedContext: ResolvedProjectContext;
  capsule: ReferenceStyleCapsule;
  anchorBriefMarkdown: string;
  anchorApproved: boolean;
  references: ImageGenerationReference[];
}

export interface LoadContextInput {
  referenceRunId: string;
  projectId: string;
  /** 显式 Logo 资产路径（Headless CLI 可用 --logo 指定）。 */
  logoAssetPath?: string;
}

async function readJsonSafe<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

async function sha256File(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function createFileContextLoader(
  dataPath: string,
  projects?: ProjectStore,
) {
  const refRoot = (runId: string) => path.join(path.resolve(dataPath), 'reference-runs', runId);

  return {
    async loadContext(input: LoadContextInput): Promise<GenerationContext> {
      const { referenceRunId, projectId, logoAssetPath } = input;
      const root = refRoot(referenceRunId);
      const projectRoot = await resolveProjectRoot(dataPath, projectId);

      const capsule = await readJsonSafe<ReferenceStyleCapsule>(
        path.join(root, 'outputs', 'reference-style-capsule.json'),
      );
      if (!capsule) {
        throw new Error(`Reference Anchor 运行 ${referenceRunId} 缺少参考风格胶囊（outputs/reference-style-capsule.json）。`);
      }
      const runRecord = await readJsonSafe<{ decision?: string; status?: string }>(
        path.join(root, 'runtime', 'run.json'),
      ).catch(() => null);
      const anchorApproved = Boolean(
        runRecord && runRecord.decision === 'approved' && runRecord.status === 'completed',
      );
      const brief = await fs
        .readFile(path.join(root, 'outputs', 'Anchor-Generation-Brief.md'), 'utf8')
        .catch(() => '');

      const resolvedContext = await readJsonSafe<ResolvedProjectContext>(
        path.join(projectRoot, 'outputs', 'resolved-project-context.json'),
      );
      if (!resolvedContext) {
        throw new Error(`项目 ${projectId} 缺少 Resolved Context（outputs/resolved-project-context.json）。请先完成三大上游功能合并。`);
      }

      const references: ImageGenerationReference[] = [];

      // 1. reference_style：参考图目录
      const assetsDir = path.join(root, 'input', 'reference-assets');
      const assetEntries = await fs.readdir(assetsDir, { withFileTypes: true }).catch(() => []);
      for (const entry of assetEntries.filter((e) => e.isFile())) {
        const localPath = path.join(assetsDir, entry.name);
        let hash = '';
        try {
          hash = await sha256File(localPath);
        } catch {
          hash = crypto.createHash('sha256').update(entry.name).digest('hex');
        }
        references.push({
          assetId: `ref-${entry.name}`,
          role: 'reference_style',
          localPath,
          sha256: hash,
          source: 'reference_anchor_run',
          includeReason: '参考风格图（仅继承其视觉机制，不得迁移参考品牌身份）',
        });
      }

      // 2. current_project_logo：项目锁定的 Logo 资产
      const logoAssetId = resolvedContext.lockedAssets?.logoAssetIds?.[0];
      let logoPath = logoAssetPath;
      if (!logoPath && logoAssetId && projects) {
        const project = await projects.get(projectId).catch(() => null);
        const asset = project?.assets?.find((a) => a.id === logoAssetId && a.status === 'ready');
        if (asset?.relativePath) {
          logoPath = resolveProjectAssetPath(projectRoot, asset.relativePath);
        }
      }
      // Headless（无 Electron ProjectStore）时，直接读 project.json 解析 Logo 资产
      if (!logoPath && logoAssetId && !projects) {
        const record = await readJsonSafe<{ assets?: Array<{ id: string; status?: string; relativePath?: string }> }>(
          path.join(projectRoot, 'project.json'),
        );
        const asset = record?.assets?.find((a) => a.id === logoAssetId && a.status === 'ready');
        if (asset?.relativePath) {
          logoPath = resolveProjectAssetPath(projectRoot, asset.relativePath);
        }
      }
      if (logoPath) {
        let hash = '';
        try {
          hash = await sha256File(logoPath);
        } catch {
          hash = crypto.createHash('sha256').update(logoPath).digest('hex');
        }
        references.push({
          assetId: logoAssetId ? `logo-${logoAssetId}` : `logo-${path.basename(logoPath)}`,
          role: 'current_project_logo',
          localPath: logoPath,
          sha256: hash,
          source: 'project_visual_context',
          includeReason: '当前项目锁定 Logo（品牌身份，必须在画面中正确呈现）',
        });
      }

      return { resolvedContext, capsule, anchorBriefMarkdown: brief, anchorApproved, references };
    },
  };
}

export type FileContextLoader = ReturnType<typeof createFileContextLoader>;
