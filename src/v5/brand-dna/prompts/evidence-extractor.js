import { buildStagePrompt } from './shared.js';

export function buildEvidenceExtractionPrompt(chunks) {
  return buildStagePrompt(
    'atomic-evidence',
    `从每个语义片段提取最小事实单元。一个证据只表达一个命题；建议、行业常识和推测不得混入证据。
输出必须紧凑：每个片段最多提取 18 条高价值证据；claim 不超过 120 个汉字；excerpt 只保留能支持命题的最短原文且不超过 100 个汉字；每条证据最多保留 2 个 sourceRefs。不得重复同义证据。`,
    { chunks },
    `{"atomicEvidence":[{"id":"本批次内唯一 ID","claim":"单一命题","category":"project|business|product|audience|market|positioning|value|personality|channel|constraint|visual|risk","status":"explicit|implicit|uncertain","sourceRefs":[{"sourceId":"string","chunkId":"string","excerpt":"最小必要原文"}],"confidence":0.0}]}`
  );
}
