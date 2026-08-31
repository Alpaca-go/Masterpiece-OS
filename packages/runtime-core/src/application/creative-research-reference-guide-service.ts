import { randomUUID } from 'node:crypto';
import type { CreativeResearchReferenceGuide, ReferenceTerritory, VisualReferenceKeywordGroup } from './creative-research/contracts.ts';
import type { CreativeResearchPlanRepository, CreativeResearchReferenceGuideRepository, CreativeResearchSessionRepository, DesignBriefRepository } from './creative-research/ports.ts';

const OBSERVE: Record<ReferenceTerritory['kind'], string[]> = {
  INDUSTRY: ['专业可信度', '信息层级', '品牌与行业属性的平衡'],
  POSITIONING: ['留白与秩序', '材质与细节', '成熟品牌气质'],
  CROSS_CATEGORY: ['系列化表达', '产品与应用方式', '可迁移的视觉语言'],
  CUSTOM: ['视觉原则', '可迁移元素', '与项目的适配边界'],
};

export function createCreativeResearchReferenceGuideService(options: {
  sessions: CreativeResearchSessionRepository;
  briefs: DesignBriefRepository;
  plans: CreativeResearchPlanRepository;
  guides: CreativeResearchReferenceGuideRepository;
  createPlan(sessionId: string, input: { profileId: string }): Promise<{ visualReferencePlan?: { groups: VisualReferenceKeywordGroup[] } }>;
  now?: () => string;
  createId?: () => string;
}) {
  const now = options.now || (() => new Date().toISOString());
  const createId = options.createId || randomUUID;
  async function getReferenceGuide(sessionId: string): Promise<CreativeResearchReferenceGuide | null> {
    const [session, brief, guide] = await Promise.all([
      options.sessions.get(sessionId), options.briefs.getActiveRevision(sessionId), options.guides.get(sessionId),
    ]);
    if (!session) throw new Error(`Creative Research Session 不存在：${sessionId}`);
    if (!guide) return null;
    return session.status === 'INTAKE' && guide.briefRevisionId !== brief?.id ? null : guide;
  }
  async function generateReferenceGuide(sessionId: string, input: { profileId: string }): Promise<CreativeResearchReferenceGuide> {
    const session = await options.sessions.get(sessionId);
    if (!session) throw new Error(`Creative Research Session 不存在：${sessionId}`);
    if (session.status !== 'INTAKE') throw new Error('进入 RESEARCH 后 Reference Guide 已冻结');
    const brief = await options.briefs.getActiveRevision(sessionId);
    if (!brief) throw new Error('生成 Reference Guide 前必须先生成 Design Brief');
    const existing = await options.guides.get(sessionId);
    if (existing?.briefRevisionId === brief.id) return existing;
    const plan = await options.createPlan(sessionId, input);
    const groups = plan.visualReferencePlan?.groups || [];
    if (groups.length < 2 || groups.length > 4) throw new Error('模型没有生成有效的 Reference Guide Territory');
    const guide: CreativeResearchReferenceGuide = {
      id: createId(), sessionId, briefRevisionId: brief.id,
      territories: groups.map((group) => ({
        id: createId(), kind: group.kind, title: group.title,
        keywords: [...group.keywords], rationale: group.rationale,
        observe: [...OBSERVE[group.kind]],
        suggestedQueries: group.keywords.flatMap((keyword) => [keyword, `${keyword} branding`]).slice(0, 4),
      })),
      createdAt: now(),
    };
    return options.guides.save(guide);
  }
  async function startResearch(sessionId: string) {
    const [session, brief, guide] = await Promise.all([
      options.sessions.get(sessionId), options.briefs.getActiveRevision(sessionId), options.guides.get(sessionId),
    ]);
    if (!session) throw new Error(`Creative Research Session 不存在：${sessionId}`);
    if (session.status !== 'INTAKE') throw new Error('只有 INTAKE Session 可以开始精选参考研究');
    if (!brief || !guide || guide.briefRevisionId !== brief.id) throw new Error('开始研究前必须确认当前 Brief Revision 的 Reference Guide');
    return options.sessions.save({ ...session, status: 'RESEARCH', updatedAt: now() });
  }
  return Object.freeze({ generateReferenceGuide, getReferenceGuide, startResearch });
}

export type CreativeResearchReferenceGuideService = ReturnType<typeof createCreativeResearchReferenceGuideService>;
