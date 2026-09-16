import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)), "node_modules", "electron", "dist", "electron");
const args = [];
if (process.getuid?.() === 0) args.push("--no-sandbox");
args.push(join(fileURLToPath(new URL("..", import.meta.url)), "desktop", "main.mjs"), "--mock", ...process.argv.slice(2));
const child = spawn(root, args, { stdio: "inherit", env: process.env });
child.on("error", (error) => { console.error(`Desktop 실행 실패: ${error.message}`); process.exitCode = 1; });
child.on("exit", (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
