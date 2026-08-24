// sdk/types.ts
//
// 视图模型（VM）— 路线 A / P0 骨架。
//
// 最终职责（§4.2）：
//   - 从 @masterpiece/runtime-core/application-contracts.ts re-export 类型
//   - 加 SDK 包装层（如 ShortChainInputVM vs ShortChainInput wire）
//
// 当前阶段：占位 + 类型契约。零运行时影响。

/**
 * Common operation identifier for SDK telemetry + error correlation.
 * Final shape mirrors the host OperationRegistry op codes.
 */
export type SdkOperationId = string;

/**
 * Marker type — 最终 §4.5 描述的具体 VM 类型在 P1 定义。
 * 这里只放占位骨架，确保 index.ts 的 type re-export 不报"未导出任何类型"。
 */
export interface SdkPlaceholder {
  readonly __sdk_version: '0.0.0-p0-skeleton';
}