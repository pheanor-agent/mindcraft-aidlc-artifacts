import { createHash } from "node:crypto";
import { appendFile, copyFile, lstat, mkdir, readFile, realpath, rename } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { isWithinExecutionRoot } from "./path-policy.mjs";

const DEFAULT_APPROVAL_KINDS = ["filesystem.write", "command.execute", "network.request"];
export const ApprovalStatus = Object.freeze({ PENDING: "pending", APPROVED: "approved", REJECTED: "rejected", EXECUTED: "executed" });

function normalizePath(value) { return String(value).replaceAll("\\", "/").replace(/\/+/g, "/"); }
function canonical(value) { return normalizePath(resolve(String(value))); }
function matchesPrefix(value, prefixes) { return prefixes.some((prefix) => value === prefix || value.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`)); }
function commandMatches(request, allowed) {
  return scopeCommandMatches(request, allowed);
}
function scopeCommandMatches(request, allowed) {
  if (typeof allowed === "string") return request.command === allowed && (request.args ?? []).length === 0;
  if (!allowed || allowed.executable !== request.command) return false;
  return JSON.stringify(allowed.args ?? []) === JSON.stringify(request.args ?? []) && (!allowed.cwd || canonical(allowed.cwd) === canonical(request.cwd));
}
function redact(value) { return String(value ?? "").replace(/(Bearer\s+|(?:api[_-]?key|token|secret|password)(?:\s*[=:]\s*|\s+))\S+/gi, "$1[REDACTED]"); }
function immutableRequest(request) { return Object.freeze(structuredClone(request)); }

export function createExecutionScope({ root, commands = [], approvedExternalPaths = [], approvedCommands = [] } = {}) {
  const executionRoot = canonical(root ?? process.cwd());
  return createGrantedScope({
    filesystem: { read: [executionRoot, ...approvedExternalPaths], write: [executionRoot, ...approvedExternalPaths] },
    commands: [...new Set([...commands, ...approvedCommands])], approvalRequired: DEFAULT_APPROVAL_KINDS, executionRoot,
  });
}

export function isWithinRoot(root, target) {
  return isWithinExecutionRoot(root, target);
}

export function createGrantedScope(input = {}) {
  return {
    executionRoot: input.executionRoot ? canonical(input.executionRoot) : null,
    filesystem: { read: (input.filesystem?.read ?? []).map(canonical), write: (input.filesystem?.write ?? []).map(canonical) },
    commands: [...(input.commands ?? [])], network: { hosts: [...(input.network?.hosts ?? [])] },
    approvalRequired: new Set(input.approvalRequired ?? DEFAULT_APPROVAL_KINDS),
  };
}

export function decideTool(scope, request) {
  const kind = request?.kind;
  if (kind === "filesystem.read" || kind === "filesystem.write") {
    const allowed = matchesPrefix(canonical(request.path), scope.filesystem[kind.endsWith("read") ? "read" : "write"]);
    if (!allowed) return { allowed: false, reason: "scope_denied" };
    return scope.approvalRequired.has(kind) ? { allowed: false, reason: "approval_required" } : { allowed: true, reason: "scope" };
  }
  if (kind === "command.execute") {
    if (!scope.commands.some((allowed) => commandMatches(request, allowed))) return { allowed: false, reason: "command_denied" };
    return scope.approvalRequired.has(kind) ? { allowed: false, reason: "approval_required" } : { allowed: true, reason: "scope" };
  }
  if (kind === "network.request") return scope.network.hosts.includes(request.host) && !scope.approvalRequired.has(kind) ? { allowed: true, reason: "scope" } : { allowed: false, reason: "approval_required" };
  return { allowed: false, reason: "unknown_tool" };
}

async function canonicalExistingOrParent(path) {
  const absolute = canonical(path);
  try { return await realpath(absolute); } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  let candidate = dirname(absolute);
  const missing = [];
  while (true) {
    try {
      const parent = await realpath(candidate);
      return `${parent}/${[...missing.reverse(), absolute.slice(candidate.length + 1)].join("/")}`;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const next = dirname(candidate);
      if (next === candidate) throw error;
      missing.push(candidate.slice(next.length + 1));
      candidate = next;
    }
  }
}

export async function validatePath(scope, path, operation = "read") {
  const request = { kind: `filesystem.${operation}`, path };
  const lexical = decideTool({ ...scope, approvalRequired: new Set() }, request);
  if (!lexical.allowed) return { allowed: false, reason: "scope_denied" };
  const actual = normalizePath(await canonicalExistingOrParent(path));
  const roots = scope.filesystem[operation] ?? [];
  if (scope.executionRoot && matchesPrefix(actual, [`${scope.executionRoot}/.mindcraft`])) return { allowed: false, reason: "control_path_denied" };
  return matchesPrefix(actual, roots) ? { allowed: true, path: actual } : { allowed: false, reason: "symlink_escape" };
}

export class ApprovalManager {
  constructor({ onDecision = () => {}, onExecutionStart = async () => {}, onExecutionResult = async () => {} } = {}) { this.pending = new Map(); this.cancelledRuns = new Set(); this.onDecision = onDecision; this.onExecutionStart = onExecutionStart; this.onExecutionResult = onExecutionResult; this.writeChain = Promise.resolve(); this.writeError = null; }
  recordDecision(event) {
    this.writeChain = this.writeChain.then(async () => {
      try { await this.onDecision(event); }
      catch (error) { this.writeError ??= error; }
    });
    return this.writeChain;
  }
  async flush() {
    await this.writeChain;
    if (this.writeError) throw this.writeError;
  }
  async recordExecutionStart(request) {
    await this.onExecutionStart({ type: "tool_execution_started", requestId: request.requestId ?? null, request: immutableRequest(request) });
  }
  async recordExecutionResult(request, result) {
    await this.onExecutionResult({ type: "tool_execution_result", requestId: request.requestId ?? null, request: immutableRequest(request), result: structuredClone(result) });
  }
  create(request) {
    const id = request.id ?? `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record = { id, status: ApprovalStatus.PENDING, request: immutableRequest({ ...request }), createdAt: new Date().toISOString() };
    let resolveDecision; const promise = new Promise((resolve) => { resolveDecision = resolve; });
    this.pending.set(id, { record, resolveDecision }); this.recordDecision({ type: "tool_decision", ...record });
    if (record.request.runId && this.cancelledRuns.has(record.request.runId)) {
      record.status = "cancelled"; this.recordDecision({ type: "tool_decision", ...record });
      resolveDecision("cancelled"); this.pending.delete(id);
    }
    return { id, record, promise };
  }
  resolve(id, approved) {
    const item = this.pending.get(id); if (!item) throw new Error(`Approval not found: ${id}`);
    if (item.record.status !== ApprovalStatus.PENDING) throw new Error(`Approval is no longer pending: ${id}`);
    item.record.status = approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    item.record.decidedAt = new Date().toISOString(); this.recordDecision({ type: "tool_decision", ...item.record });
    item.resolveDecision(item.record.status); if (!approved) this.pending.delete(id); return item.record;
  }
  complete(id) {
    const item = this.pending.get(id); if (!item) return null;
    item.record.status = ApprovalStatus.EXECUTED; item.record.executedAt = new Date().toISOString();
    this.recordDecision({ type: "tool_decision", ...item.record }); this.pending.delete(id); return item.record;
  }
  fail(id, status = "failed") {
    const item = this.pending.get(id); if (!item) return null;
    item.record.status = status; item.record.failedAt = new Date().toISOString();
    this.recordDecision({ type: "tool_decision", ...item.record }); this.pending.delete(id); return item.record;
  }
  cancelRun(runId) {
    this.cancelledRuns.add(runId);
    for (const [id, item] of this.pending) {
      if (item.record.request.runId !== runId) continue;
      item.record.status = "cancelled"; item.record.cancelledAt = new Date().toISOString();
      this.recordDecision({ type: "tool_decision", ...item.record });
      item.resolveDecision("cancelled"); this.pending.delete(id);
    }
  }
  list() { return [...this.pending.values()].filter(({ record }) => record.status === ApprovalStatus.PENDING).map(({ record }) => ({ ...record })); }
}

export async function guardedExecute(scope, request, execute, { approvalManager = null } = {}) {
  const initial = decideTool(scope, request);
  if (initial.reason === "scope_denied" || initial.reason === "command_denied" || initial.reason === "unknown_tool") return { executed: false, decision: initial };
  if (scope.approvalRequired.has(request.kind)) {
    if (!approvalManager) return { executed: false, decision: { allowed: false, reason: "approval_required", status: ApprovalStatus.PENDING } };
    const approval = approvalManager.create(request); await approvalManager.flush(); const status = await approval.promise;
    if (status !== ApprovalStatus.APPROVED) return { executed: false, decision: { allowed: false, reason: "rejected", status } };
    await approvalManager.flush();
    const executionRequest = { ...request, requestId: approval.id };
    await approvalManager.recordExecutionStart(executionRequest);
    let result;
    try {
      result = await execute();
      await approvalManager.recordExecutionResult(executionRequest, { ok: true, result });
    } catch (error) {
      await approvalManager.recordExecutionResult(executionRequest, { ok: false, error: redact(error?.message ?? error) });
      await approvalManager.flush();
      approvalManager.fail(approval.id, "failed");
      await approvalManager.flush();
      throw error;
    }
    await approvalManager.flush();
    approvalManager.complete(approval.id); await approvalManager.flush();
    return { executed: true, decision: { allowed: true, reason: "approved", status: ApprovalStatus.EXECUTED }, result };
  }
  return { executed: true, decision: initial, result: await execute() };
}

export function redactOutput(value) { return redact(value); }

export class JsonlCheckpointStore {
  constructor(path) { this.path = path; this.recovery = { valid: true, corruption: null, validRecords: 0 }; }
  async append(record) { const safe = { ...record, timestamp: record.timestamp ?? new Date().toISOString() }; const body = JSON.stringify(safe); const line = JSON.stringify({ record: safe, checksum: createHash("sha256").update(body).digest("hex") }) + "\n"; await mkdir(dirname(this.path), { recursive: true }); await appendFile(this.path, line, "utf8"); return safe; }
  async readCommitted() { let text; try { text = await readFile(this.path, "utf8"); } catch (error) { if (error.code === "ENOENT") return []; throw error; } const records = []; this.recovery = { valid: true, corruption: null, validRecords: 0 }; for (const [index, line] of text.split("\n").entries()) { if (!line.trim()) continue; try { const parsed = JSON.parse(line); const body = JSON.stringify(parsed.record); if (!parsed?.record || createHash("sha256").update(body).digest("hex") !== parsed.checksum) throw new Error("checksum mismatch"); records.push(parsed.record); this.recovery.validRecords = records.length; } catch (error) { this.recovery = { valid: false, corruption: { line: index + 1, reason: error.message }, validRecords: records.length }; break; } } return records; }
  async recoverRuns() { const records = await this.readCommitted(); const latest = new Map(); for (const record of records) if (record.runId) latest.set(record.runId, record); return [...latest.values()].map((record) => record.state === "running" ? { ...record, state: "recoverable" } : record); }
  async repair() { await this.readCommitted(); if (this.recovery.valid) return { repaired: false, reason: "journal is valid" }; const backup = `${this.path}.corrupt-${Date.now()}`; await copyFile(this.path, backup); const repaired = `${this.path}.repaired`; for (const record of await this.readCommitted()) { const body = JSON.stringify(record); await appendFile(repaired, JSON.stringify({ record, checksum: createHash("sha256").update(body).digest("hex") }) + "\n", "utf8"); } await rename(repaired, this.path); await this.readCommitted(); return { repaired: true, backup, validRecords: this.recovery.validRecords }; }
}
