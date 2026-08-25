// features/short-chain/hooks/useShortChainGeneration.ts
//
// 路线 A / P1.3 — ShortChain 工作台的"生成态" (PreviewCanvas 消费)。
//
// 覆盖 ShortChainGenerationWorkspace 中:
//
//   activeRun          useState<ImageGenerationRun | null>(null)            line 122
//   imageDataUrl       useState('')                                         line 123
//   firstImage         useState<ShortChainValidatedGenerationImageRef | null> line 131
//   flowState          useState<ShortChainGenerationFlowState | null>       line 134
//   similarityAudit    useState<... | 'unavailable' | null>(null)            line 143
//   lastValidation     useState<ShortChainDeliverableValidation | null>     line 144
//
// 当前阶段零运行时影响 — 不被任何组件 import (P1.4 才接 PreviewCanvas)。

import { useCallback, useState } from 'react';
import type {
  ImageGenerationRun,
  ShortChainDeliverableValidation,
  ShortChainGenerationFlowState,
  ShortChainSimilarityAuditResult,
  ShortChainValidatedGenerationImageRef,
  CompileShortChainGenerationResult,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { cleanError } from '../../../utils';

export interface UseShortChainGenerationResult {
  // 6 个 state
  activeRun: ImageGenerationRun | null;
  imageDataUrl: string;
  firstImage: ShortChainValidatedGenerationImageRef | null;
  flowState: ShortChainGenerationFlowState | null;
  similarityAudit: ShortChainSimilarityAuditResult | 'unavailable' | null;
  lastValidation: ShortChainDeliverableValidation | null;

  // 业务动作 (Workspace line 350-401)
  /** 启动编译并触发校验过的生成链路 (compile + startValidated) */
  startValidated: (
    projectId: string,
    compiled: CompileShortChainGenerationResult,
    apiProfileId: string,
  ) => Promise<{ flowState: ShortChainGenerationFlowState | null; activeRun: ImageGenerationRun | null }>;
  /** 加载最新图像的 dataUrl (Workspace line 454-461) */
  loadImageDataUrl: (run: ImageGenerationRun) => Promise<void>;
  /** 订阅进度事件, 更新 activeRun + flowState (Workspace line 446-462) */
  subscribeProgress: (runId: string) => () => void;
  /** 重置 flowState + firstImage (Workspace line 309-311, 切到 continuation 时) */
  resetForContinuation: () => void;

  // 派生
  /** run.status === 'succeeded' 时的可显示图, 优先用 imageDataUrl 否则空 */
  displayableImage: string;
  /** 终态判定 (Workspace line 38) */
  isTerminal: boolean;

  // 错误
  generationError: string;
  starting: boolean;
}

/**
 * useShortChainGeneration — 生成态 + 启动动作。
 *
 * 边界:
 *   - 不处理 referenceAssetIds (P1.5 接入)
 *   - 不处理 continuation 链路 (P1.4 接入)
 *   - 不接 progress.onProgress 的初始订阅 (在 App.tsx 顶层 / ShortChainPage
 *     顶层 useEffect 接, hook 只暴露订阅函数)
 */
export function useShortChainGeneration(): UseShortChainGenerationResult {
  const [activeRun, setActiveRun] = useState<ImageGenerationRun | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [firstImage, setFirstImage] = useState<ShortChainValidatedGenerationImageRef | null>(null);
  const [flowState, setFlowState] = useState<ShortChainGenerationFlowState | null>(null);
  const [similarityAudit, setSimilarityAudit] = useState<
    ShortChainSimilarityAuditResult | 'unavailable' | null
  >(null);
  const [lastValidation, setLastValidation] = useState<ShortChainDeliverableValidation | null>(null);
  const [generationError, setGenerationError] = useState('');
  const [starting, setStarting] = useState(false);

  const isTerminal = flowState === 'passed'
    || flowState === 'correction_still_failed'
    || flowState === 'correction_start_failed'
    || flowState === 'initial_failed';

  const displayableImage = (() => {
    if (activeRun?.status === 'succeeded' && activeRun.images?.[0] && imageDataUrl) {
      return imageDataUrl;
    }
    if (firstImage && imageDataUrl) return imageDataUrl;
    return '';
  })();

  const subscribeProgress = useCallback((runId: string) => {
    if (!window.masterpiece?.imageGeneration) return () => undefined;
    const unsubscribe = window.masterpiece.imageGeneration.onRunUpdated((event: { runId: string; status: string }) => {
      if (event.runId !== runId) return;
      if (event.status === 'succeeded' || event.status === 'failed' || event.status === 'cancelled' || event.status === 'blocked') {
        void window.masterpiece.imageGeneration.getRun(event.runId).then(async (run) => {
          if (!run) return;
          setActiveRun(run);
          if (run.status === 'succeeded' && run.images?.[0]) {
            const image = await window.masterpiece.imageGeneration.getImageDataUrl(run.runId, run.images[0].imageId);
            setImageDataUrl(image?.dataUrl ?? '');
          }
        }).catch(reason => setGenerationError(cleanError(reason)));
      }
    });
    return unsubscribe;
  }, []);

  const loadImageDataUrl = useCallback(async (run: ImageGenerationRun) => {
    if (!window.masterpiece?.imageGeneration || !run.images?.[0]) return;
    const first = run.images[0];
    const image = await window.masterpiece.imageGeneration.getImageDataUrl(run.runId, first.imageId);
    setImageDataUrl(image?.dataUrl ?? '');
  }, []);

  const startValidated = useCallback(async (
    projectId: string,
    compiled: CompileShortChainGenerationResult,
    apiProfileId: string,
  ): Promise<{ flowState: ShortChainGenerationFlowState | null; activeRun: ImageGenerationRun | null }> => {
    if (!window.masterpiece?.imageGeneration) {
      setGenerationError('客户端安全桥接未就绪');
      return { flowState: null, activeRun: null };
    }
    if (!apiProfileId) {
      setGenerationError('请先选择并配置生图模型');
      return { flowState: null, activeRun: null };
    }
    setStarting(true);
    setGenerationError('');
    setActiveRun(null);
    setImageDataUrl('');
    setFirstImage(null);
    setFlowState(null);
    setSimilarityAudit(null);
    setLastValidation(null);
    try {
      const validated = await window.masterpiece.imageGeneration.startValidatedShortChain({
        projectId,
        taskId: compiled.taskContract.taskId,
        apiProfileId,
        editedPrompt: compiled.compiledPrompt.editablePrompt,
      });
      const run = validated.correctionRun ?? validated.initialRun;
      setActiveRun(run);
      setFlowState(validated.flowState);
      setSimilarityAudit(validated.similarityAudit);
      if (validated.firstImage) {
        setFirstImage(validated.firstImage);
        const image = await window.masterpiece.imageGeneration.getImageDataUrl(
          validated.firstImage.runId,
          validated.firstImage.imageId,
        );
        setImageDataUrl(image?.dataUrl ?? '');
      } else if (run.status === 'succeeded' && run.images?.[0]) {
        await loadImageDataUrl(run);
      }
      setLastValidation(validated.correctionValidation ?? validated.initialValidation);
      return { flowState: validated.flowState, activeRun: run };
    } catch (reason) {
      setGenerationError(cleanError(reason));
      return { flowState: null, activeRun: null };
    } finally {
      setStarting(false);
    }
  }, [loadImageDataUrl]);

  const resetForContinuation = useCallback(() => {
    setLastValidation(null);
  }, []);

  return {
    activeRun, imageDataUrl, firstImage, flowState, similarityAudit, lastValidation,
    startValidated, loadImageDataUrl, subscribeProgress, resetForContinuation,
    displayableImage, isTerminal, generationError, starting,
  };
}
