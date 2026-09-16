import { Container, Text, TuiMainScreen, ProcessTerminal } from "@earendil-works/pi-tui";

export class MindCraftStatusComponent {
  constructor(state = {}) { this.state = state; }
  render(width) {
    void width;
    const s = this.state;
    const line = `MindCraft | Task: ${s.task ?? "-"} | Episode: ${s.episode ?? "-"} | Run: ${s.run ?? "idle"}`;
    const details = [];
    if (s.lastEvent) details.push(`event=${s.lastEvent}`);
    if (s.pendingApproval) details.push(`approval=${s.pendingApproval.status}`);
    return details.length ? [line, details.join(" | ")] : [line];
  }
  invalidate() {}
}

export class MindCraftTuiAdapter {
  constructor({ terminal = new ProcessTerminal(), state = {} } = {}) {
    this.state = state;
    this.tui = new TuiMainScreen(terminal);
    this.root = new Container();
    this.status = new MindCraftStatusComponent(state);
    this.root.addChild(new Text("MindCraft (Pi TUI)"));
    this.root.addChild(this.status);
    this.tui.addChild(this.root);
  }
  setState(next) { Object.assign(this.state, next); this.status.invalidate(); this.tui.requestRender(); }
  handleEvent(event) {
    if (!event) return;
    this.state.lastEvent = event.type ?? "event";
    if (event.type === "tool_call" || event.type === "tool_result" || event.type === "message_update") this.state.event = event;
    this.status.invalidate(); this.tui.requestRender();
  }
  showApproval(request) {
    this.state.pendingApproval = request ? { ...request, status: "pending" } : null;
    this.status.invalidate(); this.tui.requestRender();
  }
  resolveApproval(decision) {
    if (this.state.pendingApproval) this.state.pendingApproval = { ...this.state.pendingApproval, status: decision };
    this.status.invalidate(); this.tui.requestRender();
    return this.state.pendingApproval;
  }
  start() { this.tui.start(); }
  stop() { this.tui.stop(); }
  renderStatus(width = 80) { return this.status.render(width); }
}
