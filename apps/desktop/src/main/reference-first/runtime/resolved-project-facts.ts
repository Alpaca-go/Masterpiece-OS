import type {
  CurrentProjectProfile,
  ProjectRuntimeContext,
  ResolvedFact,
  ResolvedProjectFacts
} from '../../../shared/types.ts';

/** §15 规范落盘路径（相对 run 根目录）。 */
export const RESOLVED_PROJECT_FACTS_PATH = 'runtime/resolved-project-facts.json';

function fact<T>(
  value: T | undefined,
  source: ResolvedFact<T>['source'],
  status: ResolvedFact<T>['status']
): ResolvedFact<T> | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string' && !value.trim()) return undefined;
  if (Array.isArray(value) && value.length === 0) return undefined;
  return { value, source, status };
}

/**
 * §15 Resolved Project Facts 单一来源。
 * 解析优先级：用户显式输入 > 项目运行期元数据（用户提供）> 模型分析结果。
 * 审计报告、Generation Context Manifest、Runtime Fact Validator、Generation Brief、
 * UI 项目摘要都只能读取该产物，禁止各自读取不同来源导致前后矛盾。
 */
export function resolveProjectFacts(input: {
  runtime: ProjectRuntimeContext;
  profile?: CurrentProjectProfile;
  /** 用户显式提供的目标用户（优先级最高）。 */
  targetAudience?: string[];
}): ResolvedProjectFacts {
  const { runtime, profile } = input;
  return {
    brandName:
      fact(runtime.brandName, 'project_metadata', 'confirmed')
      ?? fact(profile?.brandName, 'model_analysis', 'inferred'),
    industry:
      fact(runtime.industry, 'project_metadata', 'confirmed')
      ?? fact(profile?.industry, 'model_analysis', 'inferred'),
    products:
      fact(runtime.productFacts, 'project_metadata', 'confirmed')
      ?? fact(profile?.coreProducts, 'model_analysis', 'inferred'),
    targetAudience:
      fact(input.targetAudience, 'user_input', 'confirmed')
      ?? fact(profile?.targetAudience, 'model_analysis', 'inferred'),
    positioning: fact(profile?.brandPositioning, 'model_analysis', 'inferred'),
    resolvedAt: new Date().toISOString()
  };
}

/** §15 审计报告项目摘要编译器：只读取 Resolved Project Facts，不再直接读取模型原始结果。 */
export function compileAuditProjectSummary(facts: ResolvedProjectFacts): {
  brandName?: string;
  industry?: string;
  products?: string[];
  targetAudience?: string[];
  positioning?: string;
} {
  return {
    brandName: facts.brandName?.value,
    industry: facts.industry?.value,
    products: facts.products?.value,
    targetAudience: facts.targetAudience?.value,
    positioning: facts.positioning?.value
  };
}

/** §15 Runtime Fact 校验读取同一份 Resolved Facts（与审计报告一致）。 */
export function validateRuntimeFacts(facts: ResolvedProjectFacts): {
  brandName?: string;
  targetAudience?: string[];
  targetAudienceAvailable: boolean;
  factsResolved: boolean;
} {
  return {
    brandName: facts.brandName?.value,
    targetAudience: facts.targetAudience?.value,
    targetAudienceAvailable: Boolean(facts.targetAudience?.value.length),
    factsResolved: Boolean(facts.brandName || facts.products || facts.industry)
  };
}
