type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function valueAtPath(root: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => (
    isRecord(current) ? current[segment] : undefined
  ), root);
}

export function nonEmptyText(value: unknown): boolean {
  return typeof value === 'string' && Boolean(value.trim());
}

export function nonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

export function collectEvidenceRefs(root: unknown, paths: string[]): string[] {
  const refs: string[] = [];
  const visit = (value: unknown, key = ''): void => {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key));
      return;
    }
    if (!isRecord(value)) {
      if (
        typeof value === 'string'
        && value.trim()
        && ['evidenceRefs', 'createdFrom', 'assetId', 'sourceAsset'].includes(key)
        && !refs.includes(value.trim())
      ) {
        refs.push(value.trim());
      }
      return;
    }
    Object.entries(value).forEach(([childKey, child]) => visit(child, childKey));
  };
  paths.forEach((path) => visit(valueAtPath(root, path)));
  return refs.slice(0, 80);
}

export function setValueAtPath(root: UnknownRecord, path: string, value: unknown): void {
  const segments = path.split('.');
  const leaf = segments.pop();
  if (!leaf) return;
  let current = root;
  for (const segment of segments) {
    if (!isRecord(current[segment])) current[segment] = {};
    current = current[segment] as UnknownRecord;
  }
  current[leaf] = value;
}

export function isMeaningfulValue(value: unknown): boolean {
  if (typeof value === 'string') return Boolean(value.trim());
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return value !== undefined && value !== null;
}

export function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stableValue(child)]),
  );
}
