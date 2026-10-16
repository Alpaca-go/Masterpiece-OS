import fs from "node:fs/promises";
import path from "node:path";
import { atomicWriteJsonWithRetry } from "./runtime/atomic-write.js";
import { isAnalysisSourceAsset } from "./project-assets.js";
const PROJECT_VISUAL_CONTEXT_SCHEMA_VERSION = "1.0";
const PROJECT_VISUAL_CONTEXT_COMPILER_VERSION = "1.0.0";
const UNKNOWN = "unknown";
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function dedupe(values) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}
function parseReportSections(markdown) {
  const sections = [];
  let current = null;
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match) {
      const heading = match[2];
      if (heading) {
        current = { heading: heading.trim(), text: "" };
        sections.push(current);
      }
    } else if (current) {
      current.text += `${line}
`;
    } else {
      current = { heading: "", text: `${line}
` };
      sections.push(current);
    }
  }
  return sections;
}
function sectionsMatching(sections, pattern) {
  return sections.filter((section) => pattern.test(section.heading));
}
function cleanInline(text) {
  return text.replace(/\*\*/g, "").replace(/[*`_~]/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim();
}
function extractBullets(text) {
  const items = [];
  for (const line of text.split(/\r?\n/)) {
    const bullet = /^\s*[-*·]\s+(.*)$/.exec(line) || /^\s*\d+[.、)]\s+(.*)$/.exec(line);
    if (bullet) {
      const value = bullet[1];
      if (value) items.push(cleanInline(value));
    }
  }
  return items;
}
function extractTableRows(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.includes("|")) continue;
    if (/^\s*\|?[\s:-]+\|?\s*$/.test(line)) continue;
    const cells = line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((cell) => cleanInline(cell));
    if (cells.length >= 2) rows.push(cells);
  }
  return rows;
}
function extractBoldLeads(text) {
  const items = [];
  const regex = /\*\*([^*：:]+)[：:]\*\*/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const value = match[1];
    if (value) items.push(cleanInline(value));
  }
  return items;
}
function collectTokens(text, tokens) {
  const found = [];
  for (const token of tokens) {
    if (text.includes(token)) found.push(token);
  }
  return found;
}
const CONFIRMED_STRUCTURE_PATTERNS = [
  /明确确认/i,
  /已确认.*(结构|包装)/i,
  /确认包装结构/i,
  /刀版图/i,
  /结构图/i,
  /真实产品实拍/i,
  /人工审核确认/i,
  /结构已锁定/i
];
const STRUCTURE_KEYWORDS = [
  "\u9676\u7F50",
  "\u7F50",
  "\u76D2",
  "\u888B",
  "\u74F6",
  "\u676F",
  "\u7897",
  "\u6876",
  "\u793C\u76D2",
  "\u6807\u7B7E",
  "\u74F6\u8D34",
  "\u5C01\u7B7E",
  "\u7B77\u5957",
  "\u9910\u5DFE",
  "\u624B\u63D0\u888B",
  "\u7F50\u4F53",
  "\u76D2\u578B",
  "\u5305\u88C5",
  "\u7ED3\u6784"
];
const COLOR_TOKENS = [
  "\u8FA3\u6912\u7EA2",
  "\u70AD\u9ED1",
  "\u7C73\u7EB8\u767D",
  "\u7C73\u767D",
  "\u4E9A\u5149\u9ED1",
  "\u642A\u74F7\u767D",
  "\u642A\u74F7",
  "\u7C73\u7EB8",
  "\u7EA2",
  "\u9ED1",
  "\u767D",
  "\u91D1",
  "\u94F6",
  "\u84DD",
  "\u7EFF",
  "\u9752",
  "\u6A59",
  "\u9EC4",
  "\u7D2B",
  "\u7070",
  "\u7C89"
];
const GRAPHIC_TOKENS = [
  "\u5370\u7AE0",
  "\u7B26\u53F7",
  "\u8138\u8C31",
  "\u725B\u526A\u5F71",
  "\u7897\u53E3\u5706\u5F27",
  "\u84B8\u6C7D",
  "\u6CE2\u7EB9",
  "\u4E66\u6CD5",
  "\u63D2\u753B",
  "\u7EB9\u7406",
  "\u5E95\u7EB9",
  "\u7F51\u683C",
  "\u8D85\u7EA7\u56FE\u5F62",
  "\u5706\u5F62\u51AF\u7B26\u53F7",
  "\u5DDD\u83DC\u5C0F\u9986\u7AE0",
  "\u56FE\u6848"
];
const TYPOGRAPHY_TOKENS = [
  "\u4E66\u5199\u4F53",
  "\u624B\u5199\u4F53",
  "\u5B8B\u4F53",
  "\u886C\u7EBF",
  "\u9ED1\u4F53",
  "\u7C97\u9ED1",
  "\u8F6E\u5ED3\u82F1\u6587",
  "\u7F57\u9A6C\u5B57",
  "\u4E66\u6CD5",
  "\u5B57\u4F53\u5BB6\u65CF",
  "\u6807\u51C6\u5B57"
];
const MATERIAL_TOKENS = [
  "\u7C73\u7EB8",
  "\u4E9A\u5149",
  "\u642A\u74F7",
  "\u91D1\u5C5E",
  "\u4E1D\u5370",
  "\u538B\u51F9",
  "\u53D1\u5149\u5B57",
  "\u5355\u8272\u53CD\u767D",
  "\u5DE5\u827A",
  "\u6750\u8D28",
  "\u5851\u6599",
  "\u6728",
  "\u76AE\u9769"
];
const PHOTOGRAPHY_TOKENS = [
  "\u5B9E\u62CD",
  "\u6444\u5F71",
  "\u70ED\u6C64",
  "\u725B\u8089\u7897",
  "\u8FD1\u666F",
  "45\u5EA6",
  "\u98DF\u6B32",
  "\u771F\u5B9E\u9910\u98DF",
  "\u98DF\u7269\u7279\u5199",
  "\u573A\u666F",
  "\u5149\u7EBF",
  "\u9006\u5149",
  "\u84B8\u6C7D"
];
const PACKAGING_TOKENS = ["\u5305\u88C5", "\u5916\u5356\u5305\u88C5", "\u9910\u5DFE", "\u7B77\u5957", "\u888B\u5B50", "\u793C\u76D2", "\u6807\u7B7E", "\u74F6\u8D34", "\u5C01\u7B7E"];
const VI_TOKENS = ["\u95E8\u5E97\u62DB\u724C", "\u83DC\u5355", "\u70B9\u9910\u5C4F", "\u6D77\u62A5", "\u793E\u4EA4\u5A92\u4F53", "\u5C01\u7B7E", "\u540D\u7247", "\u4E3B\u6D77\u62A5"];
const SPATIAL_TOKENS = ["\u95E8\u5E97", "\u7A7A\u95F4", "\u62DB\u724C", "\u9648\u5217", "\u73AF\u5883", "\u5899\u9762", "\u95E8\u5934"];
const DIGITAL_TOKENS = ["\u7F51\u7AD9", "\u5C0F\u7A0B\u5E8F", "App", "\u5BA2\u6237\u7AEF", "\u793E\u4EA4\u5A92\u4F53", "\u516C\u4F17\u53F7", "\u7535\u5546", "\u5B98\u7F51", "H5"];
function looksLikeUncertainPhrase(value) {
  return /确认|待确认|未知|不确定|尚待|待定|待补充|不明确|暂无|信息不足|尚\b|待核实|待品牌方/.test(value);
}
function resolveIdentity(project, reportText) {
  const placeholderIndustry = "\u5F85\u786E\u8BA4\uFF08\u57FA\u4E8E\u73B0\u6709\u7D20\u6750\u63A8\u65AD\uFF09";
  const projectName = isNonEmptyString(project.projectName) ? project.projectName.trim() : isNonEmptyString(project.detectedProjectName) ? project.detectedProjectName.trim() : UNKNOWN;
  let brandName = UNKNOWN;
  if (isNonEmptyString(project.brandName)) brandName = project.brandName.trim();
  else if (isNonEmptyString(project.detectedBrandName)) brandName = project.detectedBrandName.trim();
  else {
    const fromReport = /品牌[与：:]\s*([^；;。\n]+)/.exec(reportText);
    const captured = fromReport?.[1];
    if (captured && !looksLikeUncertainPhrase(captured) && isNonEmptyString(captured)) {
      brandName = cleanInline(captured);
    }
  }
  let industry = UNKNOWN;
  if (isNonEmptyString(project.industry) && project.industry.trim() !== placeholderIndustry) {
    industry = project.industry.trim();
  } else if (isNonEmptyString(project.detectedIndustry) && project.detectedIndustry.trim() !== placeholderIndustry) {
    industry = project.detectedIndustry.trim();
  } else {
    const fromReport = /现有素材指向([^；;。\n]+?)(?:行业|餐饮|经营|品牌)/.exec(reportText) || /行业[：:]\s*([^；;。\n]+)/.exec(reportText);
    const captured = fromReport?.[1];
    if (captured && !looksLikeUncertainPhrase(captured) && isNonEmptyString(captured)) {
      industry = cleanInline(captured);
    }
  }
  return { projectName, brandName, industry };
}
function compileProjectVisualContext(input) {
  const { project, reportMarkdown } = input;
  const allText = reportMarkdown || "";
  const sections = parseReportSections(allText);
  const uncertainties = [];
  const identity = resolveIdentity(project, allText);
  const confidence = {
    projectName: typeof project.projectNameConfidence === "number" ? project.projectNameConfidence : identity.projectName !== UNKNOWN ? 0.9 : 0,
    brandName: isNonEmptyString(project.brandName) && project.factConfidence?.brandName != null ? project.factConfidence.brandName : identity.brandName !== UNKNOWN ? 0.6 : 0,
    industry: isNonEmptyString(project.industry) && project.factConfidence?.industry != null ? project.factConfidence.industry : identity.industry !== UNKNOWN ? 0.6 : 0
  };
  const logoLocked = project.logoLocked !== false;
  const logoAssetIds = [];
  const lockedAssetIds = /* @__PURE__ */ new Set();
  for (const logoFile of project.logoFiles || []) {
    const asset = (project.assets || []).filter(isAnalysisSourceAsset).find(
      (candidate) => candidate.originalName === logoFile || candidate.relativePath.endsWith(logoFile)
    );
    if (asset) {
      logoAssetIds.push(asset.id);
      lockedAssetIds.add(asset.id);
    } else {
      logoAssetIds.push(logoFile);
    }
  }
  const lockedFacts = (project.lockedFacts || []).map((fact) => fact.trim()).filter(Boolean);
  const coreProducts = dedupe([
    ...extractBullets(sectionsMatching(sections, /核心产品|主营业务|主营产品|招牌产品|核心业务|产品线/).map((s) => s.text).join("\n")),
    ...extractBullets(sectionsMatching(sections, /产品|业务|品类|招牌/).map((s) => s.text).join("\n"))
  ]);
  const secondaryProducts = dedupe(
    extractBullets(sectionsMatching(sections, /次要产品|衍生|辅助产品|其他产品/).map((s) => s.text).join("\n"))
  );
  const existingVisualAssets = (project.assets || []).filter(isAnalysisSourceAsset).map((asset) => asset.relativePath || asset.originalName || asset.id);
  const primaryColors = dedupe(collectTokens(allText, COLOR_TOKENS));
  const supportingColors = [];
  const graphicAssets = dedupe(collectTokens(allText, GRAPHIC_TOKENS));
  const typographySignals = dedupe(collectTokens(allText, TYPOGRAPHY_TOKENS));
  const materialSignals = dedupe(collectTokens(allText, MATERIAL_TOKENS));
  const photographySignals = dedupe(collectTokens(allText, PHOTOGRAPHY_TOKENS));
  const structures = dedupe(
    STRUCTURE_KEYWORDS.filter((keyword) => allText.includes(keyword))
  );
  const confirmedEvidence = [...lockedFacts, allText].some(
    (candidate) => CONFIRMED_STRUCTURE_PATTERNS.some((pattern) => pattern.test(candidate))
  );
  let packagingStatus = "unknown";
  const packagingEvidence = [];
  if (confirmedEvidence) {
    packagingStatus = "confirmed";
    packagingEvidence.push("confirmed_by_locked_fact_or_explicit_statement");
  } else if (structures.length > 0 || /包装|样机|应用延展|门店应用|包装应用/.test(allText)) {
    packagingStatus = "legacy_observed";
    packagingEvidence.push("legacy_observed_from_report_or_assets");
  } else {
    packagingEvidence.push("no_structural_evidence");
  }
  const touchPackaging = dedupe(collectTokens(allText, PACKAGING_TOKENS));
  const touchVi = dedupe(collectTokens(allText, VI_TOKENS));
  const touchSpatial = dedupe(collectTokens(allText, SPATIAL_TOKENS));
  const touchDigital = dedupe(collectTokens(allText, DIGITAL_TOKENS));
  const strengthSections = sectionsMatching(sections, /优势|价值|记忆|亮点|强项/);
  const visualStrengths = dedupe([
    ...extractBullets(strengthSections.map((s) => s.text).join("\n")),
    ...extractBoldLeads(strengthSections.map((s) => s.text).join("\n"))
  ]);
  const problemSections = sectionsMatching(sections, /问题|不足|缺陷|痛点/);
  const visualProblems = dedupe([
    ...extractBullets(problemSections.map((s) => s.text).join("\n")),
    ...extractBoldLeads(problemSections.map((s) => s.text).join("\n"))
  ]);
  const modifiableAssets = dedupe(
    extractTableRows(allText).filter((row) => /升级|替换|新增/.test(row[1] || "")).map((row) => cleanInline(row[0] || "")).filter(Boolean)
  );
  if (identity.projectName === UNKNOWN) uncertainties.push("PROJECT_VISUAL_CONTEXT_FIELD_UNKNOWN:projectName");
  if (identity.brandName === UNKNOWN) uncertainties.push("PROJECT_VISUAL_CONTEXT_FIELD_UNKNOWN:brandName");
  if (identity.industry === UNKNOWN) uncertainties.push("PROJECT_VISUAL_CONTEXT_FIELD_UNKNOWN:industry");
  if (coreProducts.length === 0) uncertainties.push("PROJECT_VISUAL_CONTEXT_FIELD_UNKNOWN:coreProducts");
  if (primaryColors.length === 0) uncertainties.push("PROJECT_VISUAL_CONTEXT_FIELD_UNKNOWN:primaryColors");
  if (packagingStatus !== "confirmed") uncertainties.push("PACKAGING_STRUCTURE_UNCONFIRMED");
  if (logoLocked && lockedFacts.length === 0 && logoAssetIds.length === 0) {
    uncertainties.push("LOCKED_ASSET_SOURCE_UNCLEAR");
  }
  if (touchPackaging.length === 0 && touchVi.length === 0 && touchSpatial.length === 0 && touchDigital.length === 0) {
    uncertainties.push("BUSINESS_TOUCHPOINTS_INCOMPLETE");
  }
  return {
    schemaVersion: PROJECT_VISUAL_CONTEXT_SCHEMA_VERSION,
    projectId: project.id,
    sourceRunId: input.sourceRunId,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    identity,
    confidence,
    lockedAssets: {
      logoLocked,
      logoAssetIds,
      lockedAssetIds: [...lockedAssetIds],
      lockedFacts
    },
    products: { coreProducts, secondaryProducts },
    currentVisualSystem: {
      existingVisualAssets,
      primaryColors,
      supportingColors,
      graphicAssets,
      typographySignals,
      materialSignals,
      photographySignals
    },
    packaging: {
      structures,
      status: packagingStatus,
      evidenceSources: packagingEvidence
    },
    businessTouchpoints: {
      packaging: touchPackaging,
      viApplications: touchVi,
      spatial: touchSpatial,
      digital: touchDigital
    },
    evaluation: {
      visualStrengths,
      visualProblems,
      modifiableAssets
    },
    uncertainties,
    source: {
      reportPath: input.reportPath,
      runtimeReportPath: input.runtimeReportPath,
      assetCount: input.assetCount,
      imageCount: input.imageCount,
      provider: input.provider,
      model: input.model
    }
  };
}
function validateProjectVisualContext(context) {
  const errors = [];
  function requireString(value, field) {
    if (typeof value !== "string" || value.length === 0) errors.push(`${field} \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32`);
  }
  function requireNumber(value, field) {
    if (typeof value !== "number" || Number.isNaN(value)) errors.push(`${field} \u5FC5\u987B\u662F\u6570\u5B57`);
  }
  function requireArray(value, field) {
    if (!Array.isArray(value)) errors.push(`${field} \u5FC5\u987B\u662F\u6570\u7EC4`);
  }
  if (context.schemaVersion !== "1.0") errors.push('schemaVersion \u5FC5\u987B\u4E3A "1.0"');
  requireString(context.projectId, "projectId");
  requireString(context.sourceRunId, "sourceRunId");
  requireString(context.generatedAt, "generatedAt");
  if (context.identity) {
    requireString(context.identity.projectName, "identity.projectName");
    requireString(context.identity.brandName, "identity.brandName");
    requireString(context.identity.industry, "identity.industry");
  } else errors.push("identity \u7F3A\u5931");
  if (context.confidence) {
    requireNumber(context.confidence.projectName, "confidence.projectName");
    requireNumber(context.confidence.brandName, "confidence.brandName");
    requireNumber(context.confidence.industry, "confidence.industry");
  } else errors.push("confidence \u7F3A\u5931");
  if (context.lockedAssets) {
    if (typeof context.lockedAssets.logoLocked !== "boolean") errors.push("lockedAssets.logoLocked \u5FC5\u987B\u662F\u5E03\u5C14");
    requireArray(context.lockedAssets.logoAssetIds, "lockedAssets.logoAssetIds");
    requireArray(context.lockedAssets.lockedAssetIds, "lockedAssets.lockedAssetIds");
    requireArray(context.lockedAssets.lockedFacts, "lockedAssets.lockedFacts");
  } else errors.push("lockedAssets \u7F3A\u5931");
  if (context.products) {
    requireArray(context.products.coreProducts, "products.coreProducts");
    requireArray(context.products.secondaryProducts, "products.secondaryProducts");
  } else errors.push("products \u7F3A\u5931");
  if (context.currentVisualSystem) {
    requireArray(context.currentVisualSystem.existingVisualAssets, "currentVisualSystem.existingVisualAssets");
    requireArray(context.currentVisualSystem.primaryColors, "currentVisualSystem.primaryColors");
    requireArray(context.currentVisualSystem.supportingColors, "currentVisualSystem.supportingColors");
    requireArray(context.currentVisualSystem.graphicAssets, "currentVisualSystem.graphicAssets");
    requireArray(context.currentVisualSystem.typographySignals, "currentVisualSystem.typographySignals");
    requireArray(context.currentVisualSystem.materialSignals, "currentVisualSystem.materialSignals");
    requireArray(context.currentVisualSystem.photographySignals, "currentVisualSystem.photographySignals");
  } else errors.push("currentVisualSystem \u7F3A\u5931");
  if (context.packaging) {
    requireArray(context.packaging.structures, "packaging.structures");
    if (!["confirmed", "legacy_observed", "unknown"].includes(context.packaging.status)) {
      errors.push("packaging.status \u53D6\u503C\u975E\u6CD5");
    }
    requireArray(context.packaging.evidenceSources, "packaging.evidenceSources");
  } else errors.push("packaging \u7F3A\u5931");
  if (context.businessTouchpoints) {
    requireArray(context.businessTouchpoints.packaging, "businessTouchpoints.packaging");
    requireArray(context.businessTouchpoints.viApplications, "businessTouchpoints.viApplications");
    requireArray(context.businessTouchpoints.spatial, "businessTouchpoints.spatial");
    requireArray(context.businessTouchpoints.digital, "businessTouchpoints.digital");
  } else errors.push("businessTouchpoints \u7F3A\u5931");
  if (context.evaluation) {
    requireArray(context.evaluation.visualStrengths, "evaluation.visualStrengths");
    requireArray(context.evaluation.visualProblems, "evaluation.visualProblems");
    requireArray(context.evaluation.modifiableAssets, "evaluation.modifiableAssets");
  } else errors.push("evaluation \u7F3A\u5931");
  requireArray(context.uncertainties, "uncertainties");
  if (context.source) {
    requireString(context.source.reportPath, "source.reportPath");
    requireString(context.source.runtimeReportPath, "source.runtimeReportPath");
    requireNumber(context.source.assetCount, "source.assetCount");
    requireNumber(context.source.imageCount, "source.imageCount");
    requireString(context.source.provider, "source.provider");
    requireString(context.source.model, "source.model");
  } else errors.push("source \u7F3A\u5931");
  return { valid: errors.length === 0, errors };
}
class ProjectVisualContextError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "ProjectVisualContextError";
    this.code = code;
  }
}
async function writeProjectVisualContext(filePath, context, options = {}) {
  const { valid, errors } = validateProjectVisualContext(context);
  if (!valid) {
    throw new ProjectVisualContextError(
      "PROJECT_VISUAL_CONTEXT_SCHEMA_INVALID",
      `Context Schema \u6821\u9A8C\u5931\u8D25\uFF1A${errors.join("; ")}`
    );
  }
  const resolved = path.resolve(filePath);
  const result = await atomicWriteJsonWithRetry(resolved, context, {
    maxAttempts: 3,
    baseDelayMs: 20,
    maxDelayMs: 200,
    ...options
  });
  if (!result.success) {
    throw new ProjectVisualContextError(
      "PROJECT_VISUAL_CONTEXT_WRITE_FAILED",
      `Context \u539F\u5B50\u5199\u5165\u5931\u8D25\uFF1A${result.errorMessage || "unknown"}`
    );
  }
}
async function readProjectVisualContextFile(filePath) {
  const raw = await fs.readFile(path.resolve(filePath), "utf8");
  const parsed = JSON.parse(raw);
  const { valid, errors } = validateProjectVisualContext(parsed);
  if (!valid) {
    throw new ProjectVisualContextError(
      "PROJECT_VISUAL_CONTEXT_SCHEMA_INVALID",
      `Context \u6587\u4EF6 Schema \u6821\u9A8C\u5931\u8D25\uFF1A${errors.join("; ")}`
    );
  }
  return parsed;
}
export {
  PROJECT_VISUAL_CONTEXT_COMPILER_VERSION,
  PROJECT_VISUAL_CONTEXT_SCHEMA_VERSION,
  ProjectVisualContextError,
  compileProjectVisualContext,
  readProjectVisualContextFile,
  validateProjectVisualContext,
  writeProjectVisualContext
};
