import { createAgentSession, ModelRuntime } from "@earendil-works/pi-coding-agent";
import { randomUUID } from "node:crypto";
import { createAirouterProvider } from "./airouter-provider.mjs";
import { createTask, createEpisode, InMemoryStore, RunStatus } from "./domain.mjs";
import { WorkflowRepository } from "./workflow-repository.mjs";
import { KnowledgeService } from "./knowledge.mjs";
import { createMindCraftTools } from "./pi-tools.mjs";
import { ApprovalManager, createExecutionScope } from "./safety-recovery.mjs";
import { analyzePrompt } from "./token-doctor.mjs";
import { selectModel } from "./model-routing.mjs";
import { runPreflight, preflightError } from "./preflight.mjs";
import { createMockRuntime, createMockSessionFactory } from "./mock-provider.mjs";
import { saveModelRegistry } from "./config-store.mjs";
import { withTimeout } from "./command-queue.mjs";
import { createProviderForModel, describeSelection, resolveModelSelection, selectionForModel } from "./model-config.mjs";
import { WorkspaceLock } from "./workspace-lock.mjs";
import { ShutdownCoordinator } from "./shutdown-coordinator.mjs";

export class MindCraftApp {
  constructor({ cwd = process.cwd(), agentDir = ".mindcraft-agent", statePath = null, knowledgePath = null, configPath = null, runtimeFactory = null, sessionFactory = null, mode = "default", models = null, approvalManager = null, commands = [], sessionTimeoutMs = 120000, executionPromptMaxChars = 8000, modelSelection = null, env = process.env } = {}) {
    this.cwd = cwd;
    this.env = env;
    this.agentDir = agentDir;
    this.store = new InMemoryStore();
    this.runtime = null;
    this.repository = statePath ? new WorkflowRepository(statePath) : null;
    this.workspaceLock = this.repository ? new WorkspaceLock(this.repository.path) : null;
    this.sessionId = randomUUID();
    this.sessionStartedAt = new Date().toISOString();
    this.sessionClosedAt = null;
    this.sessionClosed = false;
    this.knowledge = knowledgePath ? new KnowledgeService(knowledgePath) : null;
    this.configPath = configPath;
    this.mode = mode;
    this.modeLocked = false;
    this.executionScope = createExecutionScope({ root: cwd, commands });
    this.approvalManager = approvalManager ?? new ApprovalManager({ onDecision: (event) => this.recordToolDecision(event), onExecutionStart: (event) => this.recordExecutionStart(event), onExecutionResult: (event) => this.recordExecutionResult(event) });
    this.activeRun = null;
    this.activeOnEvent = null;
    this.runControllers = new Map();
    this.runCompletions = new Map();
    this.sessionTimeoutMs = sessionTimeoutMs;
    this.executionPromptMaxChars = executionPromptMaxChars;
    const explicitModels = Array.isArray(models);
    this.modelRegistry = { schemaVersion: 1, models: models ?? [] };
    this.modelSelection = modelSelection ?? (models?.length === 1 ? selectionForModel(models[0], env) : resolveModelSelection(env));
    // An omitted registry keeps the legacy environment-derived default for
    // compatibility. An explicit models: [] is an intentional unconfigured
    // state and must remain empty so onboarding can handle it.
    if (!explicitModels && !this.modelRegistry.models.length) this.modelRegistry = { schemaVersion: 1, models: [{ id: this.modelSelection.modelId, provider: this.modelSelection.provider, model: this.modelSelection.modelId, enabled: true }] };
    this.liveSessions = new Map();
    this.runtimeInjected = Boolean(runtimeFactory || sessionFactory);
    this.runtimeFactory = runtimeFactory ?? (mode === "mock" ? async () => createMockRuntime() : ((options) => ModelRuntime.create(options)));
    this.sessionFactory = sessionFactory ?? (mode === "mock" ? createMockSessionFactory() : createAgentSession);
    this.preflight = null;
    this.shutdownCoordinator = new ShutdownCoordinator({
      cancelRuns: async () => {
        const run = this.activeRun;
        if (run && [RunStatus.RUNNING, RunStatus.QUEUED].includes(run.status)) await this.cancelRun(run.id);
      },
      invalidateApprovals: async () => {
        for (const run of [...this.store.runs.values()]) this.approvalManager.cancelRun(run.id);
        await this.approvalManager.flush();
      },
      disposeSessions: async () => {
        for (const session of this.liveSessions.values()) {
          const result = session.abort?.();
          if (result?.catch) await result.catch(() => {});
        }
        this.liveSessions.clear();
      },
      flushJournal: async () => {
        this.sessionClosedAt = new Date().toISOString();
        if (this.repository) await this.repository.commit({ kind: "session", id: this.sessionId, sessionId: this.sessionId, status: "closed", startedAt: this.sessionStartedAt, closedAt: this.sessionClosedAt, cwd: this.cwd, mode: this.mode });
      },
      releaseWorkspace: async () => this.workspaceLock?.release(),
    });
  }

  recordToolDecision(event) {
    const run = this.activeRun;
    if (!run) return event;
    const visible = { ...event, timestamp: new Date().toISOString() };
    run.events.push(visible);
    this.activeOnEvent?.(visible, run);
    return this.repository ? this.repository.commit({ kind: "tool_decision", id: `${run.id}:${visible.id ?? randomUUID()}`, runId: run.id, ...visible }).then(() => visible) : visible;
  }

  recordExecutionStart(event) {
    const run = this.activeRun;
    if (!run) return event;
    const visible = { ...event, timestamp: new Date().toISOString() };
    run.events.push(visible);
    this.activeOnEvent?.(visible, run);
    return this.repository ? this.repository.commit({ kind: "event", id: `${run.id}:execution:${randomUUID()}`, runId: run.id, ...visible }).then(() => visible) : visible;
  }

  recordExecutionResult(event) {
    const run = this.activeRun;
    if (!run) return event;
    const commandResult = event.result?.result;
    if (event.request?.kind === "command.execute" && (event.result?.ok !== true || commandResult?.code !== 0 || commandResult?.error || commandResult?.timedOut || commandResult?.outputLimited)) {
      (run.toolFailures ??= []).push({ requestId: event.requestId, code: commandResult?.code ?? null, reason: event.result?.error ?? commandResult?.error ?? (commandResult?.timedOut ? "command timed out" : commandResult?.outputLimited ? "command output limit exceeded" : "command exited unsuccessfully") });
    }
    const visible = { ...event, timestamp: new Date().toISOString() };
    run.events.push(visible);
    this.activeOnEvent?.(visible, run);
    return this.repository ? this.repository.commit({ kind: "event", id: `${run.id}:result:${event.requestId ?? randomUUID()}`, runId: run.id, ...visible }).then(() => visible) : visible;
  }

  listPendingApprovals() { return this.approvalManager.list(); }
  async approve(id) {
    const result = this.approvalManager.resolve(id, true);
    await this.approvalManager.flush();
    return result;
  }
  async reject(id) {
    const result = this.approvalManager.resolve(id, false);
    await this.approvalManager.flush();
    return result;
  }

  async init() {
    if (this.workspaceLock) await this.workspaceLock.acquire();
    try {
      if (this.repository) await this.repository.load();
      if (this.repository && !this.repository.recovery.valid) {
        const error = new Error(`Workflow journal is corrupted at line ${this.repository.recovery.corruption.line}; run mindcraft repair before writing`);
        error.code = "JOURNAL_CORRUPTED";
        error.recovery = this.repository.recovery;
        throw error;
      }
      this.preflight = await runPreflight({ cwd: this.cwd, registry: this.modelRegistry, selectedModelId: this.modelSelection.registryId ?? this.modelSelection.modelId, selectedProvider: this.modelSelection.provider, statePath: this.repository ? this.repository.path : ".mindcraft/state.jsonl", knowledgePath: this.knowledge ? this.knowledge.path : ".mindcraft/knowledge.jsonl" });
      // A failed preflight must not construct a Pi runtime/session or touch a provider.
      // The runtime is created later, after routing has selected exactly one model
      // for the Run. This avoids provider-id collisions between configured models.
      // Injected runtimes remain available after init for test and embedding
      // compatibility; production runtimes are always created per Run.
      if (this.preflight.localReady && this.runtimeInjected) this.runtime = await this.runtimeFactory({ cwd: this.cwd, refreshOnCreate: false });
      if (this.repository) {
        for (const record of this.repository.records) {
          if (record.kind === "task" && record.task) this.store.tasks.set(record.id, record.task);
          if (record.kind === "episode" && record.episode) { this.store.episodes.set(record.id, record.episode); const task = this.store.tasks.get(record.episode.taskId); if (task && !task.episodeIds.includes(record.id)) task.episodeIds.push(record.id); }
          if (record.kind === "run") this.store.runs.set(record.id, record);
        }
        for (const run of this.repository.recoverableRuns()) { const current = this.store.runs.get(run.id); if (current) { current.status = "recoverable"; current.recovery = run.recovery; } }
        for (const run of this.repository.latestRuns()) { const current = this.store.runs.get(run.id); if (current && this.repository.hasUnknownEffect(run.id)) current.status = "unknown"; }
        await this.repository.commit({ kind: "session", id: this.sessionId, sessionId: this.sessionId, status: "started", startedAt: this.sessionStartedAt, cwd: this.cwd, mode: this.mode });
      }
      if (this.knowledge) await this.knowledge.load();
      return this;
    } catch (error) {
      await this.workspaceLock?.release();
      throw error;
    }
  }

  async createTask(input) {
    const task = createTask(this.store, input);
    try {
      if (this.repository) await this.repository.commit({ kind: "task", id: task.id, task });
      return task;
    } catch (error) {
      this.store.tasks.delete(task.id);
      throw error;
    }
  }

  async createRuntimeForModel(modelConfig) {
    if (this.runtimeInjected && this.runtime) {
      this.runtime.registerNativeProvider(createAirouterProvider());
      const provider = createProviderForModel(modelConfig, this.env);
      if (provider) this.runtime.registerNativeProvider(provider);
      return this.runtime;
    }
    const runtime = await this.runtimeFactory({ cwd: this.cwd, refreshOnCreate: false });
    runtime.registerNativeProvider(createAirouterProvider());
    const provider = createProviderForModel(modelConfig, this.env);
    if (provider) runtime.registerNativeProvider(provider);
    this.runtime = runtime;
    return runtime;
  }

  async runNextEpisode(taskId, prompt, { onEvent = () => {}, resumedFrom = null } = {}) {
    if (!this.preflight) await this.init();
    if (!this.preflight.localReady) throw preflightError(this.preflight);
    if (this.mode !== "mock" && !this.runtimeInjected && !this.preflight.liveReady) {
      const error = preflightError(this.preflight);
      error.code = "PROVIDER_NOT_READY";
      throw error;
    }
    const task = this.store.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if ([...this.store.runs.values()].some((candidate) => candidate.taskId === taskId && [RunStatus.QUEUED, RunStatus.RUNNING].includes(candidate.status))) {
      throw new Error(`Task already has a run in progress: ${taskId}`);
    }
    const episode = createEpisode(this.store, task, prompt ?? task.objective);
    this.modeLocked = true;
    const run = { id: randomUUID(), taskId, episodeId: episode.id, sessionId: this.sessionId, mode: this.mode, status: RunStatus.RUNNING, events: [], startedAt: new Date().toISOString(), ...(resumedFrom ? { resumedFrom } : {}) };
    let resolveCompletion;
    this.runCompletions.set(run.id, new Promise((resolve) => { resolveCompletion = resolve; }));
    const controller = new AbortController();
    this.runControllers.set(run.id, controller);
    this.activeRun = run;
    this.activeOnEvent = onEvent;
    episode.runId = run.id; episode.status = "running"; this.store.runs.set(run.id, run);
    if (this.repository) await this.repository.commit({ kind: "task", id: task.id, task });
    if (this.repository) await this.repository.commit({ kind: "episode", id: episode.id, episode });
    if (this.repository) await this.repository.commit({ kind: "run", id: run.id, ...run });
    let session = null;
    let unsubscribe = null;
    try {
      const knowledgeBudgetChars = 2000;
      const selectedStats = this.previewKnowledge(episode.prompt, { maxChars: knowledgeBudgetChars });
      const baselineStats = this.previewKnowledge("", { maxChars: Number.MAX_SAFE_INTEGER });
      const makeExecutionPrompt = (knowledgeText) => knowledgeText ? `Relevant approved knowledge:\n${knowledgeText}\n\nTask:\n${episode.prompt}` : episode.prompt;
      const executionPrompt = makeExecutionPrompt(selectedStats.text);
      const baselineExecutionPrompt = makeExecutionPrompt(baselineStats.text);
      const estimateTokens = (chars) => Math.ceil(chars / 4);
      const baselineKnowledgeChars = Math.max(0, baselineStats.text.length);
      const selectedKnowledgeChars = Math.max(0, selectedStats.text.length);
      const baselineExecutionPromptChars = baselineExecutionPrompt.length;
      const executionPromptChars = executionPrompt.length;
      const savedChars = Math.max(0, baselineExecutionPromptChars - executionPromptChars);
      const savedRatio = baselineExecutionPromptChars > 0 ? Math.min(1, savedChars / baselineExecutionPromptChars) : 0;
      run.knowledgeMetrics = {
        promptChars: episode.prompt.length,
        promotedCandidates: selectedStats.promotedCandidates,
        matchedCandidates: selectedStats.matchedCandidates,
        includedCandidates: selectedStats.includedCandidates,
        knowledgeBudgetChars,
        selectedKnowledgeChars,
        baselineKnowledgeChars,
        executionPromptChars,
        baselineExecutionPromptChars,
        savedChars,
        savedRatio,
        estimatedInputTokens: estimateTokens(executionPromptChars),
        estimatedBaselineTokens: estimateTokens(baselineExecutionPromptChars),
        estimateMethod: "estimated_chars_div_4_ceil",
        baselineType: "all_promoted_knowledge",
        unit: "characters",
        contextLevel: selectedStats.level,
        fallbackReason: selectedStats.fallbackReason ?? null,
        manifest: selectedStats.manifest ?? [],
        exclusions: selectedStats.exclusions ?? [],
      };
      if (executionPrompt.length > this.executionPromptMaxChars) {
        const error = new Error(`Execution prompt exceeds ${this.executionPromptMaxChars} characters`);
        error.code = "CONTEXT_BUDGET_EXCEEDED";
        error.promptChars = executionPrompt.length;
        error.maxPromptChars = this.executionPromptMaxChars;
        throw error;
      }
      if (this.mode === "token-doctor") run.tokenDoctor = { mode: this.mode, ...analyzePrompt(episode.prompt) };
      if (this.repository) await this.repository.commit({ kind: "run", id: run.id, ...run });
      const routing = selectModel({ registry: this.modelRegistry, purpose: episode.purpose ?? task.purpose ?? "general" });
      run.routing = {
        selectedModelId: routing.selectedModelId,
        selectedProfile: routing.selectedProfile,
        selectedPurpose: routing.selectedPurpose,
        routingReason: routing.routingReason,
        fallback: routing.fallback,
        costEstimate: routing.costEstimate,
        availability: routing.availability,
        policyVersion: routing.policyVersion,
      };
      if (routing.errorCode) throw new Error(`${routing.errorCode}: selected Model is unavailable`);
      if (this.repository) await this.repository.commit({ kind: "run", id: run.id, ...run });
      if (this.mode === "mock" && routing.model.provider !== "mock") throw new Error("MOCK_MODE_REQUIRES_MOCK_PROVIDER");
      await this.createRuntimeForModel(routing.model);
      const model = this.getSelectedModel(routing.model);
      ({ session } = await this.sessionFactory({ cwd: this.cwd, agentDir: this.agentDir, modelRuntime: this.runtime, model, noTools: "builtin", tools: [], customTools: createMindCraftTools({ scope: this.executionScope, runId: run.id, signal: controller.signal, approvalManager: this.approvalManager, onDecision: (event) => this.recordToolDecision({ type: "tool_decision", ...event }) }) }));
      if (!session) throw new Error("Agent session was not created");
      this.liveSessions.set(run.id, session);
      unsubscribe = session.subscribe((event) => { const visible = { type: event.type }; run.events.push(visible); onEvent(visible, run); });
      await withTimeout(session.prompt(executionPrompt), this.sessionTimeoutMs, {
        signal: controller.signal,
        label: "session.prompt",
        onTimeout: () => session.abort?.(),
      });
      await withTimeout(session.waitForIdle(), this.sessionTimeoutMs, {
        signal: controller.signal,
        label: "session.waitForIdle",
        onTimeout: () => session.abort?.(),
      });
      if (run.status === RunStatus.ABORTED) {
        const abortError = new Error("Run cancelled"); abortError.name = "AbortError"; throw abortError;
      }
      if (run.toolFailures?.length) throw new Error(`COMMAND_EXECUTION_FAILED: ${run.toolFailures.length} command(s) failed; inspect history for details`);
      run.status = RunStatus.COMPLETED;
      run.completedAt = new Date().toISOString();
      episode.status = "completed";
      if (this.repository) {
        await this.repository.commit({ kind: "run", id: run.id, ...run });
        await this.repository.commit({ kind: "episode", id: episode.id, episode });
      }
      if (this.knowledge) {
        try {
          const captured = await this.knowledge.captureCandidate({ taskId, episodeId: episode.id, runId: run.id, content: session.getLastAssistantText() ?? "", source: "episode", sourceUri: `run:${run.id}` });
          run.knowledgeCapture = { status: "captured", itemId: captured.id, revision: captured.provenance?.revision ?? null };
          if (this.repository) await this.repository.commit({ kind: "run", id: run.id, ...run });
        } catch (knowledgeError) {
          run.knowledgeError = String(knowledgeError?.message ?? knowledgeError).replace(/(Bearer|api[_-]?key|token)[^\s]*/gi, "$1=[REDACTED]");
          run.knowledgeCapture = { status: "failed", retryable: true };
          if (this.repository) await this.repository.commit({ kind: "run", id: run.id, ...run });
        }
      }
      return { task, episode, run, text: session.getLastAssistantText() ?? "" };
    } catch (error) {
      const cancelledByUser = run.status === RunStatus.ABORTED;
      run.status = run.status === RunStatus.ABORTED || error?.name === "AbortError" ? RunStatus.ABORTED : RunStatus.FAILED;
      run.error = String(error?.message ?? error).replace(/(Bearer|api[_-]?key|token)[^\s]*/gi, "$1=[REDACTED]");
      episode.status = cancelledByUser ? "aborted" : "failed";
      if (this.repository) {
        await this.repository.commit({ kind: "run", id: run.id, ...run });
        await this.repository.commit({ kind: "episode", id: episode.id, episode });
      }
      throw error;
    } finally {
      this.runControllers.delete(run.id);
      unsubscribe?.();
      this.liveSessions.delete(run.id);
      this.activeRun = null;
      this.activeOnEvent = null;
      if (session) {
        const cleanupSession = session;
        session = null;
        try { await cleanupSession.dispose(); } catch (cleanupError) {
          run.cleanupError = String(cleanupError?.message ?? cleanupError);
          if (this.repository) await this.repository.commit({ kind: "run", id: run.id, ...run });
        }
      }
      const runtime = this.runtime;
      this.runtime = null;
      try { await runtime?.dispose?.(); } catch (cleanupError) {
        run.cleanupError = String(cleanupError?.message ?? cleanupError);
        if (this.repository) await this.repository.commit({ kind: "run", id: run.id, ...run });
      }
      resolveCompletion?.(run);
      this.runCompletions.delete(run.id);
    }
  }

  async resumeRun(runId, taskId = null, options = {}) {
    const previous = this.store.runs.get(runId);
    if (!previous || previous.status !== "recoverable" || this.repository?.hasUnknownEffect(runId)) throw new Error(`Run is not recoverable: ${runId}`);
    if (taskId && previous.taskId !== taskId) throw new Error(`Run does not belong to Task: ${taskId}`);
    const episode = this.store.episodes.get(previous.episodeId);
    const resumed = await this.runNextEpisode(previous.taskId, episode?.prompt, { ...options, resumedFrom: runId });
    previous.status = "resumed";
    if (this.repository) {
      await this.repository.commit({ kind: "run", id: runId, ...previous });
      await this.repository.commit({ kind: "run", id: resumed.run.id, ...resumed.run });
    }
    return resumed;
  }

  async cancelRun(runId) {
    const run = this.store.runs.get(runId);
    if (!run) throw new Error(`Run not found: ${runId}`);
    const session = this.liveSessions.get(runId);
    if (![RunStatus.RUNNING, RunStatus.QUEUED].includes(run.status)) return run;
    this.runControllers.get(runId)?.abort();
    this.approvalManager.cancelRun(runId);
    if (session) { try { await session.abort(); } catch { /* cancellation remains terminal */ } }
    run.status = RunStatus.ABORTED;
    run.completedAt = new Date().toISOString();
    const completion = this.runCompletions.get(runId);
    if (completion) {
      await Promise.race([completion, new Promise((resolve) => setTimeout(resolve, 10000))]);
    }
    if (this.repository) await this.repository.commit({ kind: "run", id: run.id, ...run });
    return run;
  }

  async checkDoctor() {
    if (!this.preflight) await this.init();
    return this.preflight;
  }

  async configureModel({ id, provider, model, purpose, credential } = {}) {
    const next = { schemaVersion: 1, models: [{ id, provider, model, enabled: true, ...(purpose ? { purpose } : {}), ...(credential ? { credential } : {}) }] };
    if (this.configPath) await saveModelRegistry(this.configPath, next);
    this.modelRegistry = next;
    this.modelSelection = selectionForModel(next.models[0], this.env);
    if (provider === "mock") {
      this.mode = "mock";
      this.executionScope = createExecutionScope({ root: this.cwd, commands: [{ executable: "node", args: ["--test", "test/release-check.test.mjs"], cwd: this.cwd }] });
      this.runtimeFactory = async () => createMockRuntime();
      this.sessionFactory = createMockSessionFactory();
    }
    this.preflight = await runPreflight({ cwd: this.cwd, registry: this.modelRegistry, selectedModelId: this.modelSelection.registryId, selectedProvider: this.modelSelection.provider, statePath: this.repository ? this.repository.path : ".mindcraft/state.jsonl", knowledgePath: this.knowledge ? this.knowledge.path : ".mindcraft/knowledge.jsonl" });
    if (!this.preflight.localReady) throw preflightError(this.preflight);
    await this.createRuntimeForModel(this.modelRegistry.models[0]);
    return this.modelRegistry.models[0];
  }

  getSelectedModel(selected = null) {
    const configured = selected ?? (this.modelRegistry.models.length === 1 ? this.modelRegistry.models[0] : null);
    const provider = configured?.provider ?? this.modelSelection.provider;
    const modelId = configured?.model ?? this.modelSelection.modelId;
    const model = this.runtime?.getModel(provider, modelId);
    if (model) return model;
    const known = typeof this.runtime?.getModels === "function" ? this.runtime.getModels(provider).map((candidate) => candidate.id) : [];
    if (known.length) throw new Error(`Model not found: ${provider}/${modelId} (known models for ${provider}: ${known.join(", ")})`);
    if (provider === "airouter") throw new Error("Airouter model is not registered");
    throw new Error(`Provider not registered or has no models: ${provider}`);
  }

  describeModel() {
    const configured = this.modelRegistry.models.length === 1 ? this.modelRegistry.models[0] : null;
    if (configured && (configured.provider !== this.modelSelection.provider || configured.model !== this.modelSelection.modelId)) return `${configured.provider}/${configured.model}`;
    return describeSelection(this.modelSelection);
  }

  listRuns(taskId = null) { return [...this.store.runs.values()].filter((run) => taskId == null || run.taskId === taskId); }

  getRunStatus(runId) {
    const run = this.store.runs.get(runId);
    if (!run) return null;
    const persisted = this.repository?.status(runId);
    return persisted ? { ...persisted, status: run.status === "running" && persisted.status === "unknown" ? "unknown" : run.status, recovery: this.repository.recovery } : {
      id: run.id, taskId: run.taskId ?? null, episodeId: run.episodeId ?? null, status: run.status,
      model: run.routing?.selectedModelId ?? null, purpose: run.routing?.selectedPurpose ?? null,
      latestEvent: run.events?.at(-1)?.type ?? null, approvals: { pending: 0, approved: 0, rejected: 0 },
      knowledge: { manifest: run.knowledgeMetrics?.manifest ?? [], capture: run.knowledgeCapture ?? null },
      error: run.error ?? run.knowledgeError ?? null, nextAction: "none",
    };
  }

  status(taskId = null) {
    return { task: taskId ? this.store.tasks.get(taskId) ?? null : null, runs: this.listRuns(taskId).map((run) => this.getRunStatus(run.id)), journal: this.repository?.recovery ?? null };
  }

  history(taskId = null) { return this.listRuns(taskId).flatMap((run) => this.repository?.recordsForRun(run.id) ?? [run]); }

  listTasks() { return [...this.store.tasks.values()]; }

  previewKnowledge(prompt, options = {}) {
    if (!this.knowledge) return { text: "", level: "empty", manifest: [], exclusions: [] };
    if (typeof this.knowledge.buildContext === "function") return this.knowledge.buildContext({ query: prompt, maxChars: options.maxChars ?? 2000, fileContents: options.fileContents ?? [], root: this.cwd });
    const maxChars = options.maxChars ?? 2000;
    const text = this.knowledge.assembleSlice(prompt, maxChars);
    return { text, level: text ? "relevant_knowledge" : "empty", promotedCandidates: 0, matchedCandidates: 0, includedCandidates: 0, manifest: [], exclusions: [] };
  }

  selectTask(taskId) {
    const task = this.getTask(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    return task;
  }

  getTask(taskId) { return this.store.tasks.get(taskId); }

  async close() {
    if (this.sessionClosed) return;
    await this.shutdownCoordinator.shutdown("application-close");
    this.sessionClosed = true;
  }

  setMode(mode) {
    if (!["default", "token-doctor", "mock"].includes(mode)) throw new Error(`Unknown mode: ${mode}`);
    if (this.modeLocked && mode !== this.mode) throw new Error("Mode cannot change after the first Run; restart in a separate workspace/process");
    this.mode = mode;
    return this.mode;
  }
}
