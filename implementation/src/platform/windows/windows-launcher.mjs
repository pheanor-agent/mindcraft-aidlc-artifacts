import { access, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createProcessTreeAdapter } from "./process-tree-adapter.mjs";

export async function loadLaunchManifest(path) {
  const manifest = JSON.parse(await readFile(path, "utf8"));
  if (!manifest?.app || !manifest?.version || !Array.isArray(manifest.files)) throw new Error("Invalid release manifest");
  return manifest;
}

export async function launchInstalledApp({ installRoot, version = null, args = [], env = process.env, processAdapter = createProcessTreeAdapter(), spawnOptions = {} } = {}) {
  const root = resolve(installRoot);
  const active = version ? join(root, "versions", version) : join(root, "current");
  const manifestPath = join(active, "release-manifest.json");
  await access(manifestPath);
  const manifest = await loadLaunchManifest(manifestPath);
  const runtime = join(active, "runtime", "node.exe");
  const entry = join(active, "app", "src", "cli.mjs");
  await access(runtime);
  await access(entry);
  const handle = processAdapter.spawn(runtime, [entry, ...args], { cwd: dirname(entry), env: { ...env, MINDCRAFT_INSTALL_ROOT: root, MINDCRAFT_VERSION: manifest.version }, ...spawnOptions });
  return { handle, manifest, activeRoot: active };
}
