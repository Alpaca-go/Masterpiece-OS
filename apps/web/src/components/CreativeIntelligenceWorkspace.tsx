// CreativeIntelligenceWorkspace — CI-W1B stub.
//
// The real implementation lands in subsequent commits. This stub exists
// only to keep the App.tsx import + route + screen typecheck working
// during the route scaffolding commit. The stub renders a single
// "ready" panel and never reaches into the @masterpiece/creative-intelligence
// package or reads run files from disk.

import type { PublicSettings } from '@masterpiece/runtime-core/application-contracts.ts';
import { AppShell } from './layout/AppShell';
import { TopBar, TopBarBreadcrumb, TopBarActions } from './layout/TopBar';
import { Button } from './ui/Button';

interface Props {
  settings: PublicSettings;
  selectedApiProfileId: string;
  onApiProfileChange(profileId: string): void;
  onBack(): void;
  onOpenSettings(): void;
}

export function CreativeIntelligenceWorkspace(_props: Props) {
  return <AppShell
    topBar={
      <TopBar
        left={
          <TopBarBreadcrumb
            items={[
              { label: '项目', onClick: _props.onBack },
              { label: 'Creative Intelligence' }
            ]}
          />
        }
        right={
          <TopBarActions>
            <Button variant="ghost" size="sm" onClick={_props.onOpenSettings}>API 设置</Button>
            <Button variant="primary" size="sm" onClick={_props.onBack}>返回首页</Button>
          </TopBarActions>
        }
      />
    }
    bottomBar={<><span>Creative Intelligence · 加载中…</span><span>准备就绪</span></>}
  >
    <div className="page ci-workspace" data-ciw-stage="00-loading">
      <header className="page-header">
        <div>
          <p className="eyebrow">CREATIVE INTELLIGENCE</p>
          <h1>Creative Intelligence Web Workspace</h1>
          <p>Stub placeholder — full workspace lands in subsequent commits.</p>
        </div>
      </header>
    </div>
  </AppShell>;
}
