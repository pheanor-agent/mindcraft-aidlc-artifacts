import { access, constants } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { validateModelRegistry, RoutingErrorCode } from "./model-routing.mjs";
import { credentialReferenceForModel, providerDefinition } from "./provider-contract.mjs";

export const PREFLIGHT_STATUS = Object.freeze({ PASS: "pass", FAIL: "fail", WARN: "warn" });

export function redactedCredentialStatus(reference, env = process.env) {
  if (!reference) return { status: "not configured" };
  const name = String(reference).startsWith("env:") ? String(reference).slice(4) : String(reference);
  return { status: env[name] ? "configured" : "missing", reference: name };
}

function credentialValue(reference, env) {
  if (!reference) return null;
  const name = String(reference).startsWith("env:") ? String(reference).slice(4) : String(reference);
  return env[name] || null;
}

async function probeEndpoint(endpoint, credential, { fetchImpl = globalThis.fetch, timeoutMs = 1500 } = {}) {
  if (!endpoint || typeof fetchImpl !== "function") return { connectivity: "not_checked", reason: "fetch_unavailable" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${String(endpoint).replace(/\/$/u, "")}/models`;
    const response = await fetchImpl(url, { method: "GET", headers: credential ? { authorization: `Bearer ${credential}` } : {}, signal: controller.signal });
    return response.ok ? { connectivity: "reachable", httpStatus: response.status } : { connectivity: "failed", httpStatus: response.status, reason: `HTTP_${response.status}` };
  } catch (error) {
    return { connectivity: "failed", reason: error.name === "AbortError" ? "timeout" : "network_error" };
  } finally {
    clearTimeout(timer);
  }
}

export async function providerStatus(model, env = process.env, options = {}) {
  const provider = String(model?.provider ?? "unknown");
  const definition = providerDefinition(provider);
  if (!definition) return { provider, status: "unknown provider", credential: "not configured", connectivity: "not_checked", liveReady: false, code: "PROVIDER_UNKNOWN" };
  const credential = credentialReferenceForModel(model, env);
  const credentialReport = redactedCredentialStatus(credential, env);
  const cloudOllama = provider === "ollama" && String(model?.baseUrl ?? definition.endpoint).startsWith("https://ollama.com/");
  const credentialReady = !(definition.credentialRequired || cloudOllama) || credentialReport.status === "configured";
  if (provider === "mock") return { provider, status: "available", credential: "not configured", connectivity: "not_applicable", liveReady: false, endpointClass: definition.endpointClass, code: null };
  if (!credentialReady) return { provider, status: "credential missing", credential: credentialReport.status, connectivity: "not_checked", liveReady: false, endpointClass: definition.endpointClass, code: "CREDENTIAL_MISSING" };
  const endpoint = model.baseUrl ?? definition.endpoint;
  const probe = options.skipConnectivity ? { connectivity: "not_checked" } : await probeEndpoint(endpoint, credentialValue(credential, env), options);
  return { provider, status: probe.connectivity === "reachable" ? "available" : probe.connectivity === "failed" ? "connection failed" : "configured", credential: credentialReport.status, ...probe, liveReady: probe.connectivity === "reachable", endpointClass: definition.endpointClass, endpoint: endpoint ?? null, code: probe.connectivity === "failed" ? "PROVIDER_UNREACHABLE" : null };
}

async function writableDirectory(path) {
  // doctor is a read-only diagnostic. Walk to an existing parent instead of
  // creating the state/knowledge directories as a probe side effect.
  let candidate = resolve(path);
  while (true) {
    try { await access(candidate, constants.W_OK); return true; }
    catch (error) {
      if (error.code !== "ENOENT") return false;
      const parent = dirname(candidate);
      if (parent === candidate) return false;
      candidate = parent;
    }
  }
}

export async function checkStorage({ cwd, statePath, knowledgePath }) {
  const state = resolve(cwd, dirname(statePath));
  const knowledge = resolve(cwd, dirname(knowledgePath));
  const [stateWritable, knowledgeWritable] = await Promise.all([writableDirectory(state), writableDirectory(knowledge)]);
  return { status: stateWritable && knowledgeWritable ? PREFLIGHT_STATUS.PASS : PREFLIGHT_STATUS.FAIL, state: stateWritable, knowledge: knowledgeWritable };
}

export async function runPreflight({ cwd = process.cwd(), registry, statePath = ".mindcraft/state.jsonl", knowledgePath = ".mindcraft/knowledge.jsonl", env = process.env, selectedModelId = null, selectedProvider = null, skipConnectivity = false, fetchImpl = globalThis.fetch, connectivityTimeoutMs = 1500 } = {}) {
  const checks = {};
  let registryError = null;
  try { validateModelRegistry(registry); } catch (error) { registryError = error; }
  const models = registryError ? [] : registry.models.filter((model) => model.enabled !== false);
  checks.modelRegistry = registryError ? { status: PREFLIGHT_STATUS.FAIL, count: 0, message: registryError.message, code: registryError.code } : { status: models.length ? PREFLIGHT_STATUS.PASS : PREFLIGHT_STATUS.FAIL, count: models.length, message: models.length ? "Model registry is configured" : "No enabled Model is configured" };
  const selected = models.filter((model) => (!selectedModelId || model.id === selectedModelId) && (!selectedProvider || model.provider === selectedProvider));
  const evaluated = selected.length ? selected : models;
  checks.providers = await Promise.all(evaluated.map(async (model) => ({ id: model.id, ...await providerStatus(model, env, { skipConnectivity, fetchImpl, timeoutMs: connectivityTimeoutMs }) })));
  checks.credentials = checks.providers.map(({ id, credential }) => ({ id, status: credential }));
  checks.storage = await checkStorage({ cwd, statePath, knowledgePath });
  // Availability is a routing property. An unavailable model that is not
  // selected for this run must not block the selected model.
  const unavailable = evaluated.filter((model) => model.available === false);
  if (unavailable.length && checks.modelRegistry.status === PREFLIGHT_STATUS.PASS) {
    checks.modelRegistry = { ...checks.modelRegistry, status: PREFLIGHT_STATUS.FAIL, message: `Selected Model unavailable: ${unavailable.map((model) => model.id).join(", ")}`, code: RoutingErrorCode.MODEL_UNAVAILABLE };
  }
  const providerConfigured = evaluated.length > 0 && checks.providers.every((provider) => ["available", "configured"].includes(provider.status));
  const providerLive = evaluated.length > 0 && checks.providers.every((provider) => provider.liveReady || provider.provider === "mock");
  checks.providerReadiness = { status: providerLive || (providerConfigured && skipConnectivity) ? PREFLIGHT_STATUS.PASS : PREFLIGHT_STATUS.WARN, configured: providerConfigured, liveReady: providerLive, evaluatedModelIds: evaluated.map((model) => model.id), message: providerLive ? "Selected provider connectivity confirmed" : providerConfigured ? "Provider configured but connectivity not confirmed" : "Selected provider is not ready" };
  const localReady = checks.modelRegistry.status === PREFLIGHT_STATUS.PASS && checks.storage.status === PREFLIGHT_STATUS.PASS;
  return { ok: localReady, localReady, liveReady: providerLive, checks };
}

export function preflightError(report) {
  const error = new Error(report?.checks?.modelRegistry?.message ?? "MindCraft preflight failed");
  error.code = report?.checks?.modelRegistry?.code ?? "PREFLIGHT_FAILED";
  error.preflight = report;
  return error;
}
