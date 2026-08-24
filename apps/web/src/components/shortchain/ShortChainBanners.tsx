// ShortChainBanners — Phase 5.9 sub-component. Pure presentational.
// Shows the transient error / notice banners above the workspace body.
//
// The error banner is "promotable to a Toast" in App.tsx's parent
// error pipeline (Phase 5.7), but ShortChain sets its own `error`
// state internally (different channel from the App-level error), so
// the inline banner stays here as a self-contained signal.
//
// Step 6 UI cleanup: migrated from legacy `.notice error/ok` divs to
// the unified `Alert` primitive (severity="error"/"success"). All
// inline margin/padding moved to `.sc-banner` / `.sc-banner__hint`
// hooks so the spacing is themable and not bound to JSX literal.

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
