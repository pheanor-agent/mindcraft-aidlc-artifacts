import * as nativePath from "node:path";

function isDriveRelative(value, pathApi) {
  return pathApi === nativePath.win32 && /^[A-Za-z]:[^\\/]/.test(value);
}

export function checkWorkspacePath({ root, candidate, pathApi = nativePath, allowRoot = false } = {}) {
  if (root == null || String(root).trim() === "") return { allowed: false, reason: "scope_root_required", absolutePath: null, relativePath: null };
  const raw = String(candidate ?? "");
  if (!raw || raw.includes("\0")) return { allowed: false, reason: "invalid_path", absolutePath: null, relativePath: null };
  if (isDriveRelative(raw, pathApi)) return { allowed: false, reason: "invalid_path", absolutePath: null, relativePath: null };

  const rootPath = pathApi.resolve(String(root));
  const absolutePath = pathApi.resolve(rootPath, raw);
  const relativePath = pathApi.relative(rootPath, absolutePath);
  const outside = relativePath === ".."
    || relativePath.startsWith(`..${pathApi.sep}`)
    || pathApi.isAbsolute(relativePath);
  if (outside) {
    const reason = pathApi.isAbsolute(relativePath) ? "cross_volume" : "outside_execution_root";
    return { allowed: false, reason, absolutePath, relativePath };
  }
  if (!allowRoot && relativePath === "") return { allowed: false, reason: "invalid_path", absolutePath, relativePath };
  return { allowed: true, reason: "within_execution_root", absolutePath, relativePath };
}

export function isWithinExecutionRoot(root, candidate, pathApi = nativePath) {
  return checkWorkspacePath({ root, candidate, pathApi, allowRoot: true }).allowed;
}
