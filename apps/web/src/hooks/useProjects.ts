import { useState } from 'react';
import type { ProjectRecord } from '@masterpiece/runtime-core/application-contracts.ts';

/**
 * Owns the project registry + selected-project + API profile selection state
 * for the App shell. Pure state — no business handlers (openProject / run /
 * deleteProject live in AppContent because they cross-cut multiple hooks).
 */
export interface UseProjectsResult {
  projects: ProjectRecord[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectRecord[]>>;
  selected: ProjectRecord | null;
  setSelected: React.Dispatch<React.SetStateAction<ProjectRecord | null>>;
  selectedApiProfileId: string;
  setSelectedApiProfileId: React.Dispatch<React.SetStateAction<string>>;
  deletingProjectId: string;
  setDeletingProjectId: React.Dispatch<React.SetStateAction<string>>;
}

export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selected, setSelected] = useState<ProjectRecord | null>(null);
  const [selectedApiProfileId, setSelectedApiProfileId] = useState('');
  const [deletingProjectId, setDeletingProjectId] = useState('');

  return {
    projects,
    setProjects,
    selected,
    setSelected,
    selectedApiProfileId,
    setSelectedApiProfileId,
    deletingProjectId,
    setDeletingProjectId,
  };
}
