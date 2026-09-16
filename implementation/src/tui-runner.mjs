import { Container, Input, Text, TuiMainScreen, ProcessTerminal, matchesKey } from "@earendil-works/pi-tui";
import { CommandQueue, executeApplicationCommand, parseCommand } from "./command-queue.mjs";
import { ko, statusKo } from "./ui-messages.mjs";

export class MindCraftInteractiveTui {
  constructor({ app, terminal = new ProcessTerminal(), onExit = () => {} } = {}) {
    this.app = app;
    this.onExit = onExit;
    this.tui = new TuiMainScreen(terminal);
    this.root = new Container();
    this.transcriptLines = [];
    this.transcript = new Text("");
    this.refreshTranscript();
    this.input = new Input();
    this.state = { currentTask: null };
    this.commandQueue = new CommandQueue();
    this.stopped = false;
    this.header = new Text("MindCraft | Task: - | Episode: - | Run: idle");
    this.root.addChild(this.header);
    this.root.addChild(this.transcript);
    this.root.addChild(this.input);
    this.tui.addChild(this.root);
    this.input.onSubmit = (value) => { void this.submit(value); };
    this.input.onEscape = () => this.stop();
    this.tui.addInputListener((data) => {
      if (matchesKey(data, "ctrl+c")) {
        const active = [...this.app.liveSessions.keys()][0];
        if (active) void this.app.cancelRun(active).then((run) => this.append(`${ko.cancelled} 상태=${statusKo(run.status)}`)).catch((error) => this.append(`${ko.error}: ${error.message}`));
        else this.stop();
        return { consume: true };
      }
      return undefined;
    });
  }

  append(line) {
    this.transcriptLines.push(String(line));
    this.refreshTranscript();
    this.tui.requestRender();
  }

  refreshTranscript() {
    const preflight = this.app?.preflight;
    const modelLine = preflight ? `\n환경 점검: 작업공간=정상 | Model=${preflight.checks.modelRegistry.count} | 저장소=${preflight.checks.storage.status === "pass" ? "정상" : preflight.checks.storage.status}` : "";
    const onboarding = preflight?.checks?.modelRegistry?.count ? "" : `\n${ko.firstRun}\n${ko.firstRunHint}`;
    this.transcript.setText([`${ko.title} (mode=${this.app?.mode ?? "default"})${modelLine}${onboarding}\n${ko.commands}`, ...this.transcriptLines].join("\n"));
    this.transcript.invalidate();
  }

  async submit(raw) {
    const value = String(raw ?? "").trim();
    this.input.setValue("");
    if (!value) return;
    // Approval decisions must remain responsive while a run is blocked inside a tool.
    const parsed = parseCommand(value);
    if (["approvals", "approve", "reject", "cancel", "status", "history", "runs", "doctor", "help", "quit", "exit"].includes(parsed.command)) {
      const result = await executeApplicationCommand({ app: this.app, state: this.state, raw: value, locale: "ko", write: (line) => this.append(line) });
      if (result?.result?.run?.status) this.state.run = result.result.run.status;
      this.refreshHeader();
      if (result.exit) this.stop();
      return result;
    }
    return this.commandQueue.enqueue(async () => {
      const result = await executeApplicationCommand({ app: this.app, state: this.state, raw: value, locale: "ko", write: (line) => this.append(line), onEvent: (event, run) => {
        this.state.run = run.status; this.state.episode = run.episodeId; this.state.lastEvent = event.type;
        if (event.type === "tool_decision") {
          this.state.pendingApproval = event.status === "pending" ? event : (this.state.pendingApproval ? { ...this.state.pendingApproval, status: event.status } : null);
          if (event.status === "pending") this.append(`${ko.approvalPending} ${event.request?.kind} ${event.request?.path ?? event.request?.command ?? ""} — ${ko.approvalAction} (${event.id})`);
        }
        this.refreshHeader();
        this.append(`이벤트: ${event.type}`);
      } });
 if (result?.result?.run?.status) this.state.run = result.result.run.status;
 this.refreshHeader();
      if (result.exit) this.stop();
      this.tui.requestRender();
      return result;
    });
  }

  start() { this.tui.setFocus(this.input); this.tui.start(); }
  get currentTask() { return this.state.currentTask; }
  refreshHeader() {
    const task = this.state.currentTask;
    const text = `MindCraft | 작업: ${task?.id ?? "-"} | 단계: ${this.state.episode ?? "-"} | 실행: ${statusKo(this.state.run ?? "queued")}`;
    this.header.setText(text); this.header.invalidate();
  }
  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.tui.stop();
    const closing = this.app?.close?.() ?? Promise.resolve();
    Promise.resolve(closing).catch((error) => this.append(`${ko.error}: ${error.message}`)).finally(() => this.onExit());
  }
}

export async function runMindCraftTui(options = {}) {
  const ui = new MindCraftInteractiveTui(options);
  ui.start();
  return ui;
}
