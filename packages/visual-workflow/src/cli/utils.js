import fs from "node:fs/promises";
import path from "node:path";
const IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"]);
function normalizeHex(value) {
  if (!value) return null;
  const raw = String(value).trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(raw)) return `#${raw.split("").map((x) => x + x).join("").toUpperCase()}`;
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toUpperCase()}`;
  return null;
}
function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
function slug(value) {
  return String(value).trim().replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "") || "project";
}
function relativePortable(root, target) {
  return path.relative(root, target).split(path.sep).join("/");
}
async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}
async function writeText(file, content) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, content.replace(/\r?\n/g, "\n"), "utf8");
}
async function readJson(file, fallback = {}) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw new Error(`\u914D\u7F6E\u6587\u4EF6\u65E0\u6CD5\u8BFB\u53D6\uFF1A${file}\uFF08${error.message}\uFF09`);
  }
}
function mdCell(value) {
  return String(value ?? "\u2014").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}
function decodeEntities(value) {
  return String(value).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
function extractXmlText(xml) {
  return decodeEntities(String(xml).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
export {
  IMAGE_EXTENSIONS,
  decodeEntities,
  ensureDir,
  extractXmlText,
  mdCell,
  normalizeHex,
  nowIso,
  readJson,
  relativePortable,
  slug,
  unique,
  writeText
};
