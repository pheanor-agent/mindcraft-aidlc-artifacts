import { spawn } from "node:child_process";
import { credentialTarget } from "./windows-credential-adapter.mjs";

function invoke(executable, operation, target, input, spawnImpl) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(executable, [operation, target], { shell: false, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    const stdout = [], stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(Buffer.concat(stdout)) : reject(Object.assign(new Error(`Credential helper failed (${code})`), { code: "CREDENTIAL_HELPER_FAILED", nativeMessage: Buffer.concat(stderr).toString("utf8").trim() })));
    if (input != null) child.stdin.end(Buffer.from(String(input), "utf8")); else child.stdin.end();
  });
}

function helperTarget(value) {
  const text = String(value ?? "");
  if (text.startsWith("MindCraft/profile/")) return credentialTarget(text.slice("MindCraft/profile/".length));
  return credentialTarget(text);
}

export function createWincredHelperClient({ executable, spawnImpl = spawn } = {}) {
  if (!executable) throw new Error("Credential helper executable is required");
  return Object.freeze({
    async get(profileId) { const value = await invoke(executable, "get", helperTarget(profileId), null, spawnImpl); return value.toString("utf8"); },
    async put(profileId, value) { if (!value) throw new Error("Credential value is required"); const target = helperTarget(profileId); await invoke(executable, "put", target, value, spawnImpl); return `wincred:${target}`; },
    async remove(profileId) { await invoke(executable, "delete", helperTarget(profileId), null, spawnImpl); return true; },
  });
}
