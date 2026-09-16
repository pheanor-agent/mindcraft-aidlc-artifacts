import { access, constants, lstat, realpath } from "node:fs/promises";
import { isAbsolute, normalize, relative, resolve, sep } from "node:path";

function inside(root, candidate) { const rel = relative(root, candidate); return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel)); }

export async function canonicalWorkspace(path) {
  const absolute = resolve(String(path));
  const info = await lstat(absolute);
  if (!info.isDirectory()) throw Object.assign(new Error("Workspace is not a directory"), { code: "WORKSPACE_NOT_DIRECTORY" });
  return realpath(absolute);
}

export async function validateWorkspace(path, { allowCreate = false } = {}) {
  const absolute = resolve(String(path));
  try {
    const canonical = await canonicalWorkspace(absolute);
    await access(canonical, constants.R_OK | constants.W_OK);
    return { path: canonical, writable: true, exists: true };
  } catch (error) {
    if (error.code !== "ENOENT" || !allowCreate) throw Object.assign(new Error(`Workspace is unavailable: ${normalize(absolute)}`), { code: "WORKSPACE_UNAVAILABLE", cause: error });
    return { path: absolute, writable: false, exists: false, createAllowed: true };
  }
}

export function isContained(root, candidate) { return inside(resolve(root), resolve(candidate)); }

export function workspaceDataPaths(root) {
  const workspace = resolve(root);
  return { root: workspace, controlRoot: resolve(workspace, ".mindcraft"), config: resolve(workspace, ".mindcraft", "config.json"), state: resolve(workspace, ".mindcraft", "state.jsonl"), knowledge: resolve(workspace, ".mindcraft", "knowledge.jsonl") };
}
