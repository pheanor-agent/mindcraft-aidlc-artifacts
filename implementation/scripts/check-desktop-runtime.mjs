import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const electron = join(process.cwd(), "node_modules", "electron", "dist", "electron");
if (!existsSync(electron)) {
  console.error("Desktop runtime missing: run npm install first.");
  process.exit(1);
}
try {
  const version = execFileSync(electron, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  console.log(`Desktop runtime ready: ${version} (${process.arch}/${process.platform})`);
} catch (error) {
  const detail = String(error.stderr ?? error.message).trim();
  console.error(`Desktop runtime cannot start on ${process.arch}/${process.platform}.`);
  console.error(detail);
  console.error("Linux requires Electron GUI libraries such as libglib2.0-0, libgtk-3-0, libnss3, and libasound2.");
  process.exit(1);
}