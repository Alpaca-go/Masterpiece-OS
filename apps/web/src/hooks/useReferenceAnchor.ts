import { useState } from 'react';
import type { ReferenceAnchorRun } from '@masterpiece/runtime-core/application-contracts.ts';

/**
 * Owns the reference-anchor run registry + the currently-requested run id
 * (used by CreatePage to pre-fill) + the deleting flag.
 */
export interface UseReferenceAnchorResult {
  runs: ReferenceAnchorRun[];
  setRuns: React.Dispatch<React.SetStateAction<ReferenceAnchorRun[]>>;
  requestedId: string;
  setRequestedId: React.Dispatch<React.SetStateAction<string>>;
  deletingId: string;
  setDeletingId: React.Dispatch<React.SetStateAction<string>>;
}

export function useReferenceAnchor(): UseReferenceAnchorResult {
  const [runs, setRuns] = useState<ReferenceAnchorRun[]>([]);
  const [requestedId, setRequestedId] = useState('');
  const [deletingId, setDeletingId] = useState('');

  return {
    runs,
    setRuns,
    requestedId,
    setRequestedId,
    deletingId,
    setDeletingId,
  };
}
