import type { ReactNode } from 'react';

/**
 * AppShell — Figma/Cursor-style persistent layout container.
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │ TopBar (sticky, brand + breadcrumb + actions)           │
 *   ├──────────┬──────────────────────────────────────────────┤
 *   │          │                                              │
 *   │ LeftRail │  Main (workspace content area)               │
 *   │  (sticky)│                                              │
 *   │          │  ┌─────────────────┬─────────────────────┐   │
 *   │          │  │                 │                     │   │
 *   │          │  │ Workspace       │ Inspector (right)   │   │
 *   │          │  │  content        │  - context props    │   │
 *   │          │  │                 │  - secondary info   │   │
 *   │          │  └─────────────────┴─────────────────────┘   │
 *   ├──────────┴──────────────────────────────────────────────┤
 *   │ BottomBar (status + meta)                                │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Pure layout — no business state, no IPC. Pages compose inside.
 */
export interface AppShellProps {
  topBar: ReactNode;
  leftRail?: ReactNode;
  bottomBar?: ReactNode;
  children: ReactNode;
  /** Optional right-side inspector (Figma property panel style) */
  inspector?: ReactNode;
  /** Main content max-width (default 1400) */
  contentMaxWidth?: number;
  /** Workspace mode: no padding, full viewport height for 3-column workspaces */
  workspaceMode?: boolean;
}

export function AppShell({ topBar, leftRail, bottomBar, children, inspector, contentMaxWidth = 1400, workspaceMode = false }: AppShellProps) {
  const mainClass = `app-shell-arch__main${workspaceMode ? ' app-shell-arch__main--workspace' : ''}`;
  return (
    <div className="app-shell-arch">
      <div className="app-shell-arch__topbar">{topBar}</div>
      <div className={`app-shell-arch__body ${inspector ? 'has-inspector' : ''} ${leftRail ? 'has-rail' : ''}`}>
        {leftRail && <aside className="app-shell-arch__rail">{leftRail}</aside>}
        <main className={mainClass} style={{ maxWidth: workspaceMode ? 'none' : contentMaxWidth }}>
          {children}
        </main>
        {inspector && <aside className="app-shell-arch__inspector">{inspector}</aside>}
      </div>
      {bottomBar && <div className="app-shell-arch__bottombar">{bottomBar}</div>}
    </div>
  );
}
