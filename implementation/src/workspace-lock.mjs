import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

const localLocks = new Map();

function lockPathFor(journalPath) { return `${journalPath}.lock`; }

export class WorkspaceLock {
  constructor(journalPath) {
    this.journalPath = journalPath;
    this.path = lockPathFor(journalPath);
    this.owner = `${process.pid}:${randomUUID()}`;
    this.acquired = false;
  }

  async acquire() {
    const existing = localLocks.get(this.path);
    if (existing) {
      existing.count += 1;
      this.acquired = true;
      this.owner = existing.owner;
      return this;
    }
    await mkdir(dirname(this.path), { recursive: true });
    try {
      await mkdir(this.path);
      await writeFile(`${this.path}/owner.json`, `${JSON.stringify({ pid: process.pid, owner: this.owner, journalPath: this.journalPath, acquiredAt: new Date().toISOString() })}\n`, { mode: 0o600 });
      localLocks.set(this.path, { owner: this.owner, count: 1 });
      this.acquired = true;
      return this;
    } catch (error) {
      if (error.code === "EEXIST") {
        const ownerText = await readFile(`${this.path}/owner.json`, "utf8").catch(() => "");
        let owner = null;
        try { owner = JSON.parse(ownerText); } catch { /* lock owner may be partially written */ }
        if (owner?.pid && owner.pid !== process.pid) {
          try { process.kill(owner.pid, 0); } catch (probeError) {
            if (probeError.code === "ESRCH") {
              await rm(this.path, { recursive: true, force: true });
              return this.acquire();
            }
          }
        }
        const conflict = new Error(`Workspace is already in use: ${this.journalPath}`);
        conflict.code = "WORKSPACE_LOCKED";
        conflict.owner = ownerText.trim() || "unknown owner";
        throw conflict;
      }
      throw error;
    }
  }

  async release() {
    if (!this.acquired) return;
    const existing = localLocks.get(this.path);
    if (existing && existing.owner === this.owner && existing.count > 1) {
      existing.count -= 1;
      this.acquired = false;
      return;
    }
    if (existing) localLocks.delete(this.path);
    await rm(this.path, { recursive: true, force: true });
    this.acquired = false;
  }
}

export function workspaceLockPath(journalPath) { return lockPathFor(journalPath); }
