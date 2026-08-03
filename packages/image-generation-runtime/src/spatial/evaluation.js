import { assertProtectedFieldsUnchanged } from './context-compiler.js';

function clampScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 0;
}

function unique(values) {
  return [...new Set((values || []).filter((value) => typeof value === 'string' && value.trim()))];
}

function decision(score, thresholds) {
  if (score >= thresholds.pass) return 'pass';
  if (score >= thresholds.passWithMinorRevision) return 'pass_with_minor_revision';
  if (score >= thresholds.revise) return 'revise';
  return 'fail';
}

function evaluateProfile(profile, scores = {}) {
  const totalWeight = profile.dimensions.reduce((total, dimension) => total + dimension.weight, 0);
  if (totalWeight !== 100) {
    throw Object.assign(new Error(`${profile.id} dimension weights must total 100.`), {
      code: 'SPATIAL_EVALUATION_WEIGHT_INVALID',
    });
  }
  const dimensions = Object.fromEntries(profile.dimensions.map((dimension) => [
    dimension.id,
    clampScore(scores[dimension.id]),
  ]));
  const totalScore = Number(profile.dimensions.reduce((total, dimension) =>
    total + dimensions[dimension.id] * dimension.weight / 100, 0).toFixed(2));
  return { profileId: profile.id, profileVersion: profile.version, dimensions, totalScore };
}

export function evaluateGlobalSpaceQuality({ profile, scores }) {
  if (profile.scope !== 'global') {
    throw Object.assign(new Error('Global evaluator requires a global profile.'), {
      code: 'SPATIAL_EVALUATION_SCOPE_INVALID',
    });
  }
  const result = evaluateProfile(profile, scores);
  return { ...result, finalDecision: decision(result.totalScore, profile.thresholds) };
}

export function evaluateProjectGolden({ profile, currentProjectId, scores, failureTags = [] }) {
  if (profile.scope !== 'project' || profile.projectId !== currentProjectId) {
    throw Object.assign(new Error('Project evaluator cannot be applied across projects.'), {
      code: 'CROSS_PROJECT_EVALUATION_PROFILE',
    });
  }
  const result = evaluateProfile(profile, scores);
  const tags = unique(failureTags);
  const fatal = tags.filter((tag) => profile.fatalFailureTags.includes(tag));
  return {
    ...result,
    failureTags: tags,
    fatalFailureTags: fatal,
    revisionActions: unique(tags.map((tag) => profile.revisionActions[tag])),
    finalDecision: fatal.length ? 'fail' : decision(result.totalScore, profile.thresholds),
  };
}

export function evaluateFoundationPreservation({ foundationSnapshot, observedFoundation }) {
  if (!foundationSnapshot) return { status: 'not_applicable', preserved: true, failureTags: [] };
  if (!observedFoundation) return { status: 'unverified', preserved: null, failureTags: [] };
  try {
    assertProtectedFieldsUnchanged(foundationSnapshot, observedFoundation);
    return { status: 'passed', preserved: true, failureTags: [] };
  } catch (error) {
    if (error?.code !== 'SPATIAL_FOUNDATION_OVERRIDDEN') throw error;
    return {
      status: 'failed',
      preserved: false,
      changedFields: error.changed,
      failureTags: ['spatial_foundation_overridden'],
    };
  }
}

export function evaluateFoundationPreservationChecks({ foundationSnapshot, checks }) {
  if (!foundationSnapshot) return { status: 'not_applicable', preserved: true, failureTags: [] };
  if (!checks || typeof checks !== 'object') {
    return { status: 'unverified', preserved: null, failureTags: [] };
  }
  const required = {
    architectureAestheticPreserved: 'architectureAesthetic',
    spatialScalePreserved: 'spatialScale',
    largeSpaceIntentPreserved: 'largeSpaceIntent',
    functionalZoningPreserved: 'functionalZoning',
    cameraRolePreserved: 'cameraIntent.role',
  };
  const failedChecks = Object.entries(required)
    .filter(([key]) => checks[key] === false)
    .map(([, field]) => field);
  const verifiedCount = Object.keys(required).filter((key) => typeof checks[key] === 'boolean').length;
  if (!failedChecks.length && verifiedCount < Object.keys(required).length) {
    return { status: 'unverified', preserved: null, failureTags: [] };
  }
  return failedChecks.length ? {
    status: 'failed', preserved: false, changedFields: failedChecks,
    failureTags: ['spatial_foundation_overridden'],
  } : { status: 'passed', preserved: true, changedFields: [], failureTags: [] };
}

export function mergeSpatialEvaluations({ global, project = null, foundation }) {
  const failureTags = unique([
    ...(project?.failureTags || []),
    ...(foundation?.failureTags || []),
  ]);
  const revisionActions = unique([
    ...(project?.revisionActions || []),
    ...(foundation?.preserved === false
      ? ['Restore every locked Spatial Foundation field before regeneration.']
      : []),
  ]);
  const finalDecision = foundation?.preserved === false
    ? 'fail'
    : project?.finalDecision === 'fail' || global.finalDecision === 'fail'
      ? 'fail'
      : project?.finalDecision || global.finalDecision;
  return {
    schemaVersion: '1.0',
    global,
    project,
    foundation,
    failureTags,
    revisionActions,
    finalDecision,
  };
}
