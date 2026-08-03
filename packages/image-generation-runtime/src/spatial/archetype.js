import fs from 'node:fs';
import { assertSpatialSchema, validateVerticalSpatialArchetype } from './schemas.js';

const DEFAULT_ARCHETYPE_URL = new URL(
  '../../config/spatial/archetypes/premium-medical-aesthetics-v1.json',
  import.meta.url,
);

function cleanSignals(...values) {
  return [...new Set(values
    .flat(Infinity)
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean))];
}

export function assertArchetypeHasNoProjectSignature(archetype, projectSignatureTerms = []) {
  const serialized = JSON.stringify(archetype).toLowerCase();
  const matches = cleanSignals(projectSignatureTerms).filter((term) => serialized.includes(term));
  if (matches.length) {
    throw Object.assign(new Error(`Generic archetype contains project signature terms: ${matches.join(', ')}`), {
      code: 'ARCHETYPE_PROJECT_SIGNATURE_LEAK',
      matches,
    });
  }
  return archetype;
}

export function loadPremiumMedicalAestheticsArchetype(options = {}) {
  const url = options.url || DEFAULT_ARCHETYPE_URL;
  const parsed = JSON.parse(fs.readFileSync(url, 'utf8'));
  return assertArchetypeHasNoProjectSignature(
    assertSpatialSchema(validateVerticalSpatialArchetype(parsed)),
    options.projectSignatureTerms,
  );
}

export function matchVerticalSpatialArchetype(input = {}, archetype = loadPremiumMedicalAestheticsArchetype()) {
  const themes = cleanSignals(input.themes);
  const industry = String(input.industry || '').trim().toLowerCase();
  const tone = cleanSignals(input.tone);
  const combined = cleanSignals(industry, themes, tone);
  const blockedBy = archetype.activation.blockWhen.filter((blocked) =>
    combined.some((signal) => signal.includes(blocked) || blocked.includes(signal)));
  if (blockedBy.length) {
    return { matched: false, archetype: null, confidence: 0, signals: [], blockedBy };
  }

  const signals = [];
  if (themes.some((theme) => archetype.applicableThemes.includes(theme))) signals.push('applicable_theme');
  if (/medical aesthetics|aesthetic medicine|医美|轻医美|female health|女性健康/iu.test(industry)) {
    signals.push('medical_or_wellbeing_industry');
  }
  if (tone.some((value) => /mature|restrained|refined|professional|serene|quiet|成熟|克制|专业|安静/iu.test(value))) {
    signals.push('mature_restrained_tone');
  }
  if (tone.some((value) => /warm|hospitality|private|温暖|私享|服务/iu.test(value))) {
    signals.push('hospitality_warmth');
  }
  const distinctSignals = [...new Set(signals)];
  const confidence = Number(Math.min(0.94, 0.42 + distinctSignals.length * 0.14).toFixed(2));
  const matched = distinctSignals.length >= archetype.activation.requiredSignals
    && confidence >= archetype.activation.minimumConfidence;
  return {
    matched,
    archetype: matched ? archetype : null,
    confidence,
    signals: distinctSignals,
    blockedBy: [],
  };
}
