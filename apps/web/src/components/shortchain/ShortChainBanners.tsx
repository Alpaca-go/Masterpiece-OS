// ShortChainBanners — Phase 5.9 sub-component. Pure presentational.
// Shows the transient error / notice banners above the workspace body.
//
// The error banner is "promotable to a Toast" in App.tsx's parent
// error pipeline (Phase 5.7), but ShortChain sets its own `error`
// state internally (different channel from the App-level error), so
// the inline banner stays here as a self-contained signal.

import { autoRecoverableHint } from '../../utils';

interface Props {
  error: string;
  notice: string;
}

export function ShortChainBanners({ error, notice }: Props) {
  return (
    <>
      {error && (
        <div style={{ margin: '0 var(--space-11)', paddingTop: 'var(--space-5)' }}>
          <div className="notice error">
            <div>{error}</div>
            {autoRecoverableHint(error) && (
              <div style={{ marginTop: 6, fontWeight: 500 }}>
                {autoRecoverableHint(error)}
              </div>
            )}
          </div>
        </div>
      )}
      {notice && !error && (
        <div style={{ margin: '0 var(--space-11)', paddingTop: 'var(--space-5)' }}>
          <div className="notice ok">{notice}</div>
        </div>
      )}
    </>
  );
}
