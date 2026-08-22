export const G02_ANCHOR_EPISTEMIC_EXPECTATIONS = Object.freeze([
  'FACT',
  'USER_REQUIREMENT',
  'MIXED',
  'OPEN'
]);

export const G02_ANCHOR_EPISTEMIC_CONTRACT = Object.freeze({
  values: G02_ANCHOR_EPISTEMIC_EXPECTATIONS,
  openMeaning: 'Reviewer does not predict the final epistemic class.',
  expectationAuthority: 'NON_AUTHORITATIVE',
  runtimeAuthority: 'deterministic Planning epistemic classifier',
  unknownIsExpectationValue: false
});
