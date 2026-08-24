// sdk/events.ts
//
// EventSource typed channels — 路线 A / P0 骨架。
//
// 最终职责（§4.2 + §4.5）：
//   - 包 EventSource，统一重连 + 错误处理
//   - 把 host progress events 规整为强类型 ShortChainEvent 等
//   - 提供 unsubscribe 闭包
//
// 当前阶段：占位 + 顶层类型契约。零运行时影响。

/**
 * Marker type — final subscription API in P1 (§4.5)。
 * 完整事件类型在 P1 实施时从 @masterpiece/runtime-core 重新导出 + 包装。
 */
export interface ShortChainEventPlaceholder {
  readonly __type: 'short-chain-event';
}

/**
 * Subscribable event channel — final API:
 *   `sdkEvents.shortChain(sessionId, (event) => ...): () => void`
 * P0 仅占位，零运行时影响。
 */
export interface SdkEventChannel<TEvent> {
  subscribe(handler: (event: TEvent) => void): () => void;
}