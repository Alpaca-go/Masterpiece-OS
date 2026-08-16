/**
 * Project Truth Model types — CI-1 foundation skeleton.
 *
 * These types define the future Project Truth Model contract.
 * They are NOT yet integrated with existing fact carriers.
 * Integration is CI-2 scope.
 */

export type TruthClass =
  | 'fact'
  | 'user_requirement'
  | 'inference'
  | 'creative_hypothesis'
  | 'unknown';

export interface ProjectTruthFact<T = unknown> {
  id: string;
  key: string;
  value: T | null;
  truthClass: TruthClass;
  status:
    | 'observed'
    | 'verified'
    | 'confirmed'
    | 'conflicted'
    | 'stale'
    | 'unknown';
  confidence?: number;
  evidenceRefs: string[];
  sourceIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectTruthConflict {
  id: string;
  key: string;
  factIds: string[];
  status: 'open' | 'resolved';
  resolutionFactId?: string;
}

export interface ProjectTruthModel {
  schemaVersion: '0.1';
  projectId: string;
  facts: ProjectTruthFact[];
  assumptions: string[];
  unknowns: string[];
  conflicts: ProjectTruthConflict[];
}
