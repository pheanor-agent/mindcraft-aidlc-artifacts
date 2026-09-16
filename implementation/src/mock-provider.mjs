// Deterministic, offline provider used only when the user explicitly selects
// MINDCRAFT_MODE=mock. It still goes through the real MindCraft tool boundary.
export function createMockRuntime() {
  return {
    registerNativeProvider() {},
    getModel(provider, model) {
      return provider === "mock" ? { id: model, provider, model } : null;
    },
  };
}

export function createMockSessionFactory() {
  return async ({ cwd = process.cwd(), customTools = [] } = {}) => {
    const tools = new Map(customTools.map((tool) => [tool.name, tool]));
    let text = "";
    return { session: {
      async prompt() {
        const inspect = tools.get("mindcraft_inspect");
        const write = tools.get("mindcraft_write");
        const command = tools.get("mindcraft_command");
        if (inspect) for (const path of ["README.md", "docs/release-notes.md", "src/release-check.mjs"]) await inspect.execute(`mock-read-${path}`, { path: `${cwd}/${path}` });
        const writeResult = write ? await write.execute("mock-write-1", { path: `${cwd}/release-report.md`, content: "# Release report\n\n- Checklist reviewed.\n- Tests require explicit verification.\n- Risky write was approval-gated.\n" }) : null;
        const commandResult = command ? await command.execute("mock-command-1", { command: "node", args: ["--test", "test/release-check.test.mjs"], cwd }) : null;
        text = `Mock release review completed. Write: ${writeResult?.content?.[0]?.text ?? "not requested"}. Command: ${commandResult?.content?.[0]?.text ?? "not requested"}. Tests are not claimed unless the command was approved and returned success.`;
      },
      async waitForIdle() {},
      getLastAssistantText() { return text; },
      subscribe() { return () => {}; },
      async dispose() {},
    }};
  };
}