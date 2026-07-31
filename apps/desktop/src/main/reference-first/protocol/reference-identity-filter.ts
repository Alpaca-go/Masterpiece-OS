import type {
  ReferenceContaminationType,
  StyleCarrier,
  StyleCarrierCandidate
} from '../../../shared/types.ts';

/**
 * §2 参考身份与专属图形必须在 Ranking 前过滤。
 *
 * 生产协议保持项目无关：污染由候选自身携带的 `contaminationTypes` 与
 * `signatureGraphicIds` 数据标注驱动，绝不靠具体品牌 / 行业 / 资产名硬编码。
 * 任一非 'none' 的污染类型，或任一关联的禁止复制专属图形，都会导致候选被拒。
 */
export function isContaminatedCandidate(candidate: {
  contaminationTypes?: ReferenceContaminationType[];
  signatureGraphicIds?: string[];
}): boolean {
  const hasContamination = (candidate.contaminationTypes || []).some((type) => type !== 'none');
  const hasSignatureGraphic = (candidate.signatureGraphicIds || []).length > 0;
  return hasContamination || hasSignatureGraphic;
}

/**
 * §2 过滤器：污染候选（品牌名 / Logo / 字标 / 产品名 / 口号 / 专属图形 / 专属纹样 / 专属角色）
 * 不得进入 Global Style Carrier Ranking、System Anchor、Project Graphic Anchor、
 * Generation Task Definition 与 Generation Brief。
 *
 * 允许的路径是把具体表达转译为抽象视觉规律（例如“图形与品牌字标形成稳定层级”），
 * 而不是先进入 Primary 再靠 Forbidden Items 抵消，也不是仅替换品牌名后保留原专属结构。
 */
export function sanitizeStyleCarrierCandidates(
  candidates: StyleCarrierCandidate[]
): { accepted: StyleCarrierCandidate[]; rejected: StyleCarrierCandidate[] } {
  const accepted: StyleCarrierCandidate[] = [];
  const rejected: StyleCarrierCandidate[] = [];
  for (const candidate of candidates) {
    if (isContaminatedCandidate(candidate)) rejected.push(candidate);
    else accepted.push(candidate);
  }
  return { accepted, rejected };
}

/** §2 将污染类型归类为阻断错误码（全部为 blocking）。 */
export function contaminationErrorCode(type: ReferenceContaminationType): string | null {
  switch (type) {
    case 'brand_name':
    case 'brand_logo':
    case 'brand_wordmark':
    case 'product_name':
    case 'proprietary_character':
      return 'REFERENCE_IDENTITY_IN_STYLE_CARRIER';
    case 'signature_graphic':
    case 'proprietary_pattern':
      return 'REFERENCE_SIGNATURE_GRAPHIC_IN_STYLE_CARRIER';
    case 'slogan':
      return 'REFERENCE_COPY_IN_STYLE_CARRIER';
    default:
      return null;
  }
}

/**
 * §2 载体污染阻断码收集。用于 Readiness Gate：任一 Style Carrier 携带
 * 参考身份 / 专属图形 / 文案污染时都必须冒泡为 blocking。
 */
export function collectStyleCarrierContaminationErrors(carriers: StyleCarrier[]): string[] {
  const errors: string[] = [];
  for (const carrier of carriers) {
    for (const type of carrier.contaminationTypes || []) {
      const code = contaminationErrorCode(type);
      if (code) errors.push(`${code}:${carrier.id}`);
    }
    if ((carrier.referencesSignatureGraphicIds || []).length > 0) {
      errors.push(`REFERENCE_SIGNATURE_GRAPHIC_IN_STYLE_CARRIER:${carrier.id}`);
    }
  }
  return [...new Set(errors)];
}
