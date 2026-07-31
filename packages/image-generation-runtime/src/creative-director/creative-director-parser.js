export function parseCreativeDirectorResponse(value) {
  if (value && typeof value === 'object') return value;
  const text = String(value ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(text);
}
