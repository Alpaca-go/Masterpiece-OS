// ShortChainHeader — Phase 5.9 sub-component (extracted from
// ShortChainGenerationWorkspace). Pure presentational; no internal
// state. The parent owns onBack / onOpenSettings.

import type { ProjectRecord } from '@masterpiece/runtime-core/application-contracts.ts';

interface Props {
  project: ProjectRecord;
  onBack(): void;
  onOpenSettings(): void;
}

export function ShortChainHeader({ project, onBack, onOpenSettings }: Props) {
  return (
    <header className="sc-workspace__header">
      <div className="sc-workspace__header-left">
        <button className="sc-workspace__back" onClick={onBack} title="返回报告（不丢失当前设置）">←</button>
        <div className="sc-workspace__titles">
          <div className="sc-workspace__breadcrumb"><strong>Short-Chain</strong> · 视觉生成</div>
          <h1 className="sc-workspace__title">{project.projectName}</h1>
          <p className="sc-workspace__subtitle">{project.brandName} · 首图直接交付</p>
        </div>
      </div>
      <div className="sc-workspace__header-right">
        <button className="button ghost" onClick={onOpenSettings}>模型设置</button>
      </div>
    </header>
  );
}
