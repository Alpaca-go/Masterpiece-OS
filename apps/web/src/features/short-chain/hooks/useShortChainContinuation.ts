// features/short-chain/hooks/useShortChainContinuation.ts
//
// 路线 A / P1.4 — ShortChain 工作台的"空间延展" (Continuation) 状态。
// 覆盖 ShortChainGenerationWorkspace 中 6 个 useState + 3 个 action:
//
//   confirmedOutputs            useState<Record<string, ShortChainConfirmedGeneratedOutput>>({}) line 150
//   continuationPanelOpen       useState(false)                                    line 151
//   continuationSource          useState<ShortChainConfirmedGeneratedOutput | null> line 152
//   continuationTargetScene     useState<string | null>                            line 153
//   continuationCustomDescription useState('')                                     line 154
//   continuationRequirement      useState('')                                     line 155
//   continuationBusy             useState(false)                                    line 156
//
//   openContinuation(runId, imageId)   line 244-262
//   refreshConfirmedOutputs()           line 264-268
//   revokeContinuation(assetId)         line 270-284
//
// 当前阶段零运行时影响 — 不被任何组件 import (P1.5 才接 DecisionStream)。

import { useCallback, useState } from 'react';
import type {
  ShortChainConfirmedGeneratedOutput,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { cleanError } from '../../../utils';

export interface UseShortChainContinuationResult {
  // 6 个 state
  confirmedOutputs: Record<string, ShortChainConfirmedGeneratedOutput>;
  continuationPanelOpen: boolean;
  continuationSource: ShortChainConfirmedGeneratedOutput | null;
  continuationTargetScene: string | null;
  continuationCustomDescription: string;
  continuationRequirement: string;
  continuationBusy: boolean;

  // 派生
  /** 当前确认图中, 第一张是此 imageId 的输出 (用于 UI 高亮) */
  isConfirmed: (runId: string, imageId: string) => boolean;

  // 动作
  /** 打开延展面板, 先调 confirmShortChainGeneratedOutput IPC */
  openContinuation: (projectId: string, runId: string, imageId: string) => Promise<void>;
  /** 重新拉取 confirmedOutputs 列表 */
  refreshConfirmedOutputs: (projectId: string) => Promise<void>;
  /** 撤销确认 (revokeShortChainGeneratedOutput) */
  revokeContinuation: (projectId: string, assetId: string) => Promise<void>;
  /** 设置延展目标场景 (custom 时传 'custom') */
  setContinuationTargetScene: (scene: string | null) => void;
  setContinuationCustomDescription: (desc: string) => void;
  setContinuationRequirement: (req: string) => void;
  /** 关闭面板 */
  closeContinuation: () => void;

  // 业务提示
  notice: string;
  error: string;
}

/**
 * useShortChainContinuation — 空间延展状态。
 *
 * 边界:
 *   - 不含 submitContinuation() — 该动作需要 useShortChainBrief + useShortChainGeneration
 *     配合, 由 ShortChainPage 顶层编排 (P1.5 才接)
 *   - 不接 reference-asset 状态 (留空数组, P1.5 才接)
 */
export function useShortChainContinuation(): UseShortChainContinuationResult {
  const [confirmedOutputs, setConfirmedOutputs] = useState<
    Record<string, ShortChainConfirmedGeneratedOutput>
  >({});
  const [continuationPanelOpen, setContinuationPanelOpen] = useState(false);
  const [continuationSource, setContinuationSource] =
    useState<ShortChainConfirmedGeneratedOutput | null>(null);
  const [continuationTargetScene, setContinuationTargetScene] = useState<string | null>(null);
  const [continuationCustomDescription, setContinuationCustomDescription] = useState('');
  const [continuationRequirement, setContinuationRequirement] = useState('');
  const [continuationBusy, setContinuationBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const isConfirmed = useCallback((runId: string, _imageId: string): boolean => {
    // imageId 暂不参与判定 — ShortChainConfirmedGeneratedOutput 不带 imageId 字段
    // (与 Workspace line 408-411 isConfirmedSource 行为一致)
    void _imageId;
    return Object.values(confirmedOutputs).some(
      (o) => o.sourceRunId === runId && o.confirmationState === 'confirmed',
    );
  }, [confirmedOutputs]);

  const refreshConfirmedOutputs = useCallback(async (projectId: string): Promise<void> => {
    if (!window.masterpiece?.imageGeneration) {
      setError('客户端安全桥接未就绪');
      return;
    }
    setError('');
    try {
      const outputs = await window.masterpiece.imageGeneration
        .getShortChainConfirmedGeneratedOutputs(projectId);
      setConfirmedOutputs(outputs);
    } catch (reason) {
      setError(cleanError(reason));
    }
  }, []);

  const openContinuation = useCallback(async (
    projectId: string,
    runId: string,
    imageId: string,
  ): Promise<void> => {
    if (!window.masterpiece?.imageGeneration) {
      setError('客户端安全桥接未就绪');
      return;
    }
    setError('');
    try {
      const confirmed = await window.masterpiece.imageGeneration
        .confirmShortChainGeneratedOutput(projectId, runId, imageId);
      await refreshConfirmedOutputs(projectId);
      setContinuationSource(confirmed);
      setContinuationTargetScene(null);
      setContinuationCustomDescription('');
      setContinuationRequirement('');
      setContinuationPanelOpen(true);
      setNotice('已将这张图确认为空间延展方向。');
    } catch (reason) {
      setError(cleanError(reason));
    }
  }, [refreshConfirmedOutputs]);

  const revokeContinuation = useCallback(async (
    projectId: string,
    assetId: string,
  ): Promise<void> => {
    if (!window.masterpiece?.imageGeneration) {
      setError('客户端安全桥接未就绪');
      return;
    }
    setError('');
    try {
      await window.masterpiece.imageGeneration
        .revokeShortChainGeneratedOutput(projectId, assetId);
      await refreshConfirmedOutputs(projectId);
      if (continuationSource?.assetId === assetId) {
        setContinuationPanelOpen(false);
        setContinuationSource(null);
        setContinuationTargetScene(null);
      }
      setNotice('已取消该方向的延展确认。');
    } catch (reason) {
      setError(cleanError(reason));
    }
  }, [refreshConfirmedOutputs, continuationSource?.assetId]);

  const closeContinuation = useCallback(() => {
    setContinuationPanelOpen(false);
  }, []);

  return {
    confirmedOutputs, continuationPanelOpen, continuationSource,
    continuationTargetScene, continuationCustomDescription, continuationRequirement,
    continuationBusy,
    isConfirmed,
    openContinuation, refreshConfirmedOutputs, revokeContinuation,
    setContinuationTargetScene, setContinuationCustomDescription, setContinuationRequirement,
    closeContinuation,
    notice, error,
  };
}