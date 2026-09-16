import { appendFile, copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createHash } from "node:crypto";

function checksum(record) {
  return createHash("sha256").update(JSON.stringify(record)).digest("hex");
}

export class JournalCorruptedError extends Error {
  constructor(recovery, path) {
    super(`Workflow journal is corrupted at line ${recovery.corruption?.line ?? "unknown"}; run mindcraft repair before writing`);
    this.name = "JournalCorruptedError";
    this.code = "JOURNAL_CORRUPTED";
    this.recovery = recovery;
    this.path = path;
  }
}

/** Append-only workflow journal. Replay stops at the first invalid record. */
export class WorkflowRepository {
  constructor(path) {
    this.path = path;
    this.records = [];
    this.recovery = { valid: true, corruption: null, validRecords: 0 };
    this.writeChain = Promise.resolve();
    this.writeError = null;
  }

  async load() {
    this.records = [];
    this.recovery = { valid: true, corruption: null, validRecords: 0 };
    try {
      const text = await readFile(this.path, "utf8");
      const lines = text.split("\n");
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (!parsed?.record || checksum(parsed.record) !== parsed.checksum) throw new Error("checksum mismatch");
          this.records.push(parsed.record);
          this.recovery.validRecords = this.records.length;
        } catch (error) {
          this.recovery = { valid: false, corruption: { line: index + 1, reason: error.message }, validRecords: this.records.length, detectedAt: new Date().toISOString(), action: "run `mindcraft repair` before writing" };
          break;
        }
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    return this;
  }

  async commit(record) {
    const write = this.writeChain.then(async () => {
      if (this.writeError) throw this.writeError;
      if (!this.recovery.valid) throw new JournalCorruptedError(this.recovery, this.path);
      const line = JSON.stringify({ record, checksum: checksum(record) }) + "\n";
      await mkdir(dirname(this.path), { recursive: true });
      await appendFile(this.path, line, "utf8");
      this.records.push(record);
      this.recovery.validRecords = this.records.length;
      return record;
    });
    this.writeChain = write.catch((error) => {
      if (error.code !== "JOURNAL_CORRUPTED") this.writeError ??= error;
    });
    return write;
  }

  latest(kind, id) { return [...this.records].reverse().find((r) => r.kind === kind && r.id === id); }

  recordsForRun(runId) { return this.records.filter((record) => record.runId === runId || (record.kind === "run" && record.id === runId)); }

  latestRuns() {
    const latest = new Map();
    for (const record of this.records) if (record.kind === "run" && record.id) latest.set(record.id, record);
    return [...latest.values()];
  }

  recoverableRuns() {
    return this.latestRuns().filter((run) => run.status === "running" && !this.hasUnknownEffect(run.id)).map((run) => ({ ...run, status: "recoverable", recovery: "process interrupted before terminal checkpoint" }));
  }

  hasUnknownEffect(runId) {
    const records = this.recordsForRun(runId);
    const started = records.filter((record) => record.type === "tool_execution_started");
    for (const execution of started) {
      const requestId = execution.requestId ?? execution.request?.requestId;
      const hasResult = records.some((record) => record.type === "tool_execution_result" && (record.requestId ?? record.request?.requestId) === requestId);
      if (!hasResult) return true;
    }
    return false;
  }

  status(runId) {
    const run = this.latest("run", runId);
    if (!run) return null;
    const events = this.recordsForRun(runId).filter((record) => record.kind === "event" || record.kind === "tool_decision");
    const decisionLatest = new Map();
    for (const decision of events.filter((record) => record.kind === "tool_decision")) decisionLatest.set(decision.id, decision);
    const decisions = [...decisionLatest.values()];
    return {
      id: run.id, taskId: run.taskId ?? null, episodeId: run.episodeId ?? null,
      status: this.hasUnknownEffect(runId) ? "unknown" : run.status, model: run.routing?.selectedModelId ?? null, purpose: run.routing?.selectedPurpose ?? null,
      latestEvent: run.events?.at(-1)?.type ?? events.at(-1)?.type ?? null,
      approvals: { pending: decisions.filter((d) => d.status === "pending").length, approved: decisions.filter((d) => d.status === "approved" || d.status === "executed").length, rejected: decisions.filter((d) => ["rejected", "cancelled"].includes(d.status)).length },
      knowledge: { manifest: run.knowledgeMetrics?.manifest ?? [], capture: run.knowledgeCapture ?? null },
      error: run.error ?? run.knowledgeError ?? null,
      nextAction: this.hasUnknownEffect(runId) ? "confirm the external effect read-only; automatic rerun is blocked" : run.status === "recoverable" || run.status === "running" ? "resume only after checking the last checkpoint" : run.status === "failed" ? "inspect the failure before retrying" : run.status === "aborted" ? "start a new Run if needed" : run.knowledgeCapture?.status === "failed" ? "retry Knowledge capture without rerunning the Run" : "none",
      recovery: this.recovery,
    };
  }

  async repair() {
    await this.writeChain;
    if (this.recovery.valid) return { repaired: false, reason: "journal is valid", path: this.path };
    const corruption = this.recovery.corruption;
    const backup = `${this.path}.corrupt-${Date.now()}`;
    await copyFile(this.path, backup);
    const repaired = `${this.path}.repaired`;
    await mkdir(dirname(repaired), { recursive: true });
    // Always create a fresh temporary journal, including when the valid prefix
    // is empty. This also prevents a stale .repaired file from being reused.
    await writeFile(repaired, "", "utf8");
    for (const record of this.records) {
      await appendFile(repaired, JSON.stringify({ record, checksum: checksum(record) }) + "\n", "utf8");
    }
    // Keep the original and atomically switch the active journal to the valid prefix.
    await rename(repaired, this.path);
    await this.load();
    const repairedJournalDigest = createHash("sha256").update(await readFile(this.path)).digest("hex");
    const audit = { kind: "journal_repaired", id: `journal-repaired:${Date.now()}`, path: this.path, backup, corruption, validRecords: this.records.length, repairedJournalDigest, repairedAt: new Date().toISOString() };
    await this.commit(audit);
    return { repaired: true, backup, validRecords: this.records.length - 1, repairedJournalDigest, auditId: audit.id, path: this.path };
  }
}
