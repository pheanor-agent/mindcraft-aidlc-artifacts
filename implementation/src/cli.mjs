#!/usr/bin/env node
import readline from "node:readline";
import { MindCraftApp } from "./mindcraft-app.mjs";
import { addModel, initializeConfig, loadModelRegistry } from "./config-store.mjs";
import { runPreflight } from "./preflight.mjs";
import { runMindCraftTui } from "./tui-runner.mjs";
import { CommandQueue, CONTROL_COMMANDS, executeApplicationCommand, parseCommand } from "./command-queue.mjs";
import { parseLaunchOptions } from "./launch-options.mjs";
import { WorkflowRepository } from "./workflow-repository.mjs";
import { WorkspaceLock } from "./workspace-lock.mjs";

let launchOptions;
try { launchOptions = parseLaunchOptions(process.argv.slice(2)); }
catch (error) { console.error(`error: ${error.message}`); process.exit(2); }
if (launchOptions.help) {
  console.log("Usage: mindcraft [--cli|--tui] [--mock] [--workspace <path>] [command [options]]");
  console.log("Commands: init [--force], doctor, config add-model, repair, or interactive commands");
  process.exit(0);
}
if (launchOptions.version) {
  console.log("mindcraft 0.1.0");
  process.exit(0);
}
const workspaceRoot = launchOptions.workspace ?? process.cwd();
const configPath = process.env.MINDCRAFT_CONFIG ?? `${workspaceRoot}/.mindcraft/config.json`;
const statePath = ".mindcraft/state.jsonl";
const knowledgePath = ".mindcraft/knowledge.jsonl";
let mode = launchOptions.mode ?? process.env.MINDCRAFT_MODE ?? "default";

function statusMark(status) { return status === "pass" ? "OK" : status === "warn" ? "WARN" : "FAIL"; }
function printDoctor(report) {
  console.log("MindCraft doctor");
  console.log(`mode: ${mode} [OK]`);
  console.log(`Node.js: ${process.versions.node} [OK]`);
  console.log(`Pi runtime: ${report.localReady ? "local runtime ready" : "not started (local preflight failed)"} [${report.localReady ? "OK" : "FAIL"}]`);
  console.log(`live provider readiness: ${report.liveReady ? "ready" : "needs attention"} [${report.liveReady ? "OK" : "WARN"}]`);
  console.log(`workspace: ${workspaceRoot} [OK]`);
  const c = report.checks;
  console.log(`Model registry: ${c.modelRegistry.count} enabled Model(s) — ${c.modelRegistry.message} [${statusMark(c.modelRegistry.status)}]`);
  for (const provider of c.providers) console.log(`provider availability: ${provider.provider} — ${provider.status} [${statusMark(provider.status === "available" ? "pass" : "fail")}]`);
  for (const credential of c.credentials) console.log(`credential: ${credential.id} — ${credential.status} [${statusMark(credential.status === "configured" || credential.status === "not configured" ? "pass" : "fail")}]`);
  console.log(`storage: state=${c.storage.state ? "writable" : "not writable"}, knowledge=${c.storage.knowledge ? "writable" : "not writable"} [${statusMark(c.storage.status)}]`);
  if (!c.modelRegistry.count) console.log("Action: add a Model with `mindcraft config add-model`");
  if (!report.ok) console.log("MindCraft cannot run until preflight issues are fixed.");
}

function parseFlags(args) {
  const result = {};
  for (let i = 0; i < args.length; i += 1) if (args[i].startsWith("--")) result[args[i].slice(2)] = args[i + 1]?.startsWith("--") ? true : args[++i];
  return result;
}

const [topCommand, subCommand, ...args] = launchOptions.commandArgs;
if (topCommand === "init") {
  const result = await initializeConfig(configPath, { force: subCommand === "--force" || args.includes("--force") });
  console.log(result.created ? `Initialized ${configPath}` : `Config already exists: ${configPath}`);
  if (result.created) console.log("Next step: mindcraft config add-model");
  process.exit(0);
}
if (topCommand === "doctor") {
  let registry;
  try { registry = await loadModelRegistry(configPath); } catch (error) {
    const report = await runPreflight({ cwd: workspaceRoot, registry: { schemaVersion: 1, models: [] }, statePath: `${workspaceRoot}/.mindcraft/state.jsonl`, knowledgePath: `${workspaceRoot}/.mindcraft/knowledge.jsonl` });
    report.checks.modelRegistry = { status: "fail", count: 0, message: `Invalid Model registry: ${error.message.replace(/(token|secret|key)=?\S+/gi, "$1=[REDACTED]")}`, code: "MODEL_CONFIGURATION_INVALID" };
    printDoctor(report);
    process.exitCode = 1;
    process.exit();
  }
  const report = await runPreflight({ cwd: workspaceRoot, registry, statePath: `${workspaceRoot}/.mindcraft/state.jsonl`, knowledgePath: `${workspaceRoot}/.mindcraft/knowledge.jsonl` });
  printDoctor(report);
  process.exitCode = report.ok ? 0 : 1;
  process.exit();
}
if (topCommand === "config" && subCommand === "add-model") {
  const flags = parseFlags(args);
  if (!flags.id || !flags.provider || !flags.model) { console.error("Usage: mindcraft config add-model --id <id> --provider <provider> --model <model> [--purpose <purpose>] [--credential <env:NAME>]"); process.exit(2); }
  try {
    await addModel(configPath, { id: flags.id, provider: flags.provider, model: flags.model, ...(flags.purpose ? { purpose: flags.purpose } : {}), ...(flags.credential ? { credential: flags.credential } : {}) });
    console.log(`Model added: ${flags.id}`);
  } catch (error) { console.error(`error: ${error.message}`); process.exitCode = 1; }
  process.exit();
}

if (topCommand === "repair") {
  const repairPath = `${workspaceRoot}/.mindcraft/state.jsonl`;
  const lock = new WorkspaceLock(repairPath);
  try {
    await lock.acquire();
    const repository = await new WorkflowRepository(repairPath).load();
    const result = await repository.repair();
    console.log(result.repaired ? `Journal repaired: ${result.validRecords} valid record(s); backup=${result.backup}` : `Journal repair not needed: ${result.reason}`);
    console.log("Next step: restart MindCraft and verify tasks/status");
  } catch (error) {
    console.error(`error: ${String(error.message ?? error).replace(/(Bearer\s+|token|secret|api[_-]?key)([=:]?\s*)\S+/gi, "$1$2[REDACTED]")}`);
    process.exitCode = 1;
  } finally {
    await lock.release();
  }
  process.exit();
}

let modelRegistry;
try { modelRegistry = await loadModelRegistry(configPath); } catch (error) { console.error(`error: invalid config — ${error.message}`); process.exit(1); }
if (mode === "default" && modelRegistry.models.some((model) => model.enabled !== false && model.provider === "mock")) mode = "mock";
const commands = mode === "mock" ? [{ executable: "node", args: ["--test", "test/release-check.test.mjs"], cwd: workspaceRoot }] : [];
let app;
try {
  app = await new MindCraftApp({ cwd: workspaceRoot, statePath: `${workspaceRoot}/.mindcraft/state.jsonl`, knowledgePath: `${workspaceRoot}/.mindcraft/knowledge.jsonl`, configPath, models: modelRegistry.models, mode, commands }).init();
} catch (error) {
  if (error.code === "JOURNAL_CORRUPTED") {
    const recovery = error.recovery;
    console.error(`error: journal corrupted at line ${recovery.corruption.line} (${recovery.corruption.reason}); valid records=${recovery.validRecords}`);
    console.error("Action: run `mindcraft repair`, then restart MindCraft.");
  } else console.error(`error: ${error.message}`);
  process.exit(1);
}

const useTui = launchOptions.uiMode === "tui" && (process.env.MINDCRAFT_TUI === "1" || (process.stdin.isTTY && process.stdout.isTTY));
if (useTui) {
  await runMindCraftTui({ app, onExit: () => process.exit(0) });
} else {
  console.log(`MindCraft TUI (Pi runtime, mode=${mode}) — commands: setup <provider> <model> [purpose] | doctor | repair | task <title> | tasks | use <task-id> | model | mode default|token-doctor|mock | run <prompt> | approvals | approve <id> | reject <id> | status | history | runs | resume <run-id> | cancel <run-id> | knowledge | promote <id> | reject-knowledge <id> | quit`);
  console.log(`model: ${app.describeModel()}`);
  const state = { currentTask: null };
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "mindcraft> " });
  rl.prompt();
  const inputQueue = new CommandQueue();
  rl.on("line", (line) => { const parsed = parseCommand(line); const execute = async () => {
    const write = (line) => String(line).startsWith("error:") ? console.error(line) : console.log(line);
    const result = await executeApplicationCommand({ app, state, raw: line, write, onEvent: (event) => {
      console.log(`event=${event.type}`);
      if (event.type === "tool_decision" && event.status === "pending") console.log(`approval=${event.id} ${event.request?.kind} ${event.request?.path ?? event.request?.command ?? ""} pending`);
    } });
    if (result.exit) return rl.close();
    rl.prompt();
  }; if (CONTROL_COMMANDS.has(parsed.command)) void execute(); else inputQueue.enqueue(execute); });
}
