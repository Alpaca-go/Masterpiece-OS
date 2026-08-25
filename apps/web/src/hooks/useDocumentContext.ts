import { useState } from 'react';
import type { DocumentContextRun } from '@masterpiece/runtime-core/application-contracts.ts';

/**
 * Owns the document-context run registry + the currently-requested run id
 * (used by CreatePage to pre-fill) + the deleting flag.
 */
export interface UseDocumentContextResult {
  runs: DocumentContextRun[];
  setRuns: React.Dispatch<React.SetStateAction<DocumentContextRun[]>>;
  requestedId: string;
  setRequestedId: React.Dispatch<React.SetStateAction<string>>;
  deletingId: string;
  setDeletingId: React.Dispatch<React.SetStateAction<string>>;
}

export function useDocumentContext(): UseDocumentContextResult {
  const [runs, setRuns] = useState<DocumentContextRun[]>([]);
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
