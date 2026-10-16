import { rewriteArchitectureItems } from "./action-verbs.js";
function rewriteArchitectureItem(item) {
  const result = rewriteArchitectureItems([item]);
  return result.items[0];
}
function rewriteArchitectureSemantics(items) {
  const result = rewriteArchitectureItems(items);
  return {
    items: result.items,
    // Back-compat alias: the flat action list.
    actions: result.allActions,
    strategy: result.strategy,
    form: result.form,
    organization: result.organization,
    stats: result.stats
  };
}
const REWRITE_ARCHITECTURE_SEMANTICS_VERSION = "1.0.0";
export {
  REWRITE_ARCHITECTURE_SEMANTICS_VERSION,
  rewriteArchitectureItem,
  rewriteArchitectureSemantics
};
