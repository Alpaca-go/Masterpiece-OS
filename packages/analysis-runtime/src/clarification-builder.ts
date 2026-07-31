import type {
  ClarificationQuestion,
  MissingFieldIssue,
} from './contracts.ts';

interface ClarificationTemplate {
  question: string;
  options?: ClarificationQuestion['options'];
}

const TEMPLATES: Record<string, ClarificationTemplate> = {
  BRAND_NAME_MISSING: {
    question: '当前资料无法确认需要准确使用的品牌名称。请提供正式品牌名称。',
  },
  INDUSTRY_MISSING: {
    question: '当前资料无法确认项目所属的真实业务类别。请补充项目实际提供的产品或服务。',
  },
  BRAND_ROLE_FACT_MISSING: {
    question: '当前资料没有说明品牌在顾客体验中承担的真实角色。请用一句话说明品牌主要为谁解决什么问题。',
  },
  PACKAGING_PRODUCT_ROLE_MISSING: {
    question: '当前资料未说明包装内实际放置的产品。本次要设计的是品牌礼赠空盒概念，还是已有明确产品套装？',
    options: [
      { id: 'concept_empty', label: '品牌礼赠空盒概念' },
      { id: 'provide_product', label: '已有明确产品，我补充产品信息' },
      { id: 'skip_packaging', label: '暂不生成包装' },
    ],
  },
  PACKAGING_STRUCTURE_EVIDENCE_MISSING: {
    question: '当前资料没有可确认的包装结构。你希望补充现有盒型和尺寸，还是先暂停包装生成？',
    options: [
      { id: 'provide_structure', label: '补充现有盒型和尺寸' },
      { id: 'skip_packaging', label: '暂不生成包装' },
    ],
  },
  PACKAGING_PRODUCT_ARRANGEMENT_MISSING: {
    question: '当前资料没有说明真实产品在包装内的数量与摆放关系。请补充产品清单和必须保持的位置关系。',
  },
  LOCKED_ASSET_CONFLICT: {
    question: '当前生成要求与已锁定的品牌资产发生冲突。请确认保留锁定资产，或先在项目设置中明确解除锁定。',
    options: [
      { id: 'keep_locked', label: '保留锁定资产' },
      { id: 'review_locks', label: '检查并调整锁定设置' },
    ],
  },
  REAL_PRODUCT_FACT_MISSING: {
    question: '当前资料不足以确认需要准确呈现的真实产品。请补充产品名称、外观和必要规格。',
  },
  LEGAL_CLAIM_EVIDENCE_MISSING: {
    question: '当前资料没有支持相关声明的正式依据。请提供经确认的法务文案，或移除该声明。',
  },
};

export function buildClarificationQuestions(
  issues: MissingFieldIssue[],
  limit = 3,
): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [];
  const grouped = new Map<string, MissingFieldIssue[]>();
  issues.filter((issue) => issue.severity === 'requires_confirmation')
    .forEach((issue) => {
      const key = issue.code;
      grouped.set(key, [...(grouped.get(key) ?? []), issue]);
    });

  for (const [code, related] of grouped) {
    const template = TEMPLATES[code] ?? {
      question: '当前资料缺少继续生成所需的真实信息。请补充或确认相关项目事实。',
    };
    questions.push({
      code,
      fieldPaths: related.map((issue) => issue.path),
      question: template.question,
      ...(template.options ? { options: structuredClone(template.options) } : {}),
    });
    if (questions.length >= Math.max(1, Math.min(3, limit))) break;
  }
  return questions;
}
