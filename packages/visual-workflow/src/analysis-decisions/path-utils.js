function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function valueAtPath(root, path) {
  return path.split(".").reduce((current, segment) => isRecord(current) ? current[segment] : void 0, root);
}
function nonEmptyText(value) {
  return typeof value === "string" && Boolean(value.trim());
}
function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}
function collectEvidenceRefs(root, paths) {
  const refs = [];
  const visit = (value, key = "") => {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key));
      return;
    }
    if (!isRecord(value)) {
      if (typeof value === "string" && value.trim() && ["evidenceRefs", "createdFrom", "assetId", "sourceAsset"].includes(key) && !refs.includes(value.trim())) {
        refs.push(value.trim());
      }
      return;
    }
    Object.entries(value).forEach(([childKey, child]) => visit(child, childKey));
  };
  paths.forEach((path) => visit(valueAtPath(root, path)));
  return refs.slice(0, 80);
}
function setValueAtPath(root, path, value) {
  const segments = path.split(".");
  const leaf = segments.pop();
  if (!leaf) return;
  let current = root;
  for (const segment of segments) {
    if (!isRecord(current[segment])) current[segment] = {};
    current = current[segment];
  }
  current[leaf] = value;
}
function isMeaningfulValue(value) {
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return value !== void 0 && value !== null;
}
function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, stableValue(child)])
  );
}
export {
  collectEvidenceRefs,
  isMeaningfulValue,
  isRecord,
  nonEmptyArray,
  nonEmptyText,
  setValueAtPath,
  stableValue,
  valueAtPath
};
