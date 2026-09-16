import { Type } from "@sinclair/typebox";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { dirname } from "node:path";
import { promisify } from "node:util";
import { createGrantedScope, decideTool, validatePath, guardedExecute, redactOutput } from "./safety-recovery.mjs";

function result(text, decision) { return { content: [{ type: "text", text }], details: { decision } }; }
const execFileAsync = promisify(execFile);
const PREVIEW_LIMIT = 1000;

async function fileMetadata(path, content) {
  try {
    const existing = await readFile(path, "utf8");
    return { existingContentChars: existing.length, existingContentDigest: createHash("sha256").update(existing).digest("hex"), changeType: existing === content ? "unchanged" : "overwrite", existingContentPreview: redactOutput(existing).slice(0, PREVIEW_LIMIT) };
  } catch (error) {
    return error.code === "ENOENT" ? { existingContentChars: 0, existingContentDigest: null, changeType: "create", existingContentPreview: null } : { existingContentChars: null, existingContentDigest: null, changeType: "unknown", existingContentPreview: null };
  }
}

async function terminateProcessTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) return { requested: false, confirmed: true, method: "already-exited" };
  let method = "child.kill";
  try {
    if (process.platform === "win32") {
      method = "taskkill-tree";
      await execFileAsync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
    } else {
      // A detached child is the leader of its own process group. Negative pid
      // terminates descendants as well as the direct child.
      process.kill(-child.pid, "SIGTERM");
    }
  } catch {
    try { child.kill("SIGTERM"); } catch { /* best effort */ }
  }
  return { requested: true, confirmed: false, method };
}

function runCommand(command, args, cwd, timeout, signal = null) {
  return new Promise((resolve) => {
    // Resolve the approved logical Node command to the runtime running this app.
    // This keeps portable installs independent of a development Node on PATH.
    const executable = command === "node" ? process.execPath : command;
    const child = spawn(executable, args, { cwd, shell: false, detached: process.platform !== "win32", windowsHide: true, env: { PATH: process.env.PATH ?? "", ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}) }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false, outputLimited = false, cancelled = false, termination = null, settled = false;
    let cancelHandler = null;
    const terminate = async (reason) => {
      if (termination) return;
      if (reason === "timeout") timedOut = true;
      if (reason === "cancel") cancelled = true;
      termination = await terminateProcessTree(child);
    };
    const timer = setTimeout(() => { void terminate("timeout"); }, timeout);
    const collect = (name) => (chunk) => { if (name === "stdout") stdout += chunk; else stderr += chunk; if (stdout.length + stderr.length > 12000 && !outputLimited) { outputLimited = true; void terminate("output"); } };
    child.stdout.on("data", collect("stdout")); child.stderr.on("data", collect("stderr"));
    if (signal) {
      cancelHandler = () => { void terminate("cancel"); };
      if (signal.aborted) cancelHandler(); else signal.addEventListener("abort", cancelHandler, { once: true });
    }
    const finish = (value) => {
      if (settled) return;
      settled = true; clearTimeout(timer); if (signal && cancelHandler) signal.removeEventListener("abort", cancelHandler);
      const cleanup = termination ? { ...termination, confirmed: true } : { requested: false, confirmed: true, method: "not-needed" };
      resolve({ ...value, timedOut, outputLimited, cancelled, cleanup, effectStatus: cancelled || timedOut || outputLimited ? "uncertain" : value.code === 0 ? "completed" : "uncertain", stdout: redactOutput(stdout).slice(0, 12000), stderr: redactOutput(stderr).slice(0, 12000) });
    };
    child.on("close", (code, signalName) => finish({ code, signal: signalName }));
    child.on("error", (error) => finish({ code: null, error: redactOutput(error.message) }));
  });
}

export function createMindCraftTools({ scope = createGrantedScope(), onDecision = () => {}, approvalManager = null, runId = null, signal = null } = {}) {
  const approvals = approvalManager;
  const inspect = {
    name: "mindcraft_inspect", label: "MindCraft inspect", description: "Read a file inside the explicitly granted read scope.", promptSnippet: "Read a file only when it is inside the granted read scope.", parameters: Type.Object({ path: Type.String() }),
    async execute(_id, params) {
      const pathCheck = await validatePath(scope, params.path, "read");
      const request = { kind: "filesystem.read", path: pathCheck.path ?? params.path, ...(runId ? { runId } : {}) };
      const decision = pathCheck.allowed ? decideTool(scope, request) : { allowed: false, reason: pathCheck.reason };
      onDecision({ request, decision });
      if (!decision.allowed) return result(`Denied: ${decision.reason}`, decision);
      try { return result((await readFile(pathCheck.path, "utf8")).slice(0, 12000), decision); }
      catch (error) { return result(`Denied: ${redactOutput(error.message)}`, { allowed: false, reason: "read_failed" }); }
    },
  };
  const write = {
    name: "mindcraft_write", label: "MindCraft write", description: "Write a file after explicit user approval.", promptSnippet: "Writes are approval-gated and restricted to the workspace.", parameters: Type.Object({ path: Type.String(), content: Type.String() }),
    async execute(_id, params) {
      const requestedPath = params.path;
      const content = String(params.content);
      const pathCheck = await validatePath(scope, requestedPath, "write");
      const metadata = pathCheck.allowed ? await fileMetadata(pathCheck.path, content) : { existingContentChars: null, existingContentDigest: null, changeType: "denied", existingContentPreview: null };
      const redactedContent = redactOutput(content);
      const contentPreview = redactedContent.slice(0, PREVIEW_LIMIT);
      const request = { kind: "filesystem.write", path: pathCheck.path ?? requestedPath, contentChars: content.length, contentPreview, contentPreviewTruncated: contentPreview.length < redactedContent.length, ...metadata, contentDigest: createHash("sha256").update(content).digest("hex"), impact: `write ${content.length} bytes`, ...(runId ? { runId } : {}) };
      if (!pathCheck.allowed) { const decision = { allowed: false, reason: pathCheck.reason }; onDecision({ request, decision }); return result(`Denied: ${decision.reason}`, decision); }
      const outcome = await guardedExecute(scope, request, async () => {
        const finalCheck = await validatePath(scope, requestedPath, "write");
        const finalDigest = createHash("sha256").update(content).digest("hex");
        if (!finalCheck.allowed || finalCheck.path !== request.path || finalDigest !== request.contentDigest) throw new Error("approved write request changed before execution");
        await mkdir(dirname(finalCheck.path), { recursive: true });
        await writeFile(finalCheck.path, content, "utf8");
        return { path: finalCheck.path };
      }, { approvalManager: approvals });
      onDecision({ request, decision: outcome.decision });
      return outcome.executed ? result("Write completed", outcome.decision) : result(`Approval ${outcome.decision.status ?? "pending"}: ${outcome.decision.reason}`, outcome.decision);
    },
  };
  const command = {
    name: "mindcraft_command", label: "MindCraft command", description: "Run an allowlisted command after explicit user approval.", promptSnippet: "Commands are allowlisted, workspace-bound, timeout-limited, and approval-gated.", parameters: Type.Object({ command: Type.String(), args: Type.Optional(Type.Array(Type.String())), cwd: Type.Optional(Type.String()), timeoutMs: Type.Optional(Type.Integer({ minimum: 1, maximum: 120000 })) }),
    async execute(_id, params) {
      const commandName = params.command;
      const args = [...(params.args ?? [])];
      const timeoutMs = params.timeoutMs ?? 30000;
      const cwd = params.cwd ?? scope.executionRoot;
      const request = { kind: "command.execute", command: commandName, args, cwd, timeoutMs, ...(runId ? { runId } : {}) };
      const decision = decideTool(scope, request);
      if (!decision.allowed && decision.reason !== "approval_required") { onDecision({ request, decision }); return result(`Denied: ${decision.reason}`, decision); }
      const cwdCheck = await validatePath(scope, cwd, "read");
      if (!cwdCheck.allowed || !scope.executionRoot || !cwdCheck.path.startsWith(`${scope.executionRoot}/`) && cwdCheck.path !== scope.executionRoot) { const denied = { allowed: false, reason: "working_directory_denied" }; onDecision({ request, decision: denied }); return result(`Denied: ${denied.reason}`, denied); }
      const outcome = await guardedExecute(scope, request, async () => {
        const finalCwd = await validatePath(scope, cwd, "read");
        const finalDecision = decideTool(scope, { ...request, cwd: finalCwd.path });
        if (!finalCwd.allowed || finalCwd.path !== cwdCheck.path || !finalDecision.allowed && finalDecision.reason !== "approval_required") throw new Error("approved command request changed before execution");
        return runCommand(commandName, args, finalCwd.path, timeoutMs, signal);
      }, { approvalManager: approvals });
      onDecision({ request, decision: outcome.decision });
      return outcome.executed ? result(JSON.stringify(outcome.result), outcome.decision) : result(`Approval ${outcome.decision.status ?? "pending"}: ${outcome.decision.reason}`, outcome.decision);
    },
  };
  return [inspect, write, command];
}
