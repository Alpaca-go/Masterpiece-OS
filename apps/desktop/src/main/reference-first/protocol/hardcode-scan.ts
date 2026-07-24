import type { ProtocolHardcodeScanResult } from '../../../shared/types.ts';

export interface ProtocolHardcodeVocabulary {
  projectNames?: string[];
  brandNames?: string[];
  industryTerms?: string[];
  productTerms?: string[];
  concreteTouchpointTerms?: string[];
}

function matches(source: string, terms: string[] | undefined): string[] {
  return [...new Set((terms || []).filter((term) =>
    term.trim().length > 0 && source.toLocaleLowerCase().includes(term.toLocaleLowerCase())
  ))];
}

export function scanProtocolHardcodes(
  source: string,
  vocabulary: ProtocolHardcodeVocabulary
): ProtocolHardcodeScanResult {
  const result: ProtocolHardcodeScanResult = {
    projectNames: matches(source, vocabulary.projectNames),
    brandNames: matches(source, vocabulary.brandNames),
    industryTerms: matches(source, vocabulary.industryTerms),
    productTerms: matches(source, vocabulary.productTerms),
    concreteTouchpointTerms: matches(source, vocabulary.concreteTouchpointTerms),
    passed: false
  };
  result.passed = [
    result.projectNames,
    result.brandNames,
    result.industryTerms,
    result.productTerms,
    result.concreteTouchpointTerms
  ].every((items) => items.length === 0);
  return result;
}
