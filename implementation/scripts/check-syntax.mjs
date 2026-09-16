import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(path));
    else if (entry.isFile() && path.endsWith(".mjs")) files.push(path);
  }
  return files;
}

const files = (await collect("src")).sort();
if (!files.length) throw new Error("No source files discovered");
const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) failures.push({ file, output: `${result.stdout}${result.stderr}` });
}
if (failures.length) {
  for (const failure of failures) process.stderr.write(`${failure.file}\n${failure.output}`);
  process.exit(1);
}
console.log(`syntax: ${files.length} source files checked`);
