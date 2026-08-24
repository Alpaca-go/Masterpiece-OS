// features/short-chain/hooks/useShortChainSession.ts
//
// 路线 A / P1.1 — ShortChain 工作台的会话数据 hook。
// 当前阶段零运行时影响 — 不被 ShortChainPage 装配 (P1.1+ 才接)。
//
// 设计:
//   - 内部包 session / options / referenceAssets 等基础加载态
//   - 提供 loadSession() / refresh() 等命令式动作
//   - 不重复 ShortChainGenerationWorkspace 的 useEffect 链 — 等 P1.5
//     才把 Workspace 的 useEffect 整段迁过来

import { useCallback, useState } from 'react';
import type {
  ShortChainCreativeSession,
} from '@masterpiece/runtime-core/application-contracts.ts';
import type { Family } from '../../../components/shortchain/ShortChainTypes';

/** 占位 TemplateOptions 类型 (P1 起步用，ShortChainGenerationWorkspace 内联定义) */
export interface TemplateOptions {
  [family: string]: { subtypes: string[]; shots: string[] };
}

export interface UseShortChainSessionResult {
  /** 当前 session (含 history / implicitAnchors 等); null = 未加载或加载失败 */
  session: ShortChainCreativeSession | null;
  /** 当前 deliverable family (space / packaging / vi / poster) */
  family: Family;
  /** 可选项 (每个 family 对应的 subtypes / shots) */
  options: TemplateOptions | null;
  /** 加载中 / 出错 */
  loading: boolean;
  error: string;
  /** 重新拉取 session */
  refresh: () => Promise<ShortChainCreativeSession | null>;
  /** 切换 family (P1.1 起步不动, P1.5 接入) */
  setFamily: (next: Family) => void;
}

/**
 * P1.1 起步版 useShortChainSession：
 *   - 仅暴露 session / options / family 三个数据
 *   - refresh() 调用 window.masterpiece.imageGeneration.getShortChain()
 *   - 不重复 ShortChainGenerationWorkspace 的 project context / rebuild 逻辑
 *     (那些在 P1.5 才迁过来, 因为 P1.1 不动 Workspace)
 */
export function useShortChainSession(projectId: string): UseShortChainSessionResult {
  const [session, setSession] = useState<ShortChainCreativeSession | null>(null);
  const [family, setFamily] = useState<Family>('space');
  const [options, setOptions] = useState<TemplateOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (): Promise<ShortChainCreativeSession | null> => {
    if (!window.masterpiece?.imageGeneration) {
      const msg = '客户端安全桥接未就绪';
      setError(msg);
      return null;
    }
    setLoading(true);
    setError('');
    try {
      const next = await window.masterpiece.imageGeneration.getShortChainSession(projectId);
      setSession(next);
      return next;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return {
    session,
    family,
    options,
    loading,
    error,
    refresh,
    setFamily,
  };
}