import { createProvider, envApiKeyAuth } from "@earendil-works/pi-ai";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";

export const DEFAULT_PROVIDER = "airouter";
export const DEFAULT_MODEL = "Qwen3.6";
export const OLLAMA_CLOUD_MODEL = "glm-5.3-flash:cloud";
export const OPENAI_COMPATIBLE_PROVIDER = "openai-compatible";

export const LOCAL_PRESETS = {
  ollama: { baseUrl: "http://localhost:11434/v1", envKey: "OLLAMA_API_KEY", name: "Ollama" },
  lmstudio: { baseUrl: "http://localhost:1234/v1", envKey: "LMSTUDIO_API_KEY", name: "LM Studio" },
  vllm: { baseUrl: "http://localhost:8000/v1", envKey: "VLLM_API_KEY", name: "vLLM" },
  llamacpp: { baseUrl: "http://localhost:8080/v1", envKey: "LLAMACPP_API_KEY", name: "llama.cpp" },
};

export function optionalApiKeyAuth(name, envVars, placeholder = "local") {
  const base = envApiKeyAuth(name, envVars);
  return {
    ...base,
    resolve: async (input) => (await base.resolve(input)) ?? { auth: { apiKey: placeholder }, source: "keyless (local)" },
  };
}

export function buildOpenAICompatibleModel({ provider, id, baseUrl, name = id, contextWindow = 131072, maxTokens = 16384, reasoning = false, compat } = {}) {
  return { id, name, api: "openai-completions", provider, baseUrl, reasoning, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow, maxTokens, ...(compat ? { compat } : {}) };
}

function numberEnv(env, key, fallback) {
  const value = env[key];
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function required(env, key) {
  if (!env[key]?.trim()) throw new Error(`${key} is required`);
  return env[key].trim();
}

export function resolveModelSelection(env = process.env) {
  const requestedProvider = env.MINDCRAFT_PROVIDER?.trim();
  const provider = requestedProvider || (env.MINDCRAFT_OPENAI_BASE_URL?.trim() ? OPENAI_COMPATIBLE_PROVIDER : DEFAULT_PROVIDER);
  const contextWindow = numberEnv(env, "MINDCRAFT_OPENAI_CONTEXT_WINDOW", 131072);
  const maxTokens = numberEnv(env, "MINDCRAFT_OPENAI_MAX_TOKENS", 16384);
  const reasoning = ["1", "true"].includes(String(env.MINDCRAFT_OPENAI_REASONING).toLowerCase());
  if (provider === OPENAI_COMPATIBLE_PROVIDER) {
    const baseUrl = required(env, "MINDCRAFT_OPENAI_BASE_URL");
    const modelId = env.MINDCRAFT_OPENAI_MODEL?.trim() || env.MINDCRAFT_MODEL?.trim();
    if (!modelId) throw new Error("MINDCRAFT_OPENAI_MODEL or MINDCRAFT_MODEL is required");
    return { provider, modelId: modelId.trim(), baseUrl, name: "OpenAI-compatible", envKeys: ["MINDCRAFT_OPENAI_API_KEY", "OPENAI_API_KEY"], keyless: true, custom: true, contextWindow, maxTokens, reasoning };
  }
  if (LOCAL_PRESETS[provider]) {
    const preset = LOCAL_PRESETS[provider];
    const modelId = env.MINDCRAFT_MODEL?.trim() || (provider === "ollama" && env.MINDCRAFT_OLLAMA_CLOUD === "1" ? OLLAMA_CLOUD_MODEL : required(env, "MINDCRAFT_MODEL"));
    const baseUrl = env.MINDCRAFT_LOCAL_BASE_URL?.trim() || (provider === "ollama" && env.MINDCRAFT_OLLAMA_CLOUD === "1" ? "https://ollama.com/v1" : preset.baseUrl);
    return { provider, modelId, baseUrl, name: preset.name, envKeys: [preset.envKey], keyless: true, custom: true, contextWindow, maxTokens, reasoning };
  }
  const modelId = env.MINDCRAFT_MODEL?.trim() || (provider === DEFAULT_PROVIDER ? DEFAULT_MODEL : null);
  if (!modelId) throw new Error("MINDCRAFT_MODEL is required");
  return { provider, modelId, baseUrl: provider === DEFAULT_PROVIDER ? "https://api.airouter.ch/v1" : null, name: provider === DEFAULT_PROVIDER ? "Airouter" : provider, envKeys: provider === DEFAULT_PROVIDER ? ["AIROUTER_API_KEY"] : [], keyless: false, custom: false, contextWindow, maxTokens, reasoning };
}

export function selectionForModel(model, env = process.env) {
  const provider = String(model?.provider ?? "");
  const preset = LOCAL_PRESETS[provider];
  const baseUrl = model?.baseUrl?.trim() || preset?.baseUrl || (provider === OPENAI_COMPATIBLE_PROVIDER ? env.MINDCRAFT_OPENAI_BASE_URL?.trim() : provider === DEFAULT_PROVIDER ? "https://api.airouter.ch/v1" : null);
  return {
    registryId: model?.id ?? null,
    provider,
    modelId: model?.model ?? null,
    baseUrl,
    name: preset?.name || (provider === DEFAULT_PROVIDER ? "Airouter" : provider),
    envKeys: provider === DEFAULT_PROVIDER ? ["AIROUTER_API_KEY"] : preset ? [preset.envKey] : ["MINDCRAFT_OPENAI_API_KEY", "OPENAI_API_KEY"],
    keyless: Boolean(preset) || provider === OPENAI_COMPATIBLE_PROVIDER,
    custom: provider !== DEFAULT_PROVIDER,
    contextWindow: 131072,
    maxTokens: 16384,
    reasoning: false,
    credential: model?.credential ?? null,
  };
}

export function createProviderForModel(model, env = process.env) {
  return createProviderForSelection(selectionForModel(model, env));
}

export function createProviderForSelection(selection) {
  if (!selection.custom) return null;
  const model = buildOpenAICompatibleModel({ ...selection, id: selection.modelId });
  const auth = selection.keyless ? optionalApiKeyAuth(`${selection.name} API key`, selection.envKeys) : envApiKeyAuth(`${selection.name} API key`, selection.envKeys);
  return createProvider({ id: selection.provider, name: selection.name, baseUrl: selection.baseUrl, auth: { apiKey: auth }, models: [model], api: openAICompletionsApi() });
}

export function describeSelection(selection) {
  const baseUrl = selection.baseUrl ?? "built-in";
  const keys = selection.envKeys.length ? selection.envKeys.join(" | ") : "none";
  return `${selection.provider}/${selection.modelId}  ${baseUrl}  key: ${keys}${selection.keyless ? " (optional)" : ""}`;
}
