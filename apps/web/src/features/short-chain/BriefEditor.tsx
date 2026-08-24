// features/short-chain/BriefEditor.tsx
//
// 路线 A / P1.3 — Brief 编辑器 (左栏) 接入 useShortChainBrief hook。
//
// 设计: pure presentational — 通过 props 接收 hook 状态 + setter,
// 不直接调用 hook。这样 ShortChainPage 顶层统一 useShortChainBrief,
// BriefEditor 可以独立单元测试, hook 切换实现时 BriefEditor 不变。
//
// 当前 scope (P1.3 起步):
// - 4 个 family 切换 (Space / Packaging / VI / Poster)
// - 1 个 subtype 下拉
// - 1 个 shot 下拉
// - 1 个 aspectRatio 选择器 (1:1 / 4:3 / 3:4 / 16:9 / 9:16)
// - 1 个 instruction 大 textarea
// - 2 个 mustInclude / mustAvoid textarea
// - 1 个 logoUsageMode 单选 (blank_area / post_composite)
// - 1 个 '智能生成' 主按钮 (基于 canCompile 启用)
//
// 未做 (留到 P1.5+):
// - referenceAssetIds 多选 (useShortChainReferenceAssets)
// - shotSource 选择器 (下游 useShortChainReferenceAssets)
// - referenceSceneRelation 切换

import type { ChangeEvent } from 'react';
import type { Family } from '../../components/shortchain/ShortChainTypes';
import type { ShortChainLogoUsageMode, ShortChainTaskContract } from '@masterpiece/runtime-core/application-contracts.ts';

export interface BriefEditorProps {
  // 10 个 state
  family: Family;
  subtype: string;
  shot: string;
  aspectRatio: ShortChainTaskContract['aspectRatio'];
  instruction: string;
  mustIncludeText: string;
  mustAvoidText: string;
  logoUsageMode: ShortChainLogoUsageMode;

  // 派生 (来自 useShortChainBrief.canCompile)
  canCompile: boolean;

  // 动作
  setFamily: (next: Family) => void;
  changeFamily: (next: Family) => void;
  setSubtype: (next: string) => void;
  setShot: (next: string) => void;
  setAspectRatio: (next: ShortChainTaskContract['aspectRatio']) => void;
  setInstruction: (next: string) => void;
  setMustIncludeText: (next: string) => void;
  setMustAvoidText: (next: string) => void;
  setLogoUsageMode: (next: ShortChainLogoUsageMode) => void;
  /** '智能生成' 主按钮 — P1.5 才接完整 generateOneClick(), P1.3 仅占位 */
  onGenerate: () => void;

  // 反馈 (来自 useShortChainBrief)
  compiling: boolean;
  error: string;
  notice: string;
}

const FAMILY_LABELS: Record<Family, string> = {
  space: '空间效果图',
  packaging: '包装效果图',
  vi: 'VI 应用图',
  poster: '海报画面',
};

const ASPECT_RATIOS: Array<ShortChainTaskContract['aspectRatio']> = [
  '1:1', '4:3', '3:4', '16:9', '9:16',
];

const SUBTYPE_OPTIONS: Record<Family, string[]> = {
  space: ['reception', 'lobby', 'open_office', 'meeting_room', 'executive_office', 'exhibition_hall'],
  packaging: ['lid_and_base_box', 'cylindrical_tube', 'paper_pouch', 'glass_bottle', 'metal_can'],
  vi: ['business_card', 'letterhead', 'envelope', 'folder', 'signage'],
  poster: ['brand_key_visual', 'product_hero', 'event_poster', 'campaign_banner'],
};

const SHOT_OPTIONS: Record<Family, string[]> = {
  space: ['entrance_view', 'three_quarter_view', 'detail_view', 'birdseye_view'],
  packaging: ['three_quarter_hero', 'flat_lay', 'side_profile', 'in_context'],
  vi: ['front', 'back', 'detail_macro', 'in_context'],
  poster: ['subject_centered', 'rule_of_thirds', 'wide_composition'],
};

const LOGO_MODE_OPTIONS: Array<{ value: ShortChainLogoUsageMode; label: string; hint: string }> = [
  { value: 'blank_area', label: '预留干净区域', hint: 'AI 不放 Logo, 后期合成' },
  { value: 'post_composite', label: '后期合成', hint: '项目有已确认 Logo 时使用' },
];

export function BriefEditor(props: BriefEditorProps) {
  const {
    family, subtype, shot, aspectRatio, instruction, mustIncludeText, mustAvoidText,
    logoUsageMode, canCompile, compiling, error, notice,
    setFamily, changeFamily, setSubtype, setShot, setAspectRatio,
    setInstruction, setMustIncludeText, setMustAvoidText, setLogoUsageMode,
    onGenerate,
  } = props;

  function onFamilyChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Family;
    setFamily(next);
    // family 切换 → subtype/shot/aspectRatio 级联重置 (useShortChainBrief.changeFamily)
    if (next !== family) changeFamily(next);
  }

  return (
    <div className="sc-brief-editor">
      <h3 className="sc-brief-editor__title">创意指令</h3>

      {/* Family 选择 */}
      <label className="sc-field">
        <span className="sc-field-label">成果物类型</span>
        <select value={family} onChange={onFamilyChange}>
          {(Object.keys(FAMILY_LABELS) as Family[]).map((f) => (
            <option key={f} value={f}>{FAMILY_LABELS[f]}</option>
          ))}
        </select>
      </label>

      {/* Subtype */}
      <label className="sc-field">
        <span className="sc-field-label">子类型</span>
        <select value={subtype} onChange={(e) => setSubtype(e.target.value)}>
          {SUBTYPE_OPTIONS[family].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      {/* Shot */}
      <label className="sc-field">
        <span className="sc-field-label">镜头 / 构图</span>
        <select value={shot} onChange={(e) => setShot(e.target.value)}>
          {SHOT_OPTIONS[family].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      {/* Aspect ratio */}
      <label className="sc-field">
        <span className="sc-field-label">画幅比例</span>
        <div className="sc-aspect-row">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r}
              type="button"
              className={`sc-aspect-pill${aspectRatio === r ? ' is-active' : ''}`}
              onClick={() => setAspectRatio(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </label>

      {/* Instruction */}
      <label className="sc-field">
        <span className="sc-field-label">本轮要求</span>
        <textarea
          className="sc-instruction"
          rows={5}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={`例如: 生成真实可进入的前台接待空间, 强调清晰动线与克制但不冷的品牌气质。可以直接写「必须包含 xxx」「不要 yyy」。`}
        />
        <small className="sc-field-hint">
          想强调/避免某些要素? 直接在这里写「必须包含」「必须避免」「不要」即可。
          需要按行精确指定的, 往下展开高级设置。
        </small>
      </label>

      {/* Must include / avoid */}
      <div className="sc-field sc-field-grid">
        <label className="sc-field">
          <span className="sc-field-label">必须包含 (每行一项)</span>
          <textarea
            rows={2}
            value={mustIncludeText}
            onChange={(e) => setMustIncludeText(e.target.value)}
            placeholder="例如: 完整前台;清晰入口动线"
          />
        </label>
        <label className="sc-field">
          <span className="sc-field-label">必须避免 (每行一项)</span>
          <textarea
            rows={2}
            value={mustAvoidText}
            onChange={(e) => setMustAvoidText(e.target.value)}
            placeholder="例如: VI 展板;错误品牌文字"
          />
        </label>
      </div>

      {/* Logo mode */}
      <fieldset className="sc-field sc-logo-mode">
        <legend className="sc-field-label">Logo 处理</legend>
        {LOGO_MODE_OPTIONS.map((opt) => (
          <label key={opt.value} className="sc-radio-row">
            <input
              type="radio"
              name="sc-logo-mode"
              value={opt.value}
              checked={logoUsageMode === opt.value}
              onChange={() => setLogoUsageMode(opt.value)}
            />
            <span>
              <strong>{opt.label}</strong>
              <small>{opt.hint}</small>
            </span>
          </label>
        ))}
      </fieldset>

      {/* Generate CTA */}
      <button
        type="button"
        className="sc-cta__primary"
        disabled={!canCompile || compiling}
        onClick={onGenerate}
      >
        {compiling ? '生成中…' : '智能生成'}
      </button>

      {/* 反馈 */}
      {error && <div className="sc-brief-editor__error" role="alert">{error}</div>}
      {notice && !error && <div className="sc-brief-editor__notice">{notice}</div>}
    </div>
  );
}