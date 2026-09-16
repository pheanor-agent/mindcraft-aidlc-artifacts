import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { validateModelRegistry } from "./model-routing.mjs";

export const EMPTY_MODEL_REGISTRY = Object.freeze({ schemaVersion: 1, models: [] });

export async function loadModelRegistry(path) {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8"));
    return validateModelRegistry(parsed);
  } catch (error) {
    if (error.code === "ENOENT") return { ...EMPTY_MODEL_REGISTRY, models: [] };
    throw error;
  }
}

export async function saveModelRegistry(path, registry) {
  validateModelRegistry(registry);
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(registry, null, 2)}\n`, { mode: 0o600 });
    await rename(temporaryPath, path);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
  return registry;
}

export async function initializeConfig(path, { force = false } = {}) {
  if (!force) {
    try { await readFile(path); return { created: false, path }; } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  await saveModelRegistry(path, { schemaVersion: 1, models: [] });
  return { created: true, path };
}

export async function addModel(path, model) {
  const registry = await loadModelRegistry(path);
  const next = { ...registry, models: [...registry.models, { enabled: true, ...model }] };
  return saveModelRegistry(path, next);
}
