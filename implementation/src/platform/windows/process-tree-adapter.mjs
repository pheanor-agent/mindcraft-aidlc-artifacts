import { spawn } from "node:child_process";
import { platform } from "node:os";

export function createProcessTreeAdapter({ os = platform(), spawnImpl = spawn, killImpl = (child, signal) => child.kill(signal) } = {}) {
  return {
    spawn(command, args = [], options = {}) {
      const child = spawnImpl(command, args, { ...options, windowsHide: options.windowsHide ?? true });
      return { child, nativeJobObject: os === "win32", command, args: [...args] };
    },
    async terminate(handle, { force = false } = {}) {
      if (!handle?.child || handle.child.exitCode !== null) return { terminated: true, method: "already-exited" };
      const signal = force || os === "win32" ? "SIGKILL" : "SIGTERM";
      killImpl(handle.child, signal);
      return { terminated: true, method: os === "win32" ? "job-object-or-process-tree" : "process-group", signal };
    },
  };
}

export function windowsNativeAvailable(os = platform()) { return os === "win32"; }
