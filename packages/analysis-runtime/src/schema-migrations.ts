import type { SchemaMigrationResult } from './contracts.ts';
import {
  isRecord,
  setValueAtPath,
  valueAtPath,
} from './path-utils.ts';
import { computeSourceFingerprint } from './source-fingerprint.ts';

const ARRAY_SHAPE_PATHS = [
  'lockedAssets',
  'diagnosis.brandMisreadRisks',
  'diagnosis.valuableAssets',
  'creativeDecision.toneBoundaries',
  'abstractions',
  'mediaTranslations.spatial.structureLanguage',
  'mediaTranslations.spatial.materialLanguage',
  'mediaTranslations.spatial.lightingLanguage.source',
  'mediaTranslations.spatial.colorBehavior.primary',
  'mediaTranslations.spatial.colorBehavior.secondary',
  'mediaTranslations.spatial.colorBehavior.accent',
  'mediaTranslations.spatial.brandRoleManifestation',
  'mediaTranslations.spatial.signatureSpatialMechanism',
  'mediaTranslations.spatial.functionalNetwork',
  'mediaTranslations.spatial.positiveDifferentiators',
  'mediaTranslations.spatial.mustBeVisible',
  'mediaTranslations.spatial.sceneProgram',
  'mediaTranslations.spatial.peopleBehavior',
  'mediaTranslations.spatial.functionalRelationships',
  'mediaTranslations.packaging.productAndCategoryRole',
  'mediaTranslations.packaging.structureStrategy',
  'mediaTranslations.packaging.openingExperience',
  'mediaTranslations.packaging.productArrangement',
];

const REPAIR_AFTER_MIGRATION = new Set([
  'diagnosis.brandMisreadRisks',
  'diagnosis.valuableAssets',
  'creativeDecision.toneBoundaries',
  'abstractions',
  'mediaTranslations.spatial.structureLanguage',
  'mediaTranslations.spatial.materialLanguage',
  'mediaTranslations.spatial.lightingLanguage.source',
  'mediaTranslations.spatial.colorBehavior.primary',
  'mediaTranslations.spatial.colorBehavior.secondary',
  'mediaTranslations.spatial.colorBehavior.accent',
  'mediaTranslations.spatial.signatureSpatialMechanism',
  'mediaTranslations.spatial.positiveDifferentiators',
  'mediaTranslations.spatial.sceneProgram',
  'mediaTranslations.spatial.functionalRelationships',
]);

export function migrateAnalysisPacket(input: unknown, now = new Date().toISOString()): SchemaMigrationResult {
  if (!isRecord(input)) {
    throw Object.assign(new Error('Cannot migrate a corrupted analysis packet.'), {
      code: 'SCHEMA_MIGRATION_FAILED',
    });
  }
  const packet = structuredClone(input);
  const fromVersion = typeof packet.schemaVersion === 'string'
    ? packet.schemaVersion
    : 'unversioned';
  if (
    fromVersion !== 'unversioned'
    && fromVersion !== '1.0'
    && !fromVersion.startsWith('0.')
  ) {
    throw Object.assign(
      new Error(`Unsupported analysis packet schema version: ${fromVersion}.`),
      { code: 'SCHEMA_MIGRATION_FAILED' },
    );
  }
  const changes: string[] = [];
  const requiresRepair: string[] = [];

  if (packet.schemaVersion !== '1.0') {
    packet.schemaVersion = '1.0';
    changes.push('schemaVersion');
  }
  if (!isRecord(packet.provenance)) {
    packet.provenance = {};
    changes.push('provenance');
  }
  const provenance = packet.provenance as Record<string, unknown>;
  if (typeof provenance.generatedAt !== 'string' || !provenance.generatedAt.trim()) {
    provenance.generatedAt = now;
    changes.push('provenance.generatedAt');
  }

  ARRAY_SHAPE_PATHS.forEach((path) => {
    if (!Array.isArray(valueAtPath(packet, path))) {
      setValueAtPath(packet, path, []);
      changes.push(path);
      if (REPAIR_AFTER_MIGRATION.has(path)) requiresRepair.push(path);
    }
  });

  const sceneProgram = valueAtPath(packet, 'mediaTranslations.spatial.sceneProgram');
  const legacyFunctionalExperience = valueAtPath(
    packet,
    'mediaTranslations.spatial.functionalExperience',
  );
  if (
    Array.isArray(sceneProgram)
    && sceneProgram.length === 0
    && Array.isArray(legacyFunctionalExperience)
    && legacyFunctionalExperience.length > 0
  ) {
    setValueAtPath(
      packet,
      'mediaTranslations.spatial.sceneProgram',
      structuredClone(legacyFunctionalExperience),
    );
    changes.push('mediaTranslations.spatial.sceneProgram');
  }

  const legacyRisks = valueAtPath(packet, 'diagnosis.brandMisreadRisks');
  if (Array.isArray(legacyRisks)) {
    const normalizedRisks = legacyRisks.map((value, index) => {
      if (!isRecord(value)) return value;
      const risk = structuredClone(value);
      const appliesTo = isRecord(risk.appliesTo) ? risk.appliesTo : {};
      const subtypes = Array.isArray(appliesTo.subtypes) ? appliesTo.subtypes : [];
      return {
        ...risk,
        code: typeof risk.code === 'string' && risk.code.trim()
          ? risk.code
          : `legacy-risk-${index + 1}`,
        description: typeof risk.description === 'string' && risk.description.trim()
          ? risk.description
          : risk.target,
        appliesTo,
        // Unscoped legacy risks must not silently become executable constraints.
        status: risk.status === 'confirmed' && subtypes.length
          ? 'confirmed'
          : 'probable',
      };
    });
    if (JSON.stringify(normalizedRisks) !== JSON.stringify(legacyRisks)) {
      setValueAtPath(packet, 'diagnosis.brandMisreadRisks', normalizedRisks);
      changes.push('diagnosis.brandMisreadRisks');
    }
  }

  if (typeof provenance.sourceFingerprint !== 'string' || !provenance.sourceFingerprint.trim()) {
    provenance.sourceFingerprint = computeSourceFingerprint(packet);
    changes.push('provenance.sourceFingerprint');
  }
  if (!isRecord(packet.repairMetadata)) {
    packet.repairMetadata = {
      schemaVersion: '1.0',
      fields: {},
    };
    changes.push('repairMetadata');
  }

  return {
    packet,
    fromVersion,
    toVersion: '1.0',
    migrated: changes.length > 0,
    changes,
    requiresRepair: [...new Set(requiresRepair)],
  };
}
