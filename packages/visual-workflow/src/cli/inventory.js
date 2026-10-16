import fs from "node:fs/promises";
import path from "node:path";
import { IMAGE_EXTENSIONS, relativePortable } from "./utils.js";
import { parseFile } from "./parsers.js";
import { measureRuntimeStage } from "./runtime-trace.js";
const TYPE_NAMES = {
  ".zip": "ZIP \u538B\u7F29\u5305",
  ".pdf": "PDF \u6587\u6863",
  ".ppt": "PPT \u6F14\u793A\u6587\u7A3F",
  ".pptx": "PPT \u6F14\u793A\u6587\u7A3F",
  ".potx": "PPT \u6A21\u677F",
  ".ppsx": "PPT \u653E\u6620\u6587\u4EF6",
  ".png": "\u56FE\u7247",
  ".jpg": "\u56FE\u7247",
  ".jpeg": "\u56FE\u7247",
  ".gif": "\u56FE\u7247",
  ".webp": "\u56FE\u7247",
  ".svg": "\u77E2\u91CF\u56FE\u7247",
  ".bmp": "\u56FE\u7247",
  ".md": "\u6587\u672C",
  ".txt": "\u6587\u672C",
  ".json": "\u6570\u636E",
  ".csv": "\u6570\u636E"
};
async function walk(root, current, output, ignores, ignorePaths) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  for (const entry of entries) {
    if (ignores.has(entry.name)) continue;
    const full = path.join(current, entry.name);
    if (ignorePaths.has(path.resolve(full))) continue;
    if (entry.isDirectory()) await walk(root, full, output, ignores, ignorePaths);
    else if (entry.isFile()) output.push(full);
  }
}
async function inventoryProject(root, options = {}) {
  const resolved = path.resolve(root);
  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat?.isDirectory()) throw new Error(`\u7D20\u6750\u76EE\u5F55\u4E0D\u5B58\u5728\uFF1A${resolved}`);
  const files = [];
  await walk(
    resolved,
    resolved,
    files,
    /* @__PURE__ */ new Set([".git", "node_modules", ...options.ignore || []]),
    new Set((options.ignorePaths || []).map((x) => path.resolve(x)))
  );
  const items = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const stat2 = await fs.stat(file);
    let detail = {};
    let warning = null;
    try {
      detail = await parseFile(file, ext);
    } catch (error) {
      warning = error.message;
    }
    items.push({
      path: relativePortable(resolved, file),
      name: path.basename(file),
      extension: ext || "\u2014",
      type: TYPE_NAMES[ext] || "\u5176\u4ED6",
      bytes: stat2.size,
      isImage: IMAGE_EXTENSIONS.has(ext),
      detail,
      warning
    });
  }
  const byType = {};
  for (const item of items) byType[item.type] = (byType[item.type] || 0) + 1;
  return {
    root: resolved,
    totalFiles: items.length,
    totalBytes: items.reduce((sum, x) => sum + x.bytes, 0),
    imageCount: items.filter((x) => x.isImage).length,
    byType,
    items
  };
}
async function inventoryProjectWithTrace(root, options = {}) {
  const measured = await measureRuntimeStage("readAssets", {
    label: "Read Assets",
    provider: "filesystem",
    resultDetails: (result) => ({
      inputCount: result.totalFiles,
      outputCount: result.items.length,
      metrics: { fileReads: result.totalFiles, retries: 0 }
    })
  }, () => inventoryProject(root, options));
  return { inventory: measured.value, runtimeTrace: measured.runtimeTrace };
}
export {
  inventoryProject,
  inventoryProjectWithTrace
};
