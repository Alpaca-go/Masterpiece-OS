// The explicit, coarse style axes shared by the task contract and the curated
// style presets. Kept in its own module so the presets can validate against the
// same list without importing the contract back (no module cycle).
export const STYLE_AXES = Object.freeze({
  lighting: ['bright', 'warm_dim', 'natural', 'designer_choice'],
  density: ['sparse', 'balanced', 'dense', 'designer_choice'],
  materials: ['brick_wood', 'metal', 'stone', 'plaster', 'mixed', 'designer_choice'],
  brandColorArea: ['accent', 'half', 'dominant', 'designer_choice'],
  tradition: ['modern', 'balanced', 'traditional', 'designer_choice'],
  props: ['none', 'lived_in', 'designer_choice'],
  shot: ['entrance', 'interior', 'detail', 'designer_choice'],
  textDensity: ['minimal', 'moderate', 'rich', 'designer_choice'],
  priceDisplay: ['none', 'real_menu', 'placeholder'],
});

export const STYLE_DEFAULTS = Object.freeze({
  lighting: 'designer_choice',
  density: 'designer_choice',
  materials: 'designer_choice',
  brandColorArea: 'designer_choice',
  tradition: 'designer_choice',
  props: 'designer_choice',
  shot: 'designer_choice',
  textDensity: 'designer_choice',
  // Policy A: no numeric prices in generated images unless a real menu is supplied.
  priceDisplay: 'none',
});

// Unknown values fall back to the axis default instead of failing the task.
export function cleanStyleControls(value) {
  const source = value && typeof value === 'object' ? value : {};
  const out = {};
  for (const [axis, allowed] of Object.entries(STYLE_AXES)) {
    const candidate = String(source[axis] ?? '').trim();
    out[axis] = allowed.includes(candidate) ? candidate : STYLE_DEFAULTS[axis];
  }
  return out;
}
