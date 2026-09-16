import { credentialReferenceKind } from "./credential-store.mjs";

export const PROVIDER_IDS = Object.freeze(["mock", "airouter", "openai-compatible", "ollama", "lmstudio", "vllm", "llamacpp"]);

const LOCAL_ENDPOINTS = Object.freeze({
  ollama: "http://localhost:11434/v1",
  lmstudio: "http://localhost:1234/v1",
  vllm: "http://localhost:8000/v1",
  llamacpp: "http://localhost:8080/v1",
});

const REMOTE_ENDPOINTS = Object.freeze({
  airouter: "https://api.airouter.ch/v1",
});

export function classifyEndpoint(endpoint) {
  if (!endpoint) return "built-in";
  try {
    const url = new URL(endpoint);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname) ? "local" : "remote";
  } catch {
    return "invalid";
  }
}

export function providerDefinition(id) {
  const provider = String(id ?? "");
  if (!PROVIDER_IDS.includes(provider)) return null;
  const local = Object.hasOwn(LOCAL_ENDPOINTS, provider);
  return Object.freeze({
    id: provider,
    endpoint: local ? LOCAL_ENDPOINTS[provider] : REMOTE_ENDPOINTS[provider] ?? null,
    endpointClass: local ? "local" : provider === "mock" ? "offline" : provider === "airouter" ? "remote" : "custom",
    credentialRequired: provider === "airouter" || provider === "openai-compatible",
    credentialOptional: local,
    supportsConnectionTest: provider !== "mock",
  });
}

export function credentialReferenceForModel(model, env = process.env) {
  if (model?.credential) return String(model.credential);
  if (model?.provider === "airouter") return "env:AIROUTER_API_KEY";
  if (model?.provider === "ollama") return model?.credential ?? "env:OLLAMA_API_KEY";
  if (model?.provider === "openai-compatible") return env.MINDCRAFT_OPENAI_API_KEY ? "env:MINDCRAFT_OPENAI_API_KEY" : "env:OPENAI_API_KEY";
  return null;
}

export async function inspectProviderReadiness(model, { credentialStore, env = process.env, connectivity = "not_checked" } = {}) {
  const definition = providerDefinition(model?.provider);
  if (!definition) return { status: "unknown", liveReady: false, connectivity: "not_checked", code: "PROVIDER_UNKNOWN" };
  if (definition.id === "mock") return { status: "ready", liveReady: false, mockReady: true, connectivity: "not_checked", code: null };
  const reference = credentialReferenceForModel(model, env);
  let credential = definition.credentialRequired ? "missing" : "not_required";
  if (reference) {
    const value = credentialStore ? await credentialStore.resolve(reference).catch(() => null) : reference.startsWith("env:") ? env[reference.slice(4)] : null;
    credential = value ? "configured" : "missing";
  }
  const cloudOllama = definition.id === "ollama" && String(model?.baseUrl ?? definition.endpoint).startsWith("https://ollama.com/");
  const credentialReady = !(definition.credentialRequired || cloudOllama) || credential === "configured";
  const liveReady = credentialReady && connectivity === "reachable";
  return { status: credentialReady ? (connectivity === "failed" ? "connection_failed" : "configured") : "credential_missing", liveReady, mockReady: false, connectivity, credential, reference: reference ? `${credentialReferenceKind(reference)}:[REDACTED]` : null, endpointClass: definition.endpointClass, code: credentialReady ? null : "CREDENTIAL_MISSING" };
}

export async function buildProviderReadiness(models = [], options = {}) {
  const entries = [];
  for (const model of models.filter((item) => item?.enabled !== false)) entries.push({ id: model.id, provider: model.provider, ...(await inspectProviderReadiness(model, options)) });
  return Object.freeze({ entries, mockReady: entries.some((entry) => entry.mockReady), liveReady: entries.length > 0 && entries.every((entry) => entry.liveReady), connectivity: entries.map((entry) => entry.connectivity) });
}
