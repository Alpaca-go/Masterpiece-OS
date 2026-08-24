// ShortChainBanners — Phase 5.9 sub-component. Pure presentational.
// Shows the transient error / notice banners above the workspace body.
//
// The error banner is "promotable to a Toast" in App.tsx's parent
// error pipeline (Phase 5.7), but ShortChain sets its own `error`
// state internally (different channel from the App-level error), so
// the inline banner stays here as a self-contained signal.
//
// Step 1 UI cleanup: migrated from legacy `.notice error/ok` divs to
// the unified `Alert` primitive (severity="error"/"success"). All
// inline margin/padding moved to `.sc-banner` / `.sc-banner__hint`
// hooks so the spacing is themable and not bound to JSX literal.
//
// Step 6 boundary decision (kept inline, NOT a Toast):
//   ShortChain's `error` and `notice` are *state-machine signals*
//   bound to the current compile/run result. They live and die with
//   the workspace session — clearing them when the user navigates
//   away is correct behaviour. A Toast would (a) float outside the
//   workspace context, breaking the cause→effect read, and (b) clear
//   itself on a timer unrelated to when the user has actually seen
//   and acknowledged the failure.
//
//   The App-level Toast channel (`useToasts` in App.tsx) handles
//   *cross-page transient* events (project delete, import error,
//   IPC timeout). Don't route ShortChain compile/run feedback through
//   it — they would either double-render (inline + toast) or vanish
//   before the user finishes reading the failure.
//
//   If you find yourself wanting to "promote this to a Toast", the
//   right move is to surface a separate, NEW kind of message at the
//   App level (e.g. "ShortChain run finished"), NOT to migrate this
//   inline banner.

import { autoRecoverableHint } from '../../utils';
import { Alert } from '../ui/Alert';

interface Props {
  error: string;
  notice: string;
}

export function ShortChainBanners({ error, notice }: Props) {
  return (
    <>
      {error && (
        <div className="sc-banner">
          <Alert severity="error">
            <div>{error}</div>
            {autoRecoverableHint(error) && (
              <div className="sc-banner__hint">{autoRecoverableHint(error)}</div>
            )}
          </Alert>
        </div>
      )}
      {notice && !error && (
        <div className="sc-banner">
          <Alert severity="success">
            <div>{notice}</div>
          </Alert>
        </div>
      )}
    </>
  );
}
