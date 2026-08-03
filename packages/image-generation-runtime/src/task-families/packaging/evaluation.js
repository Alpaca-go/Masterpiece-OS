import { getPackagingShotDefinition } from './shot-library.js';

function bounded(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : null;
}

function criterion(id, passed, score, reason) {
  return { id, passed, ...(score === null ? {} : { score }), reason };
}

export function evaluatePackagingEvidence(input = {}) {
  const shot = getPackagingShotDefinition(input.shotId);
  if (!shot) return null;
  const evidence = input.evidence?.packagingQa;
  if (!evidence || typeof evidence !== 'object') {
    return {
      schemaVersion: '1.0',
      shotId: shot.id,
      status: 'unverified',
      criteria: shot.evaluationCriteria.map((id) => criterion(id, false, null, 'visible_evidence_missing')),
      failures: ['PACKAGING_EVALUATION_EVIDENCE_MISSING'],
    };
  }
  const logoFidelity = bounded(evidence.logoFidelity);
  const criteria = [
    criterion('logo_fidelity', logoFidelity !== null && logoFidelity >= 0.92, logoFidelity,
      logoFidelity === null ? 'not_measured' : 'minimum_0.92'),
    criterion('structure', evidence.structureMatch === true, null, 'confirmed_structure_must_match'),
    criterion('material', evidence.materialMatch === true, null, 'requested_substrate_must_match'),
    criterion('commercial_photography', evidence.commercialPhotography === true, null,
      'must_read_as_finished_product_photography'),
    criterion('product_hierarchy', evidence.productHierarchyMatch === true, null,
      'primary_and_secondary_products_must_be_legible'),
    criterion('group_relationship', evidence.groupRelationshipMatch === true, null,
      'products_must_form_one_coherent_family'),
    criterion('series_consistency', evidence.seriesConsistencyMatch === true, null,
      'locked_identity_grid_material_and_camera_must_remain_consistent'),
    criterion('box_structure', evidence.boxStructureMatch === true, null,
      'outer_box_opening_relationship_must_match'),
    criterion('insert_structure', evidence.insertStructureMatch === true, null,
      'insert_must_support_products_with_credible_clearance'),
    criterion('product_arrangement', evidence.productArrangementMatch === true, null,
      'contained_products_must_match_confirmed_count_and_layout'),
    criterion('structural_realism', evidence.structuralRealism === true, null,
      'open_package_must_be_manufacturable_and_physically_connected'),
  ].filter((item) => shot.evaluationCriteria.includes(item.id));
  const failures = criteria.filter((item) => !item.passed).map((item) => `PACKAGING_${item.id.toUpperCase()}_FAILED`);
  return {
    schemaVersion: '1.0',
    shotId: shot.id,
    status: failures.length ? 'failed' : 'passed',
    criteria,
    failures,
  };
}
