/**
 * Product-surface visibility only. Hidden capabilities keep their routes,
 * services and persisted data so they can be restored without rewiring.
 */
export const UI_VISIBILITY = Object.freeze({
  creativeDirection: true,
  creativeIntelligenceStandalone: false,
  creativeResearchStandalone: false,
  smartCreative: false,
  referenceStyle: false,
});
