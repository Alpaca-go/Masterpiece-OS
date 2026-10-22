// Read-only projection of the current project's analysis. This never creates a
// user decision, a confirmation, or missing spatial permissions.
export function analysisDirectionSuggestion(projectId, packet, analysisFingerprint) {
  if (typeof projectId !== 'string' || !projectId.trim() || packet && packet.projectId !== projectId) throw new Error('ANALYSIS_DIRECTION_PROJECT_MISMATCH');
  const fields = {};
  const sourcePaths = {};
  const missingFields = [];
  const missing = (field, reason = 'missing_or_insufficient_source') => missingFields.push({field, reason});
  const known = value => typeof value === 'string' && value.trim() &&
    !/^(?:unknown|待明确|待补充|待定|未知|暂无可靠证据|无可靠证据)[。.!！]?$/iu.test(value.trim());
  const entries = (value, path) => (Array.isArray(value) ? value : [value])
    .flatMap((item, index) => known(item) ? [{value:item.trim(), path:Array.isArray(value) ? `${path}[${index}]` : path}] : []);
  function assign(field, value, path) {
    const selected = entries(value, path);
    fields[field] = selected.map(item => item.value).join('\n');
    if (selected.length) sourcePaths[field] = selected.map(item => item.path);
    else missing(field);
  }
  const spatialPath = 'mediaTranslations.spatial';
  const spatial = packet?.mediaTranslations?.spatial || {};
  // An insufficient Packet may still have individual, explicitly populated
  // fields. Project-wide or diagnostic text is never used as a fallback.
  const direct = {
    spatialConcept:'spatialConcept', structureLanguage:'structureLanguage',
    lightingLanguage:'lightingLanguage.source', lightingContrast:'lightingLanguage.contrast',
    lightingInteraction:'lightingLanguage.interactionWithMaterials', lightingAvoid:'lightingLanguage.forbidden',
    colorAvoid:'colorBehavior.forbidden', functionalProgram:'sceneProgram',
    functionalNetwork:'functionalNetwork', functionalRelationships:'functionalRelationships',
    visibleRequirements:'mustBeVisible', artisticFocus:'signatureSpatialMechanism',
    compositionRequirements:'compositionRequirements',
  };
  for (const [field, relative] of Object.entries(direct)) {
    assign(field, relative.split('.').reduce((value, key) => value?.[key], spatial), `${spatialPath}.${relative}`);
  }
  // Explicit analysis negatives remain suggestions. Misread-risk observations
  // and tone-boundary warnings are not promoted to prohibitions.
  assign('mustAvoid', packet?.creativeDecision?.strategicNegatives, 'creativeDecision.strategicNegatives');
  fields.colorEntries = [];
  for (const paletteRole of ['primary','secondary','accent']) {
    const colors = spatial.colorBehavior?.[paletteRole];
    if (!Array.isArray(colors)) continue;
    colors.forEach((color, index) => {
      if (!known(color?.name)) return;
      const field = `colorEntries[${fields.colorEntries.length}]`;
      const path = `${spatialPath}.colorBehavior.${paletteRole}[${index}]`;
      const result = {name:color.name.trim(), paletteRole, role:'', surfaceApplicability:'', spatialUsage:''};
      sourcePaths[`${field}.name`] = [`${path}.name`];
      sourcePaths[`${field}.paletteRole`] = [`${spatialPath}.colorBehavior.${paletteRole}`];
      for (const key of ['role','surfaceApplicability','spatialUsage']) {
        const allowed = key !== 'spatialUsage' || ['dominant_field','secondary_surface','local_accent','soft_furnishing','detail_trim','post_composite_only'].includes(color[key]);
        if (known(color[key]) && allowed) { result[key] = color[key].trim(); sourcePaths[`${field}.${key}`] = [`${path}.${key}`]; }
        else missing(`${field}.${key}`, key === 'role' ? 'missing_or_insufficient_source' : 'explicit_spatial_scope_required');
      }
      fields.colorEntries.push(result);
    });
  }
  if (!fields.colorEntries.length) missing('colorEntries');
  fields.colorPolicy = fields.colorEntries.map(item => [item.name,item.role,item.surfaceApplicability].filter(Boolean).join('：')).join('\n');
  if (fields.colorPolicy) sourcePaths.colorPolicy = Object.entries(sourcePaths).filter(([key]) => /^colorEntries\[\d+\]\.(name|role|surfaceApplicability)$/u.test(key)).flatMap(([,paths]) => paths);
  else missing('colorPolicy');
  fields.materialEntries = [];
  if (Array.isArray(spatial.materialLanguage)) spatial.materialLanguage.forEach((material, index) => {
    const name = typeof material === 'string' ? material : material?.material;
    if (!known(name)) return;
    const field = `materialEntries[${fields.materialEntries.length}]`;
    const path = `${spatialPath}.materialLanguage[${index}]`;
    const result = {material:name.trim(), behavior:'', brandRole:'', forbidden:''};
    sourcePaths[`${field}.material`] = [typeof material === 'string' ? path : `${path}.material`];
    for (const key of ['behavior','brandRole','forbidden']) {
      const selected = entries(typeof material === 'object' ? material[key] : null, `${path}.${key}`);
      result[key] = selected.map(item => item.value).join('\n');
      if (selected.length) sourcePaths[`${field}.${key}`] = selected.map(item => item.path);
      else missing(`${field}.${key}`, key === 'brandRole' ? 'explicit_material_role_required' : 'missing_or_insufficient_source');
    }
    fields.materialEntries.push(result);
  });
  if (!fields.materialEntries.length) missing('materialEntries');
  fields.materialLanguage = fields.materialEntries.map(item => [item.material,item.behavior].filter(Boolean).join('：')).join('\n');
  if (fields.materialLanguage) sourcePaths.materialLanguage = Object.entries(sourcePaths).filter(([key]) => /^materialEntries\[\d+\]\.(material|behavior)$/u.test(key)).flatMap(([,paths]) => paths);
  else missing('materialLanguage');
  return {projectId, sourceType:'analysis_suggestion', analysisFingerprint, fields, sourcePaths, missingFields};
}
