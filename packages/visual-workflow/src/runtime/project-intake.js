import path from "node:path";
const INDUSTRY_SIGNALS = [
  { pattern: /医美|医疗美容|医学美学|整形|皮肤管理|口腔|医院|诊所/i, industry: "\u533B\u5B66\u7F8E\u5B66 / \u533B\u7597\u5065\u5EB7", confidence: 0.82 },
  { pattern: /食品|餐饮|零食|饮料|咖啡|茶饮|烘焙|酒|调味|乳业/i, industry: "\u98DF\u54C1 / \u9910\u996E\u6D88\u8D39", confidence: 0.78 },
  { pattern: /文旅|旅游|景区|酒店|民宿|度假|城市文创/i, industry: "\u6587\u5316\u65C5\u6E38 / \u6587\u521B", confidence: 0.8 },
  { pattern: /美妆|护肤|香氛|彩妆|个护/i, industry: "\u7F8E\u5986 / \u4E2A\u4EBA\u62A4\u7406", confidence: 0.8 },
  { pattern: /服装|服饰|时尚|鞋履|珠宝|配饰/i, industry: "\u65F6\u5C1A / \u670D\u9970", confidence: 0.76 },
  { pattern: /教育|学校|课程|培训|学院/i, industry: "\u6559\u80B2 / \u57F9\u8BAD", confidence: 0.76 },
  { pattern: /金融|银行|保险|证券|基金|财富/i, industry: "\u91D1\u878D\u670D\u52A1", confidence: 0.8 },
  { pattern: /科技|软件|智能|机器人|数据|云计算|AI|SaaS/i, industry: "\u79D1\u6280 / \u6570\u5B57\u670D\u52A1", confidence: 0.7 },
  { pattern: /地产|住宅|商业空间|建筑|家居|家具/i, industry: "\u5730\u4EA7 / \u7A7A\u95F4 / \u5BB6\u5C45", confidence: 0.74 }
];
const GENERIC_PROJECT_NAMES = /* @__PURE__ */ new Set([
  "input",
  "images",
  "image",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "pdf",
  "zip",
  "visual",
  "assets",
  "files",
  "upload",
  "uploads",
  "project",
  "design",
  "\u9879\u76EE",
  "\u54C1\u724C",
  "\u65B9\u6848",
  "\u89C6\u89C9\u65B9\u6848",
  "\u6253\u5305\u6587\u4EF6",
  "\u65B0\u5EFA\u6587\u4EF6\u5939",
  "\u672A\u547D\u540D"
]);
const EXCLUDED_NAME_SIGNALS = /站酷|zcool|behance|dribbble|pinterest|作品集|portfolio|mockup|样机|template|模板|watermark|水印|设计师|designer|design\s*by|designed\s*by|adobe|photoshop|illustrator|figma|masterpiece\s*os/i;
function timestampName(now) {
  const pad = (value) => String(value).padStart(2, "0");
  return `\u89C6\u89C9\u9879\u76EE-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}
function filenameStem(sourcePath) {
  return path.parse(sourcePath).name.trim();
}
function commonPrefix(values) {
  if (!values.length) return "";
  let prefix = values[0] || "";
  for (const value of values.slice(1)) {
    let index = 0;
    while (index < prefix.length && index < value.length && prefix[index]?.toLowerCase() === value[index]?.toLowerCase()) index += 1;
    prefix = prefix.slice(0, index);
    if (!prefix) break;
  }
  return prefix.replace(/[\s._\-—–()（）【】\[\]0-9]+$/g, "").trim();
}
function cleanCandidate(value) {
  return value.replace(/\.(?:jpe?g|png|webp|pdf|zip)$/i, "").replace(/(?:品牌)?(?:视觉方案|设计方案|品牌手册|视觉手册|VI手册|VI|design|proposal|presentation|最终版|终稿)+$/gi, "").replace(/^[\s._\-—–()（）【】\[\]0-9]+|[\s._\-—–()（）【】\[\]0-9]+$/g, "").trim();
}
function isUsableProjectName(value) {
  const cleaned = cleanCandidate(value);
  if (cleaned.length < 2 || cleaned.length > 80) return false;
  if (GENERIC_PROJECT_NAMES.has(cleaned.toLowerCase())) return false;
  if (EXCLUDED_NAME_SIGNALS.test(cleaned)) return false;
  return true;
}
function deriveProjectName(sources, now = /* @__PURE__ */ new Date()) {
  const archive = sources.find((source) => !source.isDirectory && path.extname(source.sourcePath).toLowerCase() === ".zip");
  if (archive && isUsableProjectName(filenameStem(archive.sourcePath))) {
    return { projectName: cleanCandidate(filenameStem(archive.sourcePath)), projectNameSource: "uploaded-archive-name" };
  }
  const folder = sources.find((source) => source.isDirectory);
  if (folder && isUsableProjectName(path.basename(folder.sourcePath))) {
    return { projectName: cleanCandidate(path.basename(folder.sourcePath)), projectNameSource: "uploaded-folder-name" };
  }
  const stems = sources.filter((source) => !source.isDirectory).map((source) => filenameStem(source.sourcePath)).filter(Boolean);
  const prefix = commonPrefix(stems);
  if (isUsableProjectName(prefix)) return { projectName: cleanCandidate(prefix), projectNameSource: "common-file-prefix" };
  if (stems.length === 1 && stems[0] && isUsableProjectName(stems[0])) {
    return { projectName: cleanCandidate(stems[0]), projectNameSource: "common-file-prefix" };
  }
  return { projectName: timestampName(now), projectNameSource: "fallback-datetime" };
}
function detectBrandName(projectName) {
  const cleaned = cleanCandidate(projectName);
  return cleaned || projectName;
}
function detectIntakeIdentity(sources, labels, now = /* @__PURE__ */ new Date()) {
  const named = deriveProjectName(sources, now);
  const evidence = [named.projectName, ...labels].join("\n");
  const industryMatch = INDUSTRY_SIGNALS.find((signal) => signal.pattern.test(evidence));
  const detectedBrandName = detectBrandName(named.projectName);
  const brandConfidence = named.projectNameSource === "fallback-datetime" ? 0 : named.projectNameSource === "common-file-prefix" ? 0.62 : 0.72;
  return {
    ...named,
    detectedBrandName,
    detectedIndustry: industryMatch?.industry || "\u5F85\u786E\u8BA4\uFF08\u57FA\u4E8E\u73B0\u6709\u7D20\u6750\u63A8\u65AD\uFF09",
    factConfidence: {
      brandName: brandConfidence,
      industry: industryMatch?.confidence || 0
    }
  };
}
export {
  deriveProjectName,
  detectIntakeIdentity,
  isUsableProjectName
};
