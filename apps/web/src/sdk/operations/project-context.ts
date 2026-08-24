// sdk/operations/project-context.ts
//
// Project Context SDK operations — 路线 A / P0 骨架 (§4.3)
//
// 文档契约（§4.3）：
//   - project-context:get-generation       → 读 generation
//   - project-context:rebuild-generation   → 重建
//   - project-context:generation-readiness → 读 readiness
//
// 当前阶段：占位 + 类型契约。零运行时影响。

/**
 * Marker interface — final method signatures in P1.
 */
export interface ProjectContextSdk {
  // getGeneration(projectId: string): Promise<...>;
  // rebuildGeneration(projectId: string): Promise<...>;
  // getGenerationReadiness(projectId: string): Promise<...>;
}

export const __P0_SKELETON__: true = true;