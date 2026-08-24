// features/short-chain/hooks/useShortChainBrief.ts
//
// 路线 A / P1.2 — ShortChain 工作台的"创意输入"状态 (Brief 输入区)。
//
// 覆盖 ShortChainGenerationWorkspace 中:
//
//   family              useState<Family>('space')                         line 106
//   subtype             useState(DEFAULTS.space.subtype)                  line 107
//   shot                useState(DEFAULTS.space.shot)                     line 108
//   shotSource          useState<ShortChainShotSource>('target_scene_default') line 109
//   referenceSceneRelation useState<...>('unknown')                       line 114
//   aspectRatio         useState<...>('16:9')                              line 115
//   instruction         useState('')                                       line 116
//   mustIncludeText     useState('')                                       line 117
//   mustAvoidText       useState('')                                       line 118
//   logoUsageMode       useState<...>('blank_area')                        line 119
//
// 当前阶段零运行时影响 — 不被任何组件 import (P1.3 才接 BriefEditor)。

import { useCallback, useMemo, useState } from 'react';
import type {
  CompileShortChainGenerationResult,
  ShortChainLogoUsageMode,
  ShortChainReferenceSceneRelation,
  ShortChainShotSource,
  ShortChainTaskContract,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { cleanError } from '../../../utils';
import type { Family } from '../../../components/shortchain/ShortChainTypes';
import type { TemplateOptions } from './useShortChainSession';

// 与 ShortChainGenerationWorkspace line 70-75 的 DEFAULTS 同步
const DEFAULTS: Record<Family, { subtype: string; shot: string; ratio: ShortChainTaskContract['aspectRatio'] }> = {
  space: { subtype: 'reception', shot: 'entrance_view', ratio: '16:9' },
  packaging: { subtype: 'lid_and_base_box', shot: 'three_quarter_hero', ratio: '3:4' },
  vi: { subtype: 'business_card', shot: 'front', ratio: '1:1' },
  poster: { subtype: 'brand_key_visual', shot: 'subject_centered', ratio: '3:4' },
};

export interface UseShortChainBriefResult {
  // 字段 state (10)
  family: Family;
  subtype: string;
  shot: string;
  shotSource: ShortChainShotSource;
  referenceSceneRelation: ShortChainReferenceSceneRelation;
  aspectRatio: ShortChainTaskContract['aspectRatio'];
  instruction: string;
  mustIncludeText: string;
  mustAvoidText: string;
  logoUsageMode: ShortChainLogoUsageMode;

  // 派生 (与 Workspace line 215-218 同步)
  canCompile: boolean;

  // 动作 (与 Workspace line 216-229 同步)
  setFamily: (next: Family) => void;
  setSubtype: (next: string) => void;
  setShot: (next: string) => void;
  setShotSource: (next: ShortChainShotSource) => void;
  setReferenceSceneRelation: (next: ShortChainReferenceSceneRelation) => void;
  setAspectRatio: (next: ShortChainTaskContract['aspectRatio']) => void;
  setInstruction: (next: string) => void;
  setMustIncludeText: (next: string) => void;
  setMustAvoidText: (next: string) => void;
  setLogoUsageMode: (next: ShortChainLogoUsageMode) => void;
  /** 切 family 时级联重置 subtype/shot/aspectRatio 为该 family 的默认值 */
  changeFamily: (next: Family) => void;

  // 业务动作 (P1.2 起步只暴露 compile; P1.5 才接 start)
  compile: (projectId: string, options: TemplateOptions | null) => Promise<CompileShortChainGenerationResult | null>;

  // 状态
  compiling: boolean;
  error: string;
  notice: string;
}

/**
 * 把 splitRules / canUseGenerationBasis 等 Workspace 的内联 helper 也搬到这里。
 * 这样 BriefEditor / PreviewCanvas 之后只需 useShortChainBrief() 就能拿到一切。
 */
function splitRules(value: string): string[] {
  return Array.from(new Set(
    value.split(/\r?\n|；|;/u).map(s => s.trim()).filter(Boolean)
  ));
}

export function useShortChainBrief(): UseShortChainBriefResult {
  const [family, setFamily] = useState<Family>('space');
  const [subtype, setSubtype] = useState(DEFAULTS.space.subtype);
  const [shot, setShot] = useState(DEFAULTS.space.shot);
  const [shotSource, setShotSource] = useState<ShortChainShotSource>('target_scene_default');
  const [referenceSceneRelation, setReferenceSceneRelation] =
    useState<ShortChainReferenceSceneRelation>('unknown');
  const [aspectRatio, setAspectRatio] = useState<ShortChainTaskContract['aspectRatio']>('16:9');
  const [instruction, setInstruction] = useState('');
  const [mustIncludeText, setMustIncludeText] = useState('');
  const [mustAvoidText, setMustAvoidText] = useState('');
  const [logoUsageMode, setLogoUsageMode] = useState<ShortChainLogoUsageMode>('blank_area');

  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // 与 Workspace line 463-476 changeFamily() 同步
  const changeFamily = useCallback((next: Family) => {
    setFamily(next);
    setSubtype(DEFAULTS[next].subtype);
    setShot(DEFAULTS[next].shot);
    setShotSource('target_scene_default');
    setReferenceSceneRelation('unknown');
    setAspectRatio(DEFAULTS[next].ratio);
  }, []);

  // 与 Workspace line 215-218 canUseGenerationBasis() 同步
  // P1.2 起步不接 referenceAssetIds (留空数组), 因此永远是 standard mode
  const canCompile = useMemo(() => {
    return Boolean(
      instruction.trim() &&
      subtype &&
      shot
    );
  }, [instruction, subtype, shot]);

  // 与 Workspace line 384-407 generateOneClick() 部分同步
  // P1.2 只暴露 compile 动作; P1.5 才合并 startValidated 链路
  const compile = useCallback(async (
    projectId: string,
    options: TemplateOptions | null,
  ): Promise<CompileShortChainGenerationResult | null> => {
    if (!window.masterpiece?.imageGeneration) {
      setError('客户端安全桥接未就绪');
      return null;
    }
    setCompiling(true);
    setError('');
    setNotice('正在编译创意指令…');
    try {
      const task: ShortChainTaskContract = {
        schemaVersion: '1.0',
        taskId: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        projectId,
        deliverableFamily: family,
        subtype,
        shot,
        count: 1,
        aspectRatio,
        currentInstruction: instruction.trim(),
        generationBasis: 'standard', // P1.2 起步固定 standard; P1.5 接 reference
        mustInclude: splitRules(mustIncludeText),
        mustAvoid: splitRules(mustAvoidText),
        referenceAssetIds: [],
        logoUsageMode,
        continuation: undefined, // P1.5 才接 continuation
        createdAt: new Date().toISOString(),
      };
      const result = await window.masterpiece.imageGeneration.compileShortChain({
        projectId,
        task,
      });
      setCompiled(result);
      setNotice('编译成功，准备生成…');
      return result;
    } catch (reason) {
      setError(cleanError(reason));
      return null;
    } finally {
      setCompiling(false);
    }
  }, [family, subtype, shot, aspectRatio, instruction, mustIncludeText, mustAvoidText, logoUsageMode]);

  // 内部 state — 让 Result 接口稳定, P1.5 再暴露给外部
  const [, setCompiled] = useState<CompileShortChainGenerationResult | null>(null);

  return {
    family, subtype, shot, shotSource, referenceSceneRelation, aspectRatio,
    instruction, mustIncludeText, mustAvoidText, logoUsageMode,
    canCompile,
    setFamily, setSubtype, setShot, setShotSource, setReferenceSceneRelation,
    setAspectRatio, setInstruction, setMustIncludeText, setMustAvoidText, setLogoUsageMode,
    changeFamily,
    compile,
    compiling, error, notice,
  };
}