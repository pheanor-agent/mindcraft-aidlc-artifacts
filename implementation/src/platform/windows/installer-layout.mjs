import { mkdir, rename, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

export function installLayout({ root, version }) {
  if (!root || !version) throw new Error("Install root and version are required");
  const base = resolve(root);
  const versionRoot = join(base, "versions", version);
  return Object.freeze({ root: base, current: join(base, "current"), versionRoot, runtime: join(versionRoot, "runtime", "node.exe"), app: join(versionRoot, "app"), manifest: join(versionRoot, "release-manifest.json"), userData: join(base, "user-data") });
}

export async function stageVersion({ layout, prepare = async () => {} } = {}) {
  await mkdir(layout.versionRoot, { recursive: true });
  await prepare(layout.versionRoot);
  return layout.versionRoot;
}

export async function activateVersion({ layout, previous = null } = {}) {
  const backup = previous ?? `${layout.current}.previous`;
  await rm(backup, { recursive: true, force: true });
  try { await rename(layout.current, backup); } catch (error) { if (error.code !== "ENOENT") throw error; }
  try { await rename(layout.versionRoot, layout.current); }
  catch (error) { try { await rename(backup, layout.current); } catch {} throw error; }
  return { active: layout.current, previous: backup };
}

export async function verifyInstallLayout(layout) {
  const required = [layout.current, layout.userData];
  const checks = await Promise.all(required.map(async (path) => { try { return { path, exists: (await stat(path)).isDirectory() }; } catch { return { path, exists: false }; } }));
  return { ok: checks.every((item) => item.exists), checks };
}
