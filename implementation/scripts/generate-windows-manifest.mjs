import { readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { createReleaseManifest } from "../src/release-manifest.mjs";

const root = resolve(process.argv[2]);
const version = process.argv[3];
const sourceRevision = process.argv[4] ?? "unknown";
const files = [];
async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await walk(child);
    else if (entry.isFile() && entry.name !== "release-manifest.json") files.push(relative(root, child));
  }
}
await walk(root);
const options = { root, version, platform: "win32", architecture: "x64", nodeVersion: "22.19.0", sourceRevision, signing: "not_signed", sbom: "app/sbom.json" };
const manifest = await createReleaseManifest({ ...options, files: [] });
files.sort();
// Bound simultaneous file reads while avoiding serial filesystem latency on Windows.
for (let offset = 0; offset < files.length; offset += 32) {
  const batches = await Promise.all(files.slice(offset, offset + 32).map(file => createReleaseManifest({ ...options, files: [file] })));
  manifest.files.push(...batches.flatMap(batch => batch.files));
}
await writeFile(join(root, "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`manifest=${manifest.files.length} files`);
