// sdk/operations/short-chain.ts
//
// Short-Chain SDK operations — 路线 A / P0 骨架 (§4.5)
//
// 文档契约（§4.5）：
//   - compile(input: CompileShortChainInput): Promise<CompileShortChainResult>
//   - start(sessionId: string): Promise<StartResult>
//   - getSession(sessionId: string): Promise<ShortChainSession>
//   - confirmDirection / confirmOutput / revokeOutput / continueSameType
//   - subscribeEvents(sessionId, cb): () => void
//
// 17 个 channel 名（§4.3）最终会通过 client.ts 路由到这里，**不要改名**。
//
// 当前阶段：零运行时影响，仅类型占位。App.tsx 完全不动。

import type { SdkOperationId } from '../types';
import type { SdkEventChannel } from '../events';

/**
 * Marker interface — final method signatures in P1.
 * 当前只占位，不允许 App.tsx import 这个 SDK（还没接入 web-api.ts）。
 */
export interface ShortChainSdk {
  /** Compile a Short-Chain task from a structured contract. */
  // compile(input: CompileShortChainInput): Promise<CompileShortChainResult>;
  /** Start a Short-Chain task after validation. */
  // start(sessionId: string): Promise<StartResult>;
  /** Read the current session snapshot. */
  // getSession(sessionId: string): Promise<ShortChainSession>;
  /** Confirm a user-chosen direction. */
  // confirmDirection(sessionId: string, directionId: string): Promise<void>;
  /** Confirm a generated output as continuation source. */
  // confirmOutput(sessionId: string, outputId: string): Promise<void>;
  /** Revoke a confirmed continuation source. */
  // revokeOutput(sessionId: string, outputId: string): Promise<void>;
  /** Continue same deliverable type from a confirmed output. */
  // continueSameType(sessionId: string, outputId: string): Promise<StartResult>;
  /** Subscribe to progress events. Returns unsubscribe. */
  subscribeEvents(sessionId: string, cb: (event: unknown) => void): () => void;
}

// P0 占位 export — 让类型契约明确出现在 index.ts 之外
export const __P0_SKELETON__: true = true;
export type __P0_OPERATION_ID__ = SdkOperationId;
export type __P0_EVENT_CHANNEL__ = SdkEventChannel<unknown>;