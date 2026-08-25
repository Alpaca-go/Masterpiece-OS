// features/short-chain/RightPanel.tsx
//
// 路线 A / P2-2 — Short-Chain 工作台右栏 Tab 容器。
// 将 DecisionStream（决策历史）和 OutputGallery（输出图库）以 Tab 形式组织，
// 替代原来的上下堆叠布局，节省垂直空间。

import { useState } from 'react';
import { Tabs } from '../../components/ui/Tabs';
import { DecisionStream } from './DecisionStream';
import { OutputGallery } from './OutputGallery';

type RightPanelTab = 'decisions' | 'gallery';

export function RightPanel() {
  const [tab, setTab] = useState<RightPanelTab>('decisions');

  return (
    <div className="sc-right-panel">
      <div className="sc-right-panel__tabs">
        <Tabs
          size="sm"
          variant="line"
          activeKey={tab}
          onChange={(k) => setTab(k as RightPanelTab)}
          items={[
            { key: 'decisions', label: '决策历史' },
            { key: 'gallery', label: '输出图库' },
          ]}
        />
      </div>
      <div className="sc-right-panel__content">
        {tab === 'decisions' && <DecisionStream />}
        {tab === 'gallery' && <OutputGallery />}
      </div>
    </div>
  );
}
