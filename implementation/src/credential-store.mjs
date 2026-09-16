import { randomUUID } from "node:crypto";

function redact(value) { return value ? "[REDACTED]" : null; }

export class CredentialStore {
  constructor({ env = process.env, wincred = null } = {}) { this.env = env; this.wincred = wincred; this.session = new Map(); }

  async resolve(reference) {
    if (!reference) return null;
    const [kind, ...parts] = String(reference).split(":");
    if (kind === "env") return this.env[parts.join(":")] || null;
    if (kind === "session") return this.session.get(parts.join(":")) ?? null;
    if (kind === "wincred") {
      if (!this.wincred?.get) throw Object.assign(new Error("Windows Credential Manager is unavailable"), { code: "CREDENTIAL_STORE_UNAVAILABLE" });
      return this.wincred.get(parts.join(":"));
    }
    throw Object.assign(new Error("Unsupported credential reference"), { code: "CREDENTIAL_REFERENCE_INVALID" });
  }

  async putSession(value, label = "credential") {
    if (!value) throw new Error("Credential value is required");
    const id = `${label}-${randomUUID()}`;
    this.session.set(id, value);
    return `session:${id}`;
  }

  async remove(reference) {
    if (!reference) return false;
    const [kind, ...parts] = String(reference).split(":");
    if (kind === "session") return this.session.delete(parts.join(":"));
    if (kind === "wincred" && this.wincred?.remove) return this.wincred.remove(parts.join(":"));
    if (kind === "env") return false;
    throw Object.assign(new Error("Unsupported credential reference"), { code: "CREDENTIAL_REFERENCE_INVALID" });
  }

  describe(reference) { return { reference: reference ? String(reference).replace(/([^:]+):.*/, "$1:[REDACTED]") : null, configured: Boolean(reference) }; }
  redact(value) { return redact(value); }
}

export function credentialReferenceKind(reference) { return reference ? String(reference).split(":", 1)[0] : null; }
