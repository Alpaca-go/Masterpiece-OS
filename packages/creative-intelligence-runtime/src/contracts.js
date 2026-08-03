export const EVIDENCE_TYPES = Object.freeze([
  'document_fact',
  'visual_observation',
  'user_intent',
  'system_assumption',
  'system_recommendation',
  'source_conflict'
]);

export const SOURCE_TYPES = Object.freeze(['document', 'image', 'system', 'user']);
export const EVIDENCE_STATUSES = Object.freeze([
  'confirmed',
  'observed',
  'unconfirmed',
  'conflicted',
  'rejected'
]);

export const TRUTH_SECTIONS = Object.freeze([
  'brandFacts',
  'productFacts',
  'audienceFacts',
  'businessGoals',
  'confirmedUserIntent',
  'observedVisualAssets',
  'currentVisualPatterns',
  'constraints',
  'conflicts',
  'assumptions',
  'openQuestions'
]);

export class CreativeIntelligenceValidationError extends Error {
  constructor(code, message, issues = []) {
    super(message);
    this.name = 'CreativeIntelligenceValidationError';
    this.code = code;
    this.issues = issues;
  }
}
