import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { activateVersion, installLayout, stageVersion, verifyInstallLayout } from "./installer-layout.mjs";

export async function installVersion({ root, version, prepare } = {}) {
  const layout = installLayout({ root, version });
  await stageVersion({ layout, prepare });
  return { layout, staged: true };
}

export async function activateInstalledVersion({ root, version } = {}) {
  const layout = installLayout({ root, version });
  const result = await activateVersion({ layout });
  await mkdir(layout.userData, { recursive: true });
  await writeFile(join(layout.userData, "active-version.json"), `${JSON.stringify({ version, activatedAt: new Date().toISOString() }, null, 2)}\n`, { mode: 0o600 });
  return { ...result, health: await verifyInstallLayout({ ...layout, current: layout.current }) };
}

export async function rollbackInstalledVersion({ root, version } = {}) {
  const layout = installLayout({ root, version });
  const previous = `${layout.current}.previous`;
  await rm(`${layout.current}.rollback-staging`, { recursive: true, force: true });
  await rename(layout.current, `${layout.current}.rollback-staging`);
  await rename(previous, layout.current);
  await rm(`${layout.current}.rollback-staging`, { recursive: true, force: true });
  return { active: layout.current, rolledBack: true };
}

export async function removeInstallation({ root, preserveUserData = true } = {}) {
  const base = installLayout({ root, version: "unused" }).root;
  const versions = join(base, "versions");
  const userData = join(base, "user-data");
  await rm(versions, { recursive: true, force: true });
  if (!preserveUserData) await rm(userData, { recursive: true, force: true });
  return { removed: true, preserved: preserveUserData ? [userData] : [] };
}
