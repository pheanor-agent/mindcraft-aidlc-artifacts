import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { checkWorkspacePath } from "./path-policy.mjs";

const REDACTED = "[REDACTED]";
const DEFAULT_MAX_FILE_CHARS = 2000;
const EXCLUDED_DIRS = new Set([".mindcraft", ".git", "node_modules", "vendor", "generated", "dist", "build"]);
const SECRET_PATH = /(^|\/)(?:\.env(?:\..*)?|credentials?\.?[^/]*|secrets?\.?[^/]*)$/i;
const BINARY_EXT = /\.(?:png|jpe?g|gif|webp|bmp|ico|pdf|zip|gz|7z|exe|dll|so|bin|woff2?)$/i;

export function redact(value) {
  return String(value ?? "")
    .replace(/Bearer\s+\S+/gi, `Bearer ${REDACTED}`)
    .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/AKIA[0-9A-Z]{16}/g, REDACTED);
}
function lexicalTokens(value) { return [...String(value).toLocaleLowerCase().matchAll(/[\p{L}\p{N}]+/gu)].map(([token]) => token).filter((token) => token.length >= 2); }
function matchesQuery(content, query, queryTokens) { if (!queryTokens.length) return false; const tokens = new Set(lexicalTokens(content)); return queryTokens.some((token) => tokens.has(token)) || String(content).toLocaleLowerCase().includes(String(query).toLocaleLowerCase()); }
function digest(value) { return createHash("sha256").update(String(value ?? "")).digest("hex"); }
function safeFile(file, root) {
  if (!file || typeof file.content !== "string") return { include: false, reason: "invalid content" };
  const path = String(file.path ?? "file").replaceAll("\\", "/");
  const parts = path.split("/");
  const scope = checkWorkspacePath({ root, candidate: path });
  if (!scope.allowed) return { include: false, reason: scope.reason };
  if (parts.some((part) => EXCLUDED_DIRS.has(part)) || SECRET_PATH.test(path)) return { include: false, reason: "excluded sensitive/internal/generated/vendor path" };
  if (BINARY_EXT.test(path) || file.binary === true) return { include: false, reason: "binary file" };
  return { include: true, path, content: redact(file.content) };
}

export class KnowledgeService {
  constructor(path) { this.path = path; this.items = new Map(); }
  async load() {
    try { const text = await readFile(this.path, "utf8"); for (const line of text.split("\n")) { if (!line.trim()) continue; try { const item = JSON.parse(line); if (item.id) this.items.set(item.id, item); } catch { break; } } }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    return this;
  }
  async append(item) { await mkdir(dirname(this.path), { recursive: true }); await appendFile(this.path, JSON.stringify(item) + "\n", "utf8"); this.items.set(item.id, item); return item; }
  async captureCandidate({ taskId, episodeId, runId, content, source, sourceUri = null, rawDataRef = null, metadata = {} }) {
    const clean = redact(content); const existing = [...this.items.values()].find((item) => item.provenance?.runId === runId && item.provenance?.source === source);
    if (existing) return existing;
    const item = { id: randomUUID(), state: "captured", content: clean, rawDataRef: rawDataRef ? redact(rawDataRef) : null,
      metadata: { ...metadata, contentLength: String(content ?? "").length, redacted: clean !== String(content ?? ""), contentDigest: digest(clean) },
      provenance: { taskId, episodeId, runId, source, sourceUri, capturedAt: new Date().toISOString(), revision: digest(clean) } };
    return this.append(item);
  }
  async retryCapture(args) { return this.captureCandidate(args); }
  list({ state = null, query = "" } = {}) { const q = String(query).toLocaleLowerCase(); return [...this.items.values()].filter((item) => (!state || item.state === state) && (!q || `${item.id} ${item.content} ${JSON.stringify(item.provenance)}`.toLocaleLowerCase().includes(q))); }
  get(id) { return this.items.get(id) ?? null; }
  async reviewCandidate(id, decision) { const item = this.items.get(id); if (!item) throw new Error("Knowledge candidate not found"); if (!["promoted", "rejected"].includes(decision)) throw new Error("Invalid knowledge decision"); if (item.state === decision) return item; return this.append({ ...item, state: decision, reviewedAt: new Date().toISOString() }); }
  assembleSlice(query = "", maxChars = 2000) { return this.assembleSliceWithStats(query, maxChars).text; }
  assembleSliceWithStats(query = "", maxChars = 2000) {
    if (maxChars <= 0) return { text: "", promotedCandidates: 0, matchedCandidates: 0, includedCandidates: 0, manifest: [], exclusions: [] };
    const q = String(query).toLocaleLowerCase(); const tokens = lexicalTokens(query); const promoted = this.list({ state: "promoted" });
    const matched = promoted.filter((item) => !q || matchesQuery(item.content, q, tokens)); let text = ""; const manifest = []; const exclusions = [];
    for (const item of [...matched].reverse()) { const next = text ? `${text}\n\n${item.content}` : item.content; if (next.length > maxChars) { exclusions.push({ id: item.id, reason: "knowledge budget" }); continue; } text = next; manifest.push({ id: item.id, revision: item.provenance?.revision ?? item.metadata?.contentDigest ?? null, source: "knowledge", order: manifest.length, chars: item.content.length }); }
    return { text, promotedCandidates: promoted.length, matchedCandidates: matched.length, includedCandidates: manifest.length, manifest: manifest.reverse(), exclusions };
  }
  buildContext({ query = "", maxChars = 2000, fileContents = [], root = null } = {}) {
    const selected = this.assembleSliceWithStats(query, maxChars);
    if (selected.text) return { ...selected, level: "relevant_knowledge", fallbackReason: null };
    const all = this.assembleSliceWithStats("", maxChars);
    if (all.text) return { ...all, level: "all_promoted_knowledge", fallbackReason: "no relevant promoted Knowledge" };
    let text = ""; const manifest = []; const exclusions = [...all.exclusions];
    for (const file of fileContents) { const safe = safeFile(file, root); if (!safe.include) { exclusions.push({ path: file?.path ?? "file", reason: safe.reason }); continue; } const block = `[workspace:${safe.path}]\n${safe.content}`; const next = text ? `${text}\n\n${block}` : block; if (next.length > maxChars) { exclusions.push({ path: safe.path, reason: "workspace budget" }); continue; } text = next; manifest.push({ source: "workspace", path: safe.path, digest: digest(safe.content), chars: safe.content.length, reason: "no promoted Knowledge available" }); }
    return { text, promotedCandidates: all.promotedCandidates, matchedCandidates: 0, includedCandidates: manifest.length, manifest, exclusions, level: text ? "execution_root_files" : "empty", fallbackReason: "no promoted Knowledge available" };
  }
  async searchWithFallback(options = {}) { return this.buildContext(options); }
}
