import { createProvider, envApiKeyAuth } from "@earendil-works/pi-ai";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";

export const AIRouterModel = {
  id: "Qwen3.6",
  name: "Qwen3.6 (Airouter)",
  api: "openai-completions",
  provider: "airouter",
  baseUrl: "https://api.airouter.ch/v1",
  reasoning: true,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 262144,
  maxTokens: 65536,
};

export function createAirouterProvider() {
  return createProvider({
    id: "airouter",
    name: "Airouter",
    auth: { apiKey: envApiKeyAuth("Airouter", ["AIROUTER_API_KEY"]) },
    models: [AIRouterModel],
    api: openAICompletionsApi(),
  });
}
