// Variation Controller v0.1
// v1.0 §30 Phase 6 / §20 variation_control
// 派生 N 个变体 DNA, preserve 必须保持的, vary 在限定范围内变化
// v0.1 用 slotIndex 确定性选变体 (同 input 同 output), 后续可换 RNG seed

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MOTIF_POOL = [
  'feather_like_flow', 'petal_like_expansion', 'optical_crystal',
  'translucent_fiber', 'flowing_membrane',
];
const LENS_POOL = ['ultra_wide', 'wide', '28mm_to_40mm', 'normal', 'telephoto'];
const HEIGHT_POOL = ['low_angle', 'human_eye_level', 'elevated', 'overhead'];
const DENSITY_POOL = ['low', 'low', 'medium', 'medium', 'high'];
const NEGATIVE_SPACE_POOL = ['low', 'medium', 'high', 'high'];
const CURVE_SCALE_POOL = ['tight', 'medium', 'wide'];
const TRANSPARENCY_POOL = ['low', 'medium', 'high'];

/**
 * 派生 N 个变体 DNA.
 * @param baseDna  baseline DNA (Phase 2 schema 验证)
 * @param count    variant 数量 (1-6 推荐, v1.0 §30 Phase 6 验收 = 6)
 * @returns        array of { slotIndex, dna, choices }
 */
export function deriveVariants(baseDna, count = 6) {
  if (!baseDna || typeof baseDna !== 'object') {
    throw new TypeError('deriveVariants: baseDna must be a non-null object');
  }
  if (!Number.isInteger(count) || count < 1 || count > 12) {
    throw new RangeError(`deriveVariants: count must be 1..12 (got ${count})`);
  }
  if (!Array.isArray(baseDna.brandSpaceDna?.motifFamily) || baseDna.brandSpaceDna.motifFamily.length === 0) {
    throw new Error('deriveVariants: baseDna.brandSpaceDna.motifFamily must be a non-empty array');
  }

  const motifs = baseDna.brandSpaceDna.motifFamily;
  const variants = [];

  for (let i = 0; i < count; i++) {
    const slotIndex = i + 1;
    const variant = structuredClone(baseDna);

    // dnaVersion 保持 baseline 不变 (DNA schema 严格匹配 ^v0\.[0-9]+(\.[0-9]+)?$)
    // variant 标识用 metadata.variantIndex, 不污染 dnaVersion
    // 这样 dnaVersion 留给 major/minor 版本, variant 关系清晰可追溯
    variant.dnaVersion = baseDna.dnaVersion;

    // ---- variation choices (v1.0 §20 vary 字段范围) ----
    const motifChoice = motifs[i % motifs.length];
    const lensChoice = LENS_POOL[i % LENS_POOL.length];
    const heightChoice = HEIGHT_POOL[i % HEIGHT_POOL.length];
    const densityChoice = DENSITY_POOL[i % DENSITY_POOL.length];
    const negativeSpaceChoice = NEGATIVE_SPACE_POOL[i % NEGATIVE_SPACE_POOL.length];
    const curveScaleChoice = CURVE_SCALE_POOL[i % CURVE_SCALE_POOL.length];
    const transparencyChoice = TRANSPARENCY_POOL[i % TRANSPARENCY_POOL.length];

    // ---- v1.0 §20 vary: room_layout / focal_object / motif_expression ----
    // v1.0 §34 规则三: 同一具体母题不超过 50%. 这里每 slot 选 1 个 motif, count=6 中 5 unique
    variant.brandSpaceDna.motifFamily = [motifChoice];

    // ---- v1.0 §20 vary: material_ratio / curve_scale / transparency_level ----
    // 通过 metadata.variationChoice 记录 choice (DNA schema v0.1 无 curve_scale / transparency 字段)
    // metadata.variantIndex 标识本 variant 在变体序列中的位置
    variant.metadata = {
      ...variant.metadata,
      variantIndex: slotIndex,
      parentDnaVersion: baseDna.dnaVersion,
      variationChoice: {
        motif: motifChoice,
        lens: lensChoice,
        height: heightChoice,
        density: densityChoice,
        negativeSpace: negativeSpaceChoice,
        curveScale: curveScaleChoice,
        transparency: transparencyChoice,
      },
    };

    // ---- v1.0 §20 vary: camera_position (compositionDna.camera) ----
    // 不破坏 preserve 范围的 soft_boundary (这是 architectureDna, 不动)
    variant.compositionDna.camera.lens = lensChoice;
    variant.compositionDna.camera.height = heightChoice;
    variant.compositionDna.visualBalance.density = densityChoice;
    variant.compositionDna.visualBalance.negativeSpace = negativeSpaceChoice;

    // ---- v1.0 §20 preserve ----
    // brand_spirit (不变) / soft_boundary (architectureDna.boundaryLanguage 不变) /
    // architectural_glow (lightingDna.architecturalGlow 不变) /
    // restrained_material_palette (materialDna.materialCountLimit 不变)

    // ---- v1.0 §15 brandSpaceDna.injectionStrength: 量化品牌注入强度 ----
    // preserve 范围内, 但 variant 间允许微调, 防止同质化
    // v0.1: 保持 baseline 0.55, 后续可加小扰动
    // (留作 v0.2 评估)

    variants.push({
      slotIndex,
      dna: variant,
      choices: {
        motif: motifChoice,
        lens: lensChoice,
        height: heightChoice,
        density: densityChoice,
        negativeSpace: negativeSpaceChoice,
        curveScale: curveScaleChoice,
        transparency: transparencyChoice,
      },
    });
  }

  return variants;
}

// ---------- CLI ----------
if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error('Usage: node derive-variants.mjs <dna.json> <output.json> [count=6]');
    process.exit(1);
  }
  const [dnaPath, outPath, countArg] = args;
  const count = countArg ? parseInt(countArg, 10) : 6;
  const dna = JSON.parse(readFileSync(dnaPath, 'utf8'));
  const variants = deriveVariants(dna, count);
  writeFileSync(outPath, JSON.stringify(variants, null, 2));
  console.log(`variants written to ${outPath}`);
  console.log(`count: ${variants.length}`);
  // diversity metrics
  const motifs = new Set(variants.map((v) => v.choices.motif));
  const lenses = new Set(variants.map((v) => v.choices.lens));
  const heights = new Set(variants.map((v) => v.choices.height));
  console.log(`diversity: motifs=${motifs.size}/${variants.length}, lenses=${lenses.size}, heights=${heights.size}`);
}
