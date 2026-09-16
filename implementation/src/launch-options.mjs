import { isAbsolute, resolve } from "node:path";

export function parseLaunchOptions(args = []) {
  const options = { uiMode: "tui", mode: undefined, workspace: undefined, diagnostics: false, help: false, version: false, commandArgs: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("-")) {
      options.commandArgs = args.slice(index);
      for (let cursor = index + 1; cursor < args.length; cursor += 1) {
        if (args[cursor] === "--workspace") {
          const value = args[++cursor];
          if (!value || value.startsWith("--")) throw new Error("--workspace requires a path");
          options.workspace = isAbsolute(value) ? value : resolve(value);
        }
      }
      break;
    }
    if (arg === "--cli") options.uiMode = "cli";
    else if (arg === "--tui") options.uiMode = "tui";
    else if (arg === "--mock") options.mode = "mock";
    else if (arg === "--diagnostics") options.diagnostics = true;
    else if (arg === "--help") options.help = true;
    else if (arg === "--version") options.version = true;
    else if (arg === "--workspace") {
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new Error("--workspace requires a path");
      options.workspace = isAbsolute(value) ? value : resolve(value);
    } else throw new Error(`Unknown launch option: ${arg}`);
  }
  return Object.freeze(options);
}
