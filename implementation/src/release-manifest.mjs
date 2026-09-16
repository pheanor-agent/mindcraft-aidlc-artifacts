import { createHash } from "node:crypto";
import { readFile, stat, realpath } from "node:fs/promises";
import { relative, resolve, isAbsolute } from "node:path";

export async function sha256File(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function isContained(root, target) {
  const child = relative(root, target);
  return child === "" || (!isAbsolute(child) && child !== ".." && !child.startsWith("../") && !child.startsWith("..\\"));
}

async function containedFile(root, input) {
  const base = await realpath(root);
  const lexical = resolve(base, input);
  const lexicalRelative = relative(base, lexical).replaceAll("\\", "/");
  if (!lexicalRelative || lexicalRelative === ".." || lexicalRelative.startsWith("../") || lexicalRelative.startsWith("..\\")) {
    const error = new Error(`Invalid release entry path: ${input}`);
    error.code = "RELEASE_PATH_OUTSIDE_ROOT";
    throw error;
  }
  const actual = await realpath(lexical);
  if (!isContained(base, actual)) {
    const error = new Error(`Release entry resolves outside root: ${input}`);
    error.code = "RELEASE_PATH_OUTSIDE_ROOT";
    throw error;
  }
  const info = await stat(actual);
  if (!info.isFile()) throw new Error(`Release entry is not a file: ${input}`);
  return { actual, info, relativePath: lexicalRelative };
}

export async function createReleaseManifest({ root, app = "MindCraft", version, platform = process.platform, architecture = process.arch, nodeVersion = process.versions.node, files = [], sourceRevision = "unknown", signing = "not_signed", sbom = null } = {}) {
  if (!version) throw new Error("Release version is required");
  if (!Array.isArray(files) || files.length === 0) throw new Error("Release manifest requires at least one file");
  const base = resolve(root ?? process.cwd());
  const entries = [];
  const seen = new Set();
  for (const input of files) {
    const { actual, info, relativePath } = await containedFile(base, input);
    if (seen.has(relativePath)) throw new Error(`Invalid or duplicate release entry: ${input}`);
    seen.add(relativePath);
    entries.push({ path: relativePath, bytes: info.size, sha256: await sha256File(actual) });
  }
  return { schemaVersion: 1, app, version, target: { platform, architecture }, bundledNode: nodeVersion, sourceRevision, signing, sbom, files: entries };
}

export async function verifyReleaseManifest(manifest, { root } = {}) {
  const base = resolve(root ?? process.cwd());
  if (!Array.isArray(manifest?.files) || manifest.files.length === 0) return { ok: false, results: [], reason: "empty_manifest" };
  const results = [];
  const seen = new Set();
  for (const entry of manifest?.files ?? []) {
    try {
      const { actual, info, relativePath } = await containedFile(base, entry.path);
      if (seen.has(relativePath)) { results.push({ path: entry.path, ok: false, error: "invalid_manifest_path" }); continue; }
      seen.add(relativePath);
      const hash = await sha256File(actual);
      results.push({ path: entry.path, ok: info.isFile() && info.size === entry.bytes && hash === entry.sha256, actualSha256: hash });
    } catch (error) { results.push({ path: entry.path, ok: false, error: error.code ?? error.message }); }
  }
  return { ok: results.length === (manifest?.files?.length ?? 0) && results.every((item) => item.ok), results };
}
