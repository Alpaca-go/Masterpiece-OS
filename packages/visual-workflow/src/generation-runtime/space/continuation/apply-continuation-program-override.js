import { buildTargetSceneProjection } from "../scene-projection/target-scene-projection.js";
const CONTINUATION_OVERRIDE_VERSION = "space-continuation-program-override@1.2.0";
import {
  filterProjectWideConstraintsForTargetScene
} from "../scene-projection/target-scene-projection.js";
function applyContinuationProgramOverride({
  targetProgram = {},
  sourceBridge = {},
  sourceScene = ""
} = {}) {
  const projection = buildTargetSceneProjection({
    targetProgram,
    projectBridge: sourceBridge,
    projectConstraints: sourceBridge.operationConstraints ?? [],
    sourceScene
  });
  return {
    architectureFunctionBridge: projection.architectureFunctionBridge,
    functionalRequirement: projection.functionalRequirement,
    composition: projection.composition
  };
}
export {
  CONTINUATION_OVERRIDE_VERSION,
  applyContinuationProgramOverride,
  filterProjectWideConstraintsForTargetScene as filterSourceSceneConstraintsForContinuation
};
