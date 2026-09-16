const PHASES = Object.freeze(["input_blocked", "runs_cancelled", "approvals_invalidated", "sessions_disposed", "journal_flushed", "workspace_released", "terminal_restored", "closed"]);

export class ShutdownCoordinator {
  constructor({ cancelRuns = async () => {}, invalidateApprovals = async () => {}, disposeSessions = async () => {}, flushJournal = async () => {}, releaseWorkspace = async () => {}, restoreTerminal = async () => {}, onPhase = () => {} } = {}) {
    this.hooks = { cancelRuns, invalidateApprovals, disposeSessions, flushJournal, releaseWorkspace, restoreTerminal };
    this.onPhase = onPhase;
    this.state = "open";
    this.phase = null;
    this.promise = null;
  }

  async shutdown(reason = "requested") {
    if (this.promise) return this.promise;
    this.promise = this.#run(reason);
    return this.promise;
  }

  async #run(reason) {
    if (this.state === "closed") return { state: this.state, phase: "closed", reason };
    this.state = "closing";
    const complete = async (phase, action) => {
      this.phase = phase;
      this.onPhase({ phase, reason });
      await action();
    };
    try {
      await complete("input_blocked", async () => {});
      await complete("runs_cancelled", this.hooks.cancelRuns);
      await complete("approvals_invalidated", this.hooks.invalidateApprovals);
      await complete("sessions_disposed", this.hooks.disposeSessions);
      await complete("journal_flushed", this.hooks.flushJournal);
      await complete("workspace_released", this.hooks.releaseWorkspace);
      await complete("terminal_restored", this.hooks.restoreTerminal);
      this.phase = "closed";
      this.state = "closed";
      this.onPhase({ phase: "closed", reason });
      return { state: this.state, phase: this.phase, reason };
    } catch (error) {
      this.state = "failed";
      error.shutdownPhase = this.phase;
      throw error;
    }
  }
}

export function shutdownPhases() { return [...PHASES]; }
