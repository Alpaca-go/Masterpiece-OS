// useUrlScreen — Phase 5.8 URL navigation wrapper.
//
// Strategy: keep the App.tsx 9-screen switch model intact, but make the
// URL pathname the source of truth. The hook returns:
//   - screen: derived from window.location.pathname via react-router
//   - setScreen: a wrapper that calls react-router's navigate()
//
// This means existing `setScreen('home')` call sites work unchanged
// (same name, same argument), and the URL becomes shareable /
// back-button-friendly without rewriting 46+ call sites.
//
// The hook handles the 9 screens with simple path prefixes; /projects/:id
// maps to 'project' so deep links resolve to the right screen even if
// the App has not yet fetched the corresponding ProjectRecord.

import { useLocation, useNavigate } from 'react-router-dom';

export type Screen =
  | 'home'
  | 'settings'
  | 'create'
  | 'project'
  | 'analysis'
  | 'report'
  | 'image-generation'
  | 'creative-session'
  | 'packaging'
  // CI-W1B: Creative Intelligence Web Workspace. The screen owns the
  // top-level route; the per-run deep-link resolves via the runId URL
  // segment (`/creative-intelligence/:runId`). The legacy 'document-context'
  // screen key is NOT deleted — the URL is still routable and the old
  // DocumentContextWorkspace is still mounted, just no longer surfaced in
  // the primary entry points.
  | 'creative-intelligence'
  | 'document-context';

const SCREEN_TO_PATH: Record<Screen, string> = {
  'home': '/',
  'settings': '/settings',
  'create': '/create',
  'project': '/projects',  // /projects/:id
  'analysis': '/analysis',
  'report': '/report',
  'image-generation': '/image-generation',
  'creative-session': '/creative-session',
  'packaging': '/packaging',
  'creative-intelligence': '/creative-intelligence',
  'document-context': '/document-context'
};

function pathToScreen(pathname: string): Screen {
  if (pathname === '/' || pathname === '') return 'home';
  // /projects/:id/* must be matched before the bare /projects check, and
  // the per-project sub-routes (analysis / report) take precedence over
  // the project detail screen.
  if (/^\/projects\/[^/]+\/analysis\/?$/.test(pathname)) return 'analysis';
  if (/^\/projects\/[^/]+\/report\/?$/.test(pathname)) return 'report';
  if (/^\/projects\/[^/]+\/creative\/?$/.test(pathname)) return 'creative-session';
  if (/^\/projects\/[^/]+\/?$/.test(pathname) || pathname === '/projects') return 'project';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/create')) return 'create';
  if (pathname.startsWith('/analysis')) return 'analysis';
  if (pathname.startsWith('/report')) return 'report';
  if (pathname.startsWith('/image-generation')) return 'image-generation';
  if (pathname.startsWith('/creative-session')) return 'creative-session';
  if (pathname.startsWith('/packaging')) return 'packaging';
  // CI-W1B: creative-intelligence must be matched BEFORE document-context
  // because the latter is a legacy deep-link. Both routes remain routable.
  if (pathname.startsWith('/creative-intelligence')) return 'creative-intelligence';
  if (pathname.startsWith('/document-context')) return 'document-context';
  // Unknown path → home. HashRouter only, so server-side rewrites aren't needed.
  return 'home';
}

export function useUrlScreen(): readonly [Screen, (s: Screen) => void, (path: string) => void] {
  const location = useLocation();
  const navigate = useNavigate();

  const screen = pathToScreen(location.pathname);
  const setScreen = (next: Screen) => {
    navigate(SCREEN_TO_PATH[next]);
  };
  // Allow navigating to an arbitrary path (for project deep links).
  const goToPath = navigate;

  return [screen, setScreen, goToPath] as const;
}
