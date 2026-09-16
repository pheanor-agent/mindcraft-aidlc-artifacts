import { homedir } from "node:os";
import { join } from "node:path";
import { loadUserSettings, rememberWorkspace, saveUserSettings } from "./user-settings.mjs";
import { validateWorkspace, workspaceDataPaths } from "./workspace-service.mjs";
import { resolveEffectiveConfig } from "./effective-config.mjs";

export function createLaunchContext({ appRoot = process.cwd(), runtimePath = process.execPath, userDataRoot = join(homedir(), ".mindcraft"), requestedWorkspace, uiMode = "tui", launchSource = "terminal", requestedMode } = {}) {
  return Object.freeze({ appRoot, runtimePath, userDataRoot, requestedWorkspace, uiMode, launchSource, requestedMode });
}

export async function prepareWorkspace(context, workspacePath) {
  const checked = await validateWorkspace(workspacePath);
  const paths = workspaceDataPaths(checked.path);
  const settingsPath = join(context.userDataRoot, "settings.json");
  const settings = await loadUserSettings(settingsPath);
  const nextSettings = await saveUserSettings(settingsPath, rememberWorkspace(settings, checked.path));
  return { context: Object.freeze({ ...context, workspaceRoot: checked.path }), settings: nextSettings, paths };
}

export function resolveLaunchConfig({ workspaceConfig, settings, context }) {
  return resolveEffectiveConfig({ workspaceConfig, userSettings: settings, launch: { workspace: context.workspaceRoot, uiMode: context.uiMode, mode: context.requestedMode } });
}
