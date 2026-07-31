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
