import { randomUUID } from "node:crypto";
import { saveModelRegistry } from "./config-store.mjs";
import { validateModelRegistry } from "./model-routing.mjs";
import { credentialReferenceForModel, providerDefinition } from "./provider-contract.mjs";

export const OnboardingStep = Object.freeze({
  WELCOME: "Welcome", WORKSPACE: "WorkspaceSelection", MODE: "ExecutionMode", PROVIDER: "ProviderSelection",
  MODEL: "ModelInput", CREDENTIAL: "CredentialInput", VALIDATE: "LocalValidation", REVIEW: "SaveReview",
  CONNECTION: "OptionalConnectionTest", READY: "Ready/Home",
});
const ORDER = Object.values(OnboardingStep);

export function createOnboardingSession({ workspace = null } = {}) {
  return { id: randomUUID(), step: OnboardingStep.WELCOME, draft: { workspace }, committed: false, cancelled: false };
}

export function onboardingStepIndex(step) { return ORDER.indexOf(step); }

export function updateOnboarding(session, action, value) {
  if (!session || session.cancelled || session.committed) throw new Error("Onboarding session is no longer active");
  if (action === "cancel") return { ...session, cancelled: true, draft: {} };
  if (action === "back") return { ...session, step: ORDER[Math.max(0, onboardingStepIndex(session.step) - 1)] };
  if (action === "help") return { ...session, helpRequested: true };
  const draft = { ...session.draft };
  if (value !== undefined) draft[action] = value;
  const next = ORDER[Math.min(ORDER.length - 1, onboardingStepIndex(session.step) + 1)];
  return { ...session, step: next, draft };
}

export function validateOnboardingDraft(draft) {
  if (!draft?.workspace) throw onboardingError("ONBOARDING_WORKSPACE_REQUIRED", "Workspace is required");
  if (!draft?.mode || !["mock", "live"].includes(draft.mode)) throw onboardingError("ONBOARDING_MODE_INVALID", "Execution mode must be mock or live");
  if (!draft?.provider || !providerDefinition(draft.provider)) throw onboardingError("ONBOARDING_PROVIDER_UNKNOWN", "Provider is not supported");
  if (!draft?.model) throw onboardingError("ONBOARDING_MODEL_REQUIRED", "Model ID is required");
  const model = { id: draft.id ?? `${draft.provider}-${draft.model}`, provider: draft.provider, model: draft.model, enabled: true, ...(draft.purpose ? { purpose: draft.purpose } : {}), ...(draft.credential ? { credential: draft.credential } : {}) };
  validateModelRegistry({ schemaVersion: 1, models: [model] });
  if (draft.mode === "mock" && draft.provider !== "mock") throw onboardingError("ONBOARDING_MOCK_PROVIDER_MISMATCH", "Mock mode requires the mock provider");
  return model;
}

export async function commitOnboarding({ session, configPath, credentialStore = null } = {}) {
  if (!session || session.cancelled || session.committed) throw new Error("Onboarding session is not committable");
  const model = validateOnboardingDraft(session.draft);
  let temporaryReference = null;
  try {
    if (session.draft.credentialValue) {
      if (!credentialStore) throw onboardingError("CREDENTIAL_STORE_UNAVAILABLE", "Credential storage is unavailable");
      temporaryReference = await credentialStore.putSession(session.draft.credentialValue, model.id);
      model.credential = temporaryReference;
    } else if (!model.credential) {
      model.credential = credentialReferenceForModel(model);
    }
    const registry = { schemaVersion: 1, models: [model] };
    await saveModelRegistry(configPath, registry);
    return { session: { ...session, step: OnboardingStep.READY, committed: true, draft: { ...session.draft, credentialValue: undefined } }, registry };
  } catch (error) {
    if (temporaryReference) await credentialStore?.remove(temporaryReference).catch(() => {});
    throw error;
  }
}

function onboardingError(code, message) { return Object.assign(new Error(message), { code }); }
