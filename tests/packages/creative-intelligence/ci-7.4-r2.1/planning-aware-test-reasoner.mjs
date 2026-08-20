// CI-W1C.7.4-R2.1 PART E — planning-aware test reasoner.
//
// Test-only helper. Reads the Strategic prompt's
// `# PLANNING STRATEGIC EVIDENCE` section, parses real claim IDs,
// and returns a `ModelReasoner` that emits a planning-aware
// `StrategicSynthesisArtifact` JSON.
//
// Used with the live code path (`useMock: false` + dummy
// `readCredentials`) so the test exercises the FULL service →
// grounding-gate wiring including PART B's planning-evidence
// forward.
//
// NEVER hardcodes a claim ID. The IDs come from the runtime
// planning-evidence carrier (forwarded into the prompt by
// `buildStrategicSynthesisPrompt`).

import { pathToFileURL } from 'node:url';
import path from 'node:path';

const PLANNING_SECTION_HEADER = '# PLANNING STRATEGIC EVIDENCE';
const PLANNING_ID_LINE_PATTERN = /^\s*-\s*id=([A-Za-z0-9_\-.:]+)\b/im;
const FACTS_SECTION_HEADER = '# AUTHORITATIVE PROJECT FACTS';
const FACT_ID_LINE_PATTERN = /^\s*-\s*id=([A-Za-z0-9_\-.:]+)\b/im;
const NEEDS_SECTION_HEADER = '# NEED SKELETON';
const NEED_ID_LINE_PATTERN = /^\s*-\s*id=([A-Za-z0-9_\-.:]+)\b/im;
const PROJECT_SECTION_HEADER = '# PROJECT';
const PROJECT_ID_LINE_PATTERN = /^\s*projectId\s*[=:]\s*([A-Za-z0-9_\-.:]+)\s*$/im;
const SOURCE_TRACE_IDS_HEADER = '# SOURCE TRACE IDS';
const SOURCE_TRACE_LINE_PATTERN = /^\s*(facts|needs|evidence|planningClaims|lockedIdentity|prohibitedDirections|userRequirements|planningTruth)\s*:\s*\[([^\]]*)\]/im;

function extractIdsFromSection(allText, header, idPattern) {
  if (typeof allText !== 'string' || allText.length === 0) return [];
  const headerIdx = allText.indexOf(header);
  if (headerIdx < 0) return [];
  const after = allText.slice(headerIdx + header.length);
  const nextHeader = after.search(/^#\s+/m);
  const sectionBody = nextHeader >= 0 ? after.slice(0, nextHeader) : after;
  const seen = new Set();
  const ordered = [];
  for (const line of sectionBody.split(/\r?\n/)) {
    const m = line.match(idPattern);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]);
      ordered.push(m[1]);
    }
  }
  return ordered;
}

export function parsePlanningClaimIdsFromPrompt(userMessage) {
  return extractIdsFromSection(userMessage, PLANNING_SECTION_HEADER, PLANNING_ID_LINE_PATTERN);
}

export function parseFactIdsFromPrompt(userMessage) {
  return extractIdsFromSection(userMessage, FACTS_SECTION_HEADER, FACT_ID_LINE_PATTERN);
}

export function parseNeedIdsFromPrompt(userMessage) {
  return extractIdsFromSection(userMessage, NEEDS_SECTION_HEADER, NEED_ID_LINE_PATTERN);
}

export function parseProjectIdFromPrompt(userMessage) {
  if (typeof userMessage !== 'string' || userMessage.length === 0) return null;
  const headerIdx = userMessage.indexOf(PROJECT_SECTION_HEADER);
  if (headerIdx < 0) return null;
  const after = userMessage.slice(headerIdx + PROJECT_SECTION_HEADER.length);
  const nextHeader = after.search(/^#\s+/m);
  const sectionBody = nextHeader >= 0 ? after.slice(0, nextHeader) : after;
  const m = sectionBody.match(PROJECT_ID_LINE_PATTERN);
  return m ? m[1] : null;
}

export function parseSourceTraceIdsFromPrompt(userMessage) {
  // The # SOURCE TRACE IDS section lists every ID the model may
  // cite (facts, needs, evidence, planningClaims, etc). We need
  // these so the planning-aware reasoner can mirror the
  // runtime's sourceMap.* lists.
  if (typeof userMessage !== 'string' || userMessage.length === 0) return null;
  const headerIdx = userMessage.indexOf(SOURCE_TRACE_IDS_HEADER);
  if (headerIdx < 0) return null;
  const after = userMessage.slice(headerIdx + SOURCE_TRACE_IDS_HEADER.length);
  const nextHeader = after.search(/^#\s+/m);
  const sectionBody = nextHeader >= 0 ? after.slice(0, nextHeader) : after;
  const out = {};
  for (const m of sectionBody.matchAll(new RegExp(SOURCE_TRACE_LINE_PATTERN.source, 'gim'))) {
    const key = m[1].trim();
    const ids = m[2]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    out[key] = ids;
  }
  return out;
}

function withPlanningAwareRefs(fixture, opts) {
  const { planningClaimIds, factId, needId, projectId, sourceTraceIds } = opts;
  const next = JSON.parse(JSON.stringify(fixture));
  if (typeof projectId === 'string' && projectId.length > 0) {
    next.projectId = projectId;
  }
  next.projectUnderstanding.factRefs = factId ? [factId] : [];
  next.projectUnderstanding.needRefs = needId ? [needId] : [];
  next.projectUnderstanding.planningClaimRefs = planningClaimIds.length > 0
    ? [planningClaimIds[0]]
    : [];
  for (const t of next.tensions) {
    t.factRefs = factId ? [factId] : [];
    t.needRefs = needId ? [needId] : [];
    t.planningClaimRefs = planningClaimIds.length > 0
      ? [planningClaimIds[0]]
      : [];
  }
  for (const i of next.insights) {
    i.factRefs = factId ? [factId] : [];
    i.needRefs = needId ? [needId] : [];
    i.planningClaimRefs = planningClaimIds.length > 0
      ? [planningClaimIds[0]]
      : [];
  }
  for (const o of next.opportunities) {
    o.factRefs = factId ? [factId] : [];
    o.planningClaimRefs = planningClaimIds.length > 0
      ? [planningClaimIds[0]]
      : [];
  }
  // Mirror the runtime-derived sourceMap lists from the prompt's
  // SOURCE TRACE IDS section. The gate builds knownFactIds /
  // knownNeedIds / knownEvidenceIds from `artifact.sourceMap.*`
  // and would otherwise see the (empty) mock fixture values.
  if (sourceTraceIds && typeof sourceTraceIds === 'object') {
    if (Array.isArray(sourceTraceIds.planningTruth)) {
      next.sourceMap.planningTruth = [...sourceTraceIds.planningTruth];
    }
    if (Array.isArray(sourceTraceIds.userRequirements)) {
      next.sourceMap.userRequirements = [...sourceTraceIds.userRequirements];
    }
    if (Array.isArray(sourceTraceIds.lockedIdentity)) {
      next.sourceMap.lockedIdentity = [...sourceTraceIds.lockedIdentity];
    }
    if (Array.isArray(sourceTraceIds.prohibitedDirections)) {
      next.sourceMap.prohibitedDirections = [...sourceTraceIds.prohibitedDirections];
    }
    if (Array.isArray(sourceTraceIds.facts)) {
      next.sourceMap.planningTruth = [...sourceTraceIds.facts];
    }
    if (Array.isArray(sourceTraceIds.needs)) {
      next.sourceMap.needs = [...sourceTraceIds.needs];
    }
    if (Array.isArray(sourceTraceIds.evidence)) {
      next.sourceMap.evidence = [...sourceTraceIds.evidence];
    }
  }
  next.sourceMap.planningClaims = [...planningClaimIds];
  return next;
}

export async function loadMockFixtures(repoRoot) {
  const url = pathToFileURL(
    path.join(repoRoot, 'packages/runtime-core/src/application/creative-reasoning-service.ts'),
  ).href;
  const mod = await import(url);
  return {
    MOCK_SYNTHESIS_FIXTURE: mod.MOCK_SYNTHESIS_FIXTURE,
    MOCK_CONCEPT_FIXTURE: mod.MOCK_CONCEPT_FIXTURE,
    MOCK_DIRECTION_FIXTURE: mod.MOCK_DIRECTION_FIXTURE,
  };
}

/**
 * Returns a `ModelReasoner` factory suitable for `service.run()`
 * live mode (`useMock: false`). The factory is SYNCHRONOUS:
 * `deps.reasonerFactory(creds)` is called without `await` in
 * the service, so it must return a `ModelReasoner` (function)
 * directly, not a Promise of one. The fixtures are loaded once
 * at factory-call time.
 */
export function createPlanningAwareTestReasonerFactory(repoRoot) {
  return () => {
    // The fixtures are loaded via a top-level await on the
    // pre-resolved module (we use the dynamic import eagerly
    // and return a closure over the resolved values). To keep
    // this synchronous, we use a lazy Promise that the inner
    // reasoner awaits.
    let fixturesPromise = null;
    function getFixtures() {
      if (!fixturesPromise) fixturesPromise = loadMockFixtures(repoRoot);
      return fixturesPromise;
    }
    return async (input) => {
      const { MOCK_SYNTHESIS_FIXTURE, MOCK_CONCEPT_FIXTURE, MOCK_DIRECTION_FIXTURE } =
        await getFixtures();
      const allText = (input.prompt.messages ?? [])
        .map((m) => m.content ?? '').join('\n');
      // Concept / Direction stages do NOT consume planning refs
      // in R2.1 (PART J: the spec deliberately defers Concept /
      // Direction planningClaimRefs to CI-W1C.7.5).
      if (/ModelAssistedConceptSet/i.test(allText) || /ConceptSetArtifact/i.test(allText)) {
        return { reportMarkdown: JSON.stringify(MOCK_CONCEPT_FIXTURE) };
      }
      if (/ModelAssistedDirectionSet/i.test(allText) || /DirectionSetArtifact/i.test(allText)) {
        return { reportMarkdown: JSON.stringify(MOCK_DIRECTION_FIXTURE) };
      }
      // Default = Strategic Synthesis.
      const planningClaimIds = parsePlanningClaimIdsFromPrompt(allText);
      const factIds = parseFactIdsFromPrompt(allText);
      const needIds = parseNeedIdsFromPrompt(allText);
      const projectId = parseProjectIdFromPrompt(allText);
      const sourceTraceIds = parseSourceTraceIdsFromPrompt(allText);
      const fixture = withPlanningAwareRefs(MOCK_SYNTHESIS_FIXTURE, {
        planningClaimIds,
        factId: factIds[0],
        needId: needIds[0],
        projectId,
        sourceTraceIds
      });
      return { reportMarkdown: JSON.stringify(fixture) };
    };
  };
}

/**
 * Dummy `readCredentials` for the live code path. The reasoner
 * never actually uses the credentials; we just need a non-throwing
 * stub so the service's `if (liveMode && ...readCredentials...)`
 * branch enters the reasonerFactory path.
 */
export async function dummyReadCredentials() {
  return {
    profileId: 'lpg-test-profile',
    provider: 'mock',
    protocol: 'openai-chat-multimodal',
    modelType: 'analysis',
    baseUrl: 'http://localhost:0',
    model: 'lpg-test-mock',
    apiKey: 'lpg-test-dummy',
  };
}
