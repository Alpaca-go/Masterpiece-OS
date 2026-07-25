import type {
  EvidenceBoundFact,
  ProjectRuntimeContext
} from '../../../shared/types.ts';
import { bindFact } from '../protocol/evidence-binding.ts';

export function resolveRuntimeFacts(runtime: ProjectRuntimeContext): EvidenceBoundFact[] {
  const facts: EvidenceBoundFact[] = [];
  if (runtime.brandName) {
    facts.push(bindFact({
      id: 'runtime-identity',
      key: 'identity',
      value: runtime.brandName,
      classification: 'identity_fact',
      sources: [{
        type: 'project_metadata',
        sourceId: runtime.projectId,
        value: runtime.brandName,
        confidence: 1
      }],
      entersGenerationIdentityPack: true
    }));
  }
  for (const [index, value] of (runtime.productFacts || []).entries()) {
    facts.push(bindFact({
      id: `runtime-fact-${index + 1}`,
      key: `runtime_fact_${index + 1}`,
      value,
      classification: 'product_or_service_fact',
      sources: [{
        type: 'project_metadata',
        sourceId: runtime.projectId,
        value,
        confidence: 1
      }],
      entersGenerationIdentityPack: true
    }));
  }
  return facts;
}
