import { createVolcengineReasoner } from "./volcengine-reasoner.js";
function normalized(value) {
  return String(value || "").trim().toLowerCase();
}
const SUPPORTED_PROTOCOLS = Object.freeze(["openai-chat-multimodal"]);
function createVolcengineAnalysisProvider(options = {}) {
  const reasonerFactory = options.reasonerFactory || createVolcengineReasoner;
  return Object.freeze({
    id: "volcengine",
    capabilities: Object.freeze(["multimodal-analysis", "structured-output"]),
    supports(configuration = {}) {
      const provider = normalized(configuration.provider);
      const protocol = normalized(configuration.protocol || "openai-chat-multimodal");
      const model = normalized(configuration.model);
      if (!SUPPORTED_PROTOCOLS.includes(protocol)) return false;
      if (provider === "volcengine" || provider === "ark") return true;
      if (provider === "openai-compatible" || !provider) {
        return model.startsWith("doubao-");
      }
      return false;
    },
    createReasoner(configuration) {
      return reasonerFactory({
        apiKey: configuration.apiKey,
        model: configuration.model,
        baseUrl: configuration.baseUrl,
        environment: configuration.environment,
        client: configuration.client
      });
    }
  });
}
export {
  createVolcengineAnalysisProvider
};
