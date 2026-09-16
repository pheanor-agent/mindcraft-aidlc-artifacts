import { app as electronApp, BrowserWindow, ipcMain, dialog } from "electron";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { loadModelRegistry } from "../src/config-store.mjs";
import { resolveModelSelection } from "../src/model-config.mjs";
import { MindCraftApp } from "../src/mindcraft-app.mjs";
import { CONTROL_COMMANDS, executeApplicationCommand, parseCommand } from "../src/command-queue.mjs";

let core;
let commandState = { currentTask: null };
let commandTail = Promise.resolve();

function optionValue(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
}

async function createCore() {
  const workspace = resolve(optionValue(process.argv, "--workspace") ?? process.env.MINDCRAFT_WORKSPACE ?? process.cwd());
  const mode = process.argv.includes("--mock") || process.env.MINDCRAFT_MODE === "mock" ? "mock" : "default";
  const configPath = process.env.MINDCRAFT_CONFIG ?? join(workspace, ".mindcraft", "config.json");
  let models;
  try {
    models = existsSync(configPath) ? (await loadModelRegistry(configPath)).models : [];
  } catch (error) {
    throw new Error(`Model configuration could not be loaded: ${error.message}`);
  }
  if (mode === "mock") {
    models = [{ id: "desktop-mock", provider: "mock", model: "deterministic", enabled: true }];
  } else if (!models.length && process.env.MINDCRAFT_PROVIDER === "ollama") {
    const selection = resolveModelSelection(process.env);
    models = [{ id: `${selection.provider}-${selection.modelId}`, provider: selection.provider, model: selection.modelId, baseUrl: selection.baseUrl, credential: "env:OLLAMA_API_KEY", enabled: true }];
  }
  if (mode === "mock" && !models.length) {
    models = [{ id: "desktop-mock", provider: "mock", model: "deterministic", enabled: true }];
  }
  core = await new MindCraftApp({
    cwd: workspace,
    statePath: join(workspace, ".mindcraft", "state.jsonl"),
    knowledgePath: join(workspace, ".mindcraft", "knowledge.jsonl"),
    configPath,
    models,
    mode,
    commands: [],
  }).init();
  return { workspace, mode, model: core.describeModel(), preflight: core.preflight };
}

function sendEvent(event) {
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send("mindcraft:event", event);
}

function runCommand(raw) {
  const execute = async () => executeApplicationCommand({
    app: core,
    state: commandState,
    raw,
    locale: "ko",
    write: (line) => sendEvent({ type: "output", text: String(line) }),
    onEvent: (event) => sendEvent({ type: "core-event", event }),
  });
  // Read-only and approval controls must remain usable while a Run is
  // waiting on a provider or a human gate. This mirrors the TUI contract.
  if (CONTROL_COMMANDS.has(parseCommand(raw).command)) return execute();
  const result = commandTail.then(execute);
  commandTail = result.catch(() => undefined);
  return result;
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 640,
    title: "MindCraft Desktop",
    webPreferences: { preload: join(import.meta.dirname, "preload.mjs"), contextIsolation: true, nodeIntegration: false },
  });
  window.loadFile(join(import.meta.dirname, "..", "docs", "DUI", "index.html"));
  return window;
}

electronApp.whenReady().then(async () => {
  try {
    const boot = await createCore();
    ipcMain.handle("mindcraft:boot", () => boot);
    ipcMain.handle("mindcraft:command", (_event, raw) => runCommand(raw));
    ipcMain.handle("mindcraft:snapshot", () => ({
      boot: { workspace: core.cwd, mode: core.mode, model: core.describeModel(), preflight: core.preflight },
      tasks: core.listTasks(),
      status: core.status(commandState.currentTask?.id ?? null),
      history: core.history(commandState.currentTask?.id ?? null),
      approvals: core.listPendingApprovals(),
    }));
    ipcMain.handle("mindcraft:quit", async () => { await core.close?.(); electronApp.quit(); });
    createWindow();
  } catch (error) {
    dialog.showErrorBox("MindCraft Desktop 시작 실패", error.message);
    electronApp.quit();
  }
});

electronApp.on("window-all-closed", () => { if (process.platform !== "darwin") electronApp.quit(); });
electronApp.on("activate", () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
