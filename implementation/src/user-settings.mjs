import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const USER_SETTINGS_SCHEMA_VERSION = 1;

export function defaultUserSettings() {
  return { schemaVersion: USER_SETTINGS_SCHEMA_VERSION, language: "ko", uiMode: "tui", recentWorkspaces: [], onboardingVersion: 1 };
}

export function validateUserSettings(value) {
  if (!value || typeof value !== "object" || value.schemaVersion !== USER_SETTINGS_SCHEMA_VERSION) throw new Error(`Unsupported user settings schema: ${value?.schemaVersion ?? "unknown"}`);
  if (!Array.isArray(value.recentWorkspaces) || value.recentWorkspaces.some((item) => typeof item !== "string")) throw new Error("recentWorkspaces must be an array of paths");
  if (!["ko", "en"].includes(value.language)) throw new Error("language must be ko or en");
  if (!["tui", "cli"].includes(value.uiMode)) throw new Error("uiMode must be tui or cli");
  return value;
}

export async function loadUserSettings(path) {
  try { return validateUserSettings(JSON.parse(await readFile(path, "utf8"))); }
  catch (error) { if (error.code === "ENOENT") return defaultUserSettings(); throw error; }
}

export async function saveUserSettings(path, settings) {
  const valid = validateUserSettings({ ...defaultUserSettings(), ...settings });
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  try { await writeFile(temporary, `${JSON.stringify(valid, null, 2)}\n`, { mode: 0o600 }); await rename(temporary, path); }
  catch (error) { await unlink(temporary).catch(() => {}); throw error; }
  return valid;
}

export function rememberWorkspace(settings, workspace, max = 10) {
  const recent = [workspace, ...settings.recentWorkspaces.filter((item) => item !== workspace)].slice(0, max);
  return { ...settings, recentWorkspaces: recent };
}
