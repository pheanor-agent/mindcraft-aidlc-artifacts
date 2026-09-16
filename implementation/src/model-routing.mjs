const PURPOSES = new Set(["general", "implementation", "review", "analysis", "documentation", "transformation"]);

export const RoutingErrorCode = Object.freeze({
  MODEL_CONFIGURATION_REQUIRED: "MODEL_CONFIGURATION_REQUIRED",
  MODEL_CONFIGURATION_INVALID: "MODEL_CONFIGURATION_INVALID",
  MODEL_ID_DUPLICATE: "MODEL_ID_DUPLICATE",
  MODEL_PURPOSE_DUPLICATE: "MODEL_PURPOSE_DUPLICATE",
  MODEL_UNAVAILABLE: "MODEL_UNAVAILABLE",
  PURPOSE_REQUIRED: "PURPOSE_REQUIRED",
});

export function validateModelRegistry(registry = {}) {
  if (!registry || typeof registry !== "object" || !Array.isArray(registry.models)) {
    throw routingError(RoutingErrorCode.MODEL_CONFIGURATION_INVALID, "Model registry must contain a models array");
  }
  const enabled = registry.models.filter((model) => model?.enabled !== false);
  if (enabled.length > 2) throw routingError(RoutingErrorCode.MODEL_CONFIGURATION_INVALID, "At most two enabled Models are supported");
  const ids = new Set();
  const purposes = new Set();
  for (const model of registry.models) {
    if (!model || typeof model !== "object" || !model.id || !model.provider || !model.model) {
      throw routingError(RoutingErrorCode.MODEL_CONFIGURATION_INVALID, "Model requires id, provider, and model");
    }
    if (ids.has(model.id)) throw routingError(RoutingErrorCode.MODEL_ID_DUPLICATE, `Duplicate Model id: ${model.id}`);
    ids.add(model.id);
    if (model.purpose !== undefined && (!PURPOSES.has(model.purpose) || model.purpose === "general" && enabled.length > 1)) {
      throw routingError(RoutingErrorCode.MODEL_CONFIGURATION_INVALID, `Unsupported Model purpose: ${model.purpose}`);
    }
    if (model.purpose && purposes.has(model.purpose) && model.enabled !== false) throw routingError(RoutingErrorCode.MODEL_PURPOSE_DUPLICATE, `Duplicate Model purpose: ${model.purpose}`);
    if (model.purpose && model.enabled !== false) purposes.add(model.purpose);
    if (model.credential && typeof model.credential !== "string") throw routingError(RoutingErrorCode.MODEL_CONFIGURATION_INVALID, "Credential must be a reference");
  }
  if (enabled.length === 2 && enabled.some((model) => !model.purpose)) throw routingError(RoutingErrorCode.MODEL_CONFIGURATION_INVALID, "Two Models require distinct purposes");
  return registry;
}

export function selectModel({ registry, purpose = "general", availability = {} } = {}) {
  validateModelRegistry(registry);
  const enabled = registry.models.filter((model) => model.enabled !== false);
  if (!enabled.length) throw routingError(RoutingErrorCode.MODEL_CONFIGURATION_REQUIRED, "No enabled Model is configured");
  if (!PURPOSES.has(purpose)) throw routingError(RoutingErrorCode.PURPOSE_REQUIRED, `Unsupported Model purpose: ${purpose}`);
  if (enabled.length === 2 && purpose === "general") throw routingError(RoutingErrorCode.PURPOSE_REQUIRED, "Purpose is required when two Models are configured");
  const model = enabled.length === 1 ? enabled[0] : enabled.find((candidate) => candidate.purpose === purpose);
  if (!model) throw routingError(RoutingErrorCode.PURPOSE_REQUIRED, `No Model is configured for purpose: ${purpose}`);
  const isAvailable = availability[model.id] ?? model.available ?? true;
  const common = { selectedModelId: model.id, selectedPurpose: model.purpose ?? "general", selectedProfile: "user_selected", routingReason: enabled.length === 1 ? "single user-selected Model" : "user-selected purpose mapping", fallback: null, costEstimate: model.cost ?? "unknown", policyVersion: 2 };
  if (!isAvailable) return { ...common, availability: "unavailable", needsApproval: false, errorCode: RoutingErrorCode.MODEL_UNAVAILABLE };
  return { ...common, model, availability: "available", needsApproval: false };
}

function routingError(code, message) { const error = new Error(message); error.code = code; return error; }
