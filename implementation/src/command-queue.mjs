export class CommandTimeoutError extends Error {
  constructor(message = "Command timed out") {
    super(message);
    this.name = "CommandTimeoutError";
    this.code = "COMMAND_TIMEOUT";
  }
}

export class CommandCancelledError extends Error {
  constructor(message = "Command cancelled") {
    super(message);
    this.name = "CommandCancelledError";
    this.code = "COMMAND_CANCELLED";
  }
}

export function withTimeout(promise, timeoutMs, { signal = null, label = "operation", onTimeout = async () => {} } = {}) {
  let timer = null;
  let abortHandler = null;
  const races = [Promise.resolve(promise)];

  if (timeoutMs > 0) {
    races.push(new Promise((_, reject) => {
      timer = setTimeout(async () => {
        try { await onTimeout(); } catch { /* cleanup is best effort */ }
        const error = new CommandTimeoutError(`${label} timed out after ${timeoutMs}ms`);
        reject(error);
      }, timeoutMs);
    }));
  }

  if (signal) {
    races.push(new Promise((_, reject) => {
      abortHandler = () => reject(new CommandCancelledError(`${label} cancelled`));
      if (signal.aborted) abortHandler();
      else signal.addEventListener("abort", abortHandler, { once: true });
    }));
  }

  return Promise.race(races).finally(() => {
    if (timer) clearTimeout(timer);
    if (signal && abortHandler) signal.removeEventListener("abort", abortHandler);
  });
}

/** Serialize interactive commands while still allowing the caller to enqueue
 * input synchronously (readline can emit several `line` events in one tick). */
export class CommandQueue {
  constructor() {
    this.tail = Promise.resolve();
    this.pending = 0;
  }

  enqueue(command, { signal = null, timeoutMs = 0, label = "command" } = {}) {
    this.pending += 1;
    const result = this.tail.then(() => {
      if (signal?.aborted) throw new CommandCancelledError(`${label} cancelled before start`);
      return withTimeout(Promise.resolve().then(() => command({ signal })), timeoutMs, { signal, label });
    });
    this.tail = result.catch(() => undefined).finally(() => { this.pending -= 1; });
    return result;
  }
}

export function parseCommand(raw) {
  const tokens = String(raw ?? "").trim().split(/\s+/).filter(Boolean);
  const [command = "", ...rest] = tokens;
  return { command: command.toLowerCase(), argument: rest.join(" "), args: rest };
}

// Read-only and approval-control commands remain responsive while a queued
// write/run is waiting for a user decision.
export const CONTROL_COMMANDS = Object.freeze(new Set(["approvals", "approve", "reject", "cancel", "status", "history", "runs", "doctor", "use", "help", "quit", "exit"]));

function redact(value) {
  return String(value?.message ?? value ?? "").replace(/(Bearer\s+|token|secret|api[_-]?key)([=:]?\s*)\S+/gi, "$1$2[REDACTED]");
}

/** The application command surface used by both readline and the TUI. */
export async function executeApplicationCommand({ app, state, raw, write = () => {}, onEvent = () => {}, locale = "en" }) {
  const { command, argument } = parseCommand(raw);
  if (!command) return { command, state };
  write(`> ${String(raw).trim()}`);
  const localized = (english, korean) => write(locale === "ko" ? korean : english);
  try {
    let result;
    if (command === "doctor") {
      result = app.preflight ?? await app.checkDoctor();
      localized(`doctor=${result.ok ? "ok" : "failed"}`, result.ok ? "환경 점검이 완료되었습니다." : "환경 점검에 실패했습니다.");
    } else if (command === "task") {
      // `task release-check` intentionally remains a normal task command.
      state.currentTask = await app.createTask({ title: argument || "Untitled", objective: argument || "Describe the next step" });
      localized(`task=${state.currentTask.id} purpose=${state.currentTask.purpose}`, `작업이 생성되었습니다. id=${state.currentTask.id} 용도=${state.currentTask.purpose}`);
      result = state.currentTask;
    } else if (command === "tasks") {
      result = app.listTasks();
      write(result.length ? result.map((task) => `${task.id} ${task.title} ${task.status}`).join("\n") : "No tasks found");
    } else if (command === "use") {
      state.currentTask = app.selectTask(argument);
      localized(`currentTask=${state.currentTask.id}`, `현재 작업을 선택했습니다. id=${state.currentTask.id}`);
      result = state.currentTask;
    } else if (command === "mode") {
      result = argument ? app.setMode(argument) : app.mode;
      localized(`mode=${result}`, `실행 모드: ${result}`);
    } else if (command === "model") {
      result = app.describeModel();
      write(result);
    } else if (command === "setup") {
      const [provider = "", model = "", purpose] = argument.split(/\s+/).filter(Boolean);
      if (!provider || !model) throw new Error("Usage: setup <provider> <model> [purpose]");
      result = await app.configureModel({ id: `${provider}-${model}`.replace(/[^a-zA-Z0-9_-]/g, "-"), provider, model, ...(purpose ? { purpose } : {}) });
      localized(`setup=complete provider=${result.provider} model=${result.model}`, `첫 실행 설정이 완료되었습니다. provider=${result.provider} model=${result.model}`);
    } else if (command === "run") {
      if (!state.currentTask) throw new Error("create a task first");
      result = await app.runNextEpisode(state.currentTask.id, argument || state.currentTask.objective, { onEvent });
      localized(`run=${result.run.status}`, `실행 상태: ${result.run.status}`);
      if (result.text) write(result.text);
    } else if (command === "status") {
      result = { ...app.status(state.currentTask?.id ?? null), preflight: app.preflight };
      write(JSON.stringify(result, null, 2));
    } else if (command === "history") {
      result = app.history(state.currentTask?.id ?? null);
      write(result.length ? JSON.stringify(result, null, 2) : "No history found");
    } else if (command === "runs") {
      if (!state.currentTask) throw new Error("select a task first");
      result = app.listRuns(state.currentTask.id);
      write(result.length ? result.map((run) => `${run.id} ${run.episodeId} ${run.status}`).join("\n") : "No runs found");
    } else if (command === "resume") {
      if (!state.currentTask) throw new Error("select a task first");
      result = await app.resumeRun(argument, state.currentTask.id, { onEvent });
      write(`resume=${result.run.id} status=${result.run.status}`);
    } else if (command === "cancel") {
      result = await app.cancelRun(argument || app.activeRun?.id);
      localized(`cancel=${result.status}`, `실행을 중단했습니다. 상태=${result.status}`);
    } else if (command === "approvals") {
      result = app.listPendingApprovals();
      if (!result.length) write("No pending approvals");
      else {
        write(result.map((item) => `${item.id} ${item.request.kind} ${item.request.path ?? item.request.command ?? ""} ${item.status}`).join("\n"));
        write(JSON.stringify(result.map((item) => ({ id: item.id, status: item.status, kind: item.request.kind, command: item.request.command ?? null, args: item.request.args ?? [], cwd: item.request.cwd ?? null, timeoutMs: item.request.timeoutMs ?? null, path: item.request.path ?? null, contentChars: item.request.contentChars ?? null, contentPreview: item.request.contentPreview ?? null, contentPreviewTruncated: item.request.contentPreviewTruncated ?? false, existingContentChars: item.request.existingContentChars ?? null, changeType: item.request.changeType ?? null, contentDigest: item.request.contentDigest ?? null })), null, 2));
      }
    } else if (command === "approve" || command === "reject") {
      if (!argument) throw new Error(`${command} requires an approval id`);
      result = command === "approve" ? await app.approve(argument) : await app.reject(argument);
      localized(`${command}=${result.id} status=${result.status}`, `${command === "approve" ? "승인" : "거부"} 완료: ${result.id} 상태=${result.status}`);
    } else if (command === "knowledge") {
      if (!app.knowledge) throw new Error("knowledge store not configured");
      result = app.knowledge.list({ query: argument });
      write(result.length ? result.map((item) => `${item.id} ${item.state} source=${item.provenance?.source ?? "unknown"} run=${item.provenance?.runId ?? "-"} chars=${item.metadata?.contentLength ?? item.content.length}`).join("\n") : "No Knowledge found");
    } else if (command === "knowledge-detail" || command === "kdetail") {
      if (!app.knowledge) throw new Error("knowledge store not configured");
      result = app.knowledge.get(argument); if (!result) throw new Error("Knowledge item not found"); write(JSON.stringify(result, null, 2));
    } else if (command === "preview") {
      if (!app.knowledge) throw new Error("knowledge store not configured");
      result = app.previewKnowledge(argument || state.currentTask?.objective || ""); write(JSON.stringify({ level: result.level, manifest: result.manifest, exclusions: result.exclusions, text: result.text }, null, 2));
    } else if (command === "promote" || command === "reject-knowledge") {
      if (!app.knowledge) throw new Error("knowledge store not configured");
      result = await app.knowledge.reviewCandidate(argument, command === "promote" ? "promoted" : "rejected"); write(`${result.state}=${result.id}`);
    } else if (command === "quit" || command === "exit") {
      if (app.activeRun && ["queued", "running"].includes(app.activeRun.status)) await app.cancelRun(app.activeRun.id);
      await app.close?.();
      return { command, exit: true, state };
    } else {
      localized("commands: setup <provider> <model> [purpose] | doctor | task <title> | tasks | use <task-id> | model | run <prompt> | approvals | approve <id> | reject <id> | status | history | runs | resume <run-id> | cancel <run-id> | knowledge [query] | knowledge-detail <id> | promote <id> | reject-knowledge <id> | preview <prompt> | quit", "명령: setup <provider> <model> [purpose] | doctor | task <제목> | tasks | use <task-id> | model | run <요청> | approvals | approve <id> | reject <id> | status | history | runs | resume <run-id> | cancel <run-id> | knowledge [검색어] | knowledge-detail <id> | promote <id> | reject-knowledge <id> | preview <요청> | quit");
    }
    return { command, result, state };
  } catch (error) {
    localized(`error: ${redact(error)}`, `오류: ${redact(error)}`);
    return { command, error, state };
  }
}