import { createHash } from "node:crypto";
import { validateModelRegistry } from "./model-routing.mjs";

function revision(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

export function resolveEffectiveConfig({ workspaceConfig, userSettings = {}, launch = {}, env = process.env } = {}) {
  const registry = workspaceConfig ?? { schemaVersion: 2, models: [] };
  validateModelRegistry({ ...registry, schemaVersion: registry.schemaVersion ?? 1 });
  const mode = launch.mode ?? (env.MINDCRAFT_MODE === "mock" ? "mock" : "live");
  if (!["mock", "live", "default", "token-doctor"].includes(mode)) throw new Error(`Unsupported mode: ${mode}`);
  const models = registry.models.filter((model) => model.enabled !== false);
  const effective = {
    models,
    mode,
    uiMode: launch.uiMode ?? userSettings.uiMode ?? "tui",
    workspace: launch.workspace,
    source: { models: "workspace", mode: launch.mode ? "launch" : (env.MINDCRAFT_MODE ? "environment" : "default") },
  };
  return Object.freeze({ ...effective, configRevision: revision(effective) });
}

export function snapshotModelConfig(config, model) {
  return Object.freeze({ id: model?.id ?? null, provider: model?.provider ?? null, model: model?.model ?? null, purpose: model?.purpose ?? null, mode: config.mode, configRevision: config.configRevision });
}
