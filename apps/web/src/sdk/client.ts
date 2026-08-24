// sdk/client.ts
//
// 统一 RPC 客户端封装 — 路线 A / P0 骨架。
//
// 最终职责（§4.1）：
//   - 替换 web-api.ts 的全局 `window.masterpiece` 桥
//   - 统一 fetch + EventSource 通道
//   - 把 Host RPC 错误规整为 SdkError（见 errors.ts）
//
// 当前阶段：零运行时影响，仅占位 + 顶层契约。App.tsx 完全不动。

/**
 * SDK client configuration.
 * Final shape 在 P1 实施时确定；P0 仅定义占位类型。
 */
export interface SdkClientConfig {
  /** Node Web Host RPC URL, e.g. http://127.0.0.1:4317/ */
  rpcUrl: string;
  /** Vite dev server origin that should be allowed to embed the host. */
  allowedOrigin: string;
  /** Default request timeout in ms. */
  timeoutMs?: number;
}

/**
 * Stub — actual implementation lands in P1.
 * Will replace the `window.masterpiece.*` global with a typed, promise-based API.
 */
export interface SdkClient {
  readonly config: SdkClientConfig;
}

// 占位 export — 让 index.ts 的类型 re-export 不报"未使用"警告
export const __P0_SKELETON__: true = true;