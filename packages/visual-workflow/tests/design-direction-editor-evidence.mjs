import assert from 'node:assert/strict';

const lines=value=>String(value || '').split('\n').map(item=>item.trim()).filter(Boolean);
export function assertEditorSemanticFidelity(fields,confirmation,effectivePacket,formalPrompt,providerBody) {
  const rows=[];const spatial=confirmation.spatialTranslation;
  for(const field of ['colorSystem','materialSystem','mediaTranslations.spatial'])assert(effectivePacket.provenance.userConfirmedFields.includes(field));
  const check=(inputPath,targetPath,expected,actual,effective,terms=[])=>{
    assert.deepEqual(actual,expected,targetPath);assert.deepEqual(effective,expected,`effective Packet ${targetPath}`);
    for(const term of terms){assert(formalPrompt.toLowerCase().includes(term.toLowerCase()),`Formal Prompt lost ${inputPath}: ${term}`);assert(providerBody.prompt.toLowerCase().includes(term.toLowerCase()),`Provider lost ${inputPath}: ${term}`);}
    rows.push({inputPath,targetPath,input:expected,confirmation:actual,effectivePacket:effective,promptTermsVerified:terms,promptComparison:'case-insensitive English; exact Packet values',status:'PASS'});
  };
  for(const [index,item] of fields.colorEntries.entries()) {
    const role=item.paletteRole;const offset=fields.colorEntries.slice(0,index).filter(entry=>entry.paletteRole===role).length;
    const actual=spatial.colorBehavior[role][offset],effective=effectivePacket.colorSystem[role][offset];
    for(const key of ['name','role','surfaceApplicability','spatialUsage'])check(`colorEntries[${index}].${key}`,`colorSystem.${role}[${offset}].${key}`,item[key],actual[key],effective[key],[item[key]]);
  }
  for(const role of ['primary','secondary','accent'])assert.equal(effectivePacket.colorSystem[role].length,fields.colorEntries.filter(item=>item.paletteRole===role).length);
  for(const [index,item] of fields.materialEntries.entries())for(const key of ['material','brandRole','behavior','forbidden']) {
    const expected=['behavior','forbidden'].includes(key)?lines(item[key]):item[key];
    check(`materialEntries[${index}].${key}`,`materialSystem[${index}].${key}`,expected,spatial.materialLanguage[index][key],effectivePacket.materialSystem[index][key],Array.isArray(expected)?expected:[expected]);
  }
  const mappings={functionalProgram:'sceneProgram',functionalNetwork:'functionalNetwork',functionalRelationships:'functionalRelationships',visibleRequirements:'mustBeVisible',compositionRequirements:'compositionRequirements'};
  for(const [input,target] of Object.entries(mappings)) {
    const expected=lines(fields[input]);
    // The existing cross-zone projection splits clauses and keeps the other
    // interiors off frame. Both original relation and visible clauses are checked.
    const terms=input==='functionalRelationships'?expected.flatMap(item=>item.split(';').map(part=>part.trim().replace(/[.]$/u,''))):expected;
    check(input,`mediaTranslations.spatial.${target}`,expected,spatial[target],effectivePacket.mediaTranslations.spatial[target],terms);
  }
  check('colorAvoid','colorSystem.forbidden',lines(fields.colorAvoid),spatial.colorBehavior.forbidden,effectivePacket.colorSystem.forbidden,lines(fields.colorAvoid));
  check('mustAvoid','creativeDecision.strategicNegatives',lines(fields.mustAvoid),confirmation.creativeDecision.strategicNegatives,effectivePacket.creativeDecision.strategicNegatives,lines(fields.mustAvoid));
  for(const [input,target] of Object.entries({spatialConcept:'spatialConcept',structureLanguage:'structureLanguage',artisticFocus:'signatureSpatialMechanism'})) {
    const expected=input==='spatialConcept'?fields[input]:lines(fields[input]);
    check(input,`mediaTranslations.spatial.${target}`,expected,spatial[target],effectivePacket.mediaTranslations.spatial[target],Array.isArray(expected)?expected:[expected]);
  }
  for(const [input,target] of Object.entries({lightingLanguage:'source',lightingContrast:'contrast',lightingInteraction:'interactionWithMaterials',lightingAvoid:'forbidden'})) {
    const expected=input==='lightingContrast'?fields[input]:lines(fields[input]);
    check(input,`lightingSystem.${target}`,expected,spatial.lightingLanguage[target],effectivePacket.lightingSystem[target],Array.isArray(expected)?expected:[expected]);
  }
  assert.notDeepEqual(spatial.sceneProgram,spatial.functionalNetwork);assert.notDeepEqual(spatial.functionalNetwork,spatial.functionalRelationships);
  assert.equal(Object.hasOwn(providerBody,'image'),false);assert(providerBody.prompt.endsWith(formalPrompt));
  return {status:'PASS',referenceImages:0,imageFieldPresent:false,rows,crossRegionPolicy:'Original relation preserved in Packet; clauses projected into current-shot operational and privacy boundaries'};
}
