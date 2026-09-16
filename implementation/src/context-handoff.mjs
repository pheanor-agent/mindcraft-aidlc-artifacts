import { createHash } from "node:crypto";

const PHASES = new Set(["investigation", "design", "review", "approval", "execution", "test", "execution_review"]);
const STATUSES = new Set(["complete", "partial", "blocked"]);
const KINDS = new Set(["evidence", "decision", "result", "log"]);
const VALIDATION_RESULTS = new Set(["pass", "fail", "not_run"]);

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value ?? null);
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  return value;
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

export function digest(value) {
  return createHash("sha256").update(stable(value)).digest("hex");
}

function issue(code, path, detail) { return { code, path, detail }; }
function isObject(value) { return value && typeof value === "object" && !Array.isArray(value); }
function isStringArray(value) { return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.length > 0); }

function payloadOf(handoff) {
  if (!isObject(handoff)) return handoff;
  const { handoff_id: _handoffId, payload_digest: _payloadDigest, ...payload } = handoff;
  return payload;
}

export function validateHandoff(handoff, { currentDigests = null, maxSummaryChars = 4000, requireEnvelope = false } = {}) {
  const errors = [];
  if (!isObject(handoff)) return [issue("INVALID_HANDOFF", "$", "handoff must be an object")];
  if (handoff.schema_version !== 1) errors.push(issue("SCHEMA_VERSION", "schema_version", "expected schema version 1"));
  if (!handoff.job_id) errors.push(issue("MISSING_JOB", "job_id", "job_id is required"));
  if (!PHASES.has(handoff.phase)) errors.push(issue("INVALID_PHASE", "phase", "unknown workflow phase"));
  if (!STATUSES.has(handoff.status)) errors.push(issue("INVALID_STATUS", "status", "unknown handoff status"));
  if (!handoff.producer) errors.push(issue("MISSING_PRODUCER", "producer", "producer is required"));
  if (!Number.isInteger(handoff.attempt) || handoff.attempt < 1) errors.push(issue("INVALID_ATTEMPT", "attempt", "attempt must be a positive integer"));
  if (handoff.input_digest !== null && !/^[a-f0-9]{64}$/u.test(String(handoff.input_digest ?? ""))) errors.push(issue("INVALID_INPUT_DIGEST", "input_digest", "input_digest must be null or a 64-character hex digest"));

  if (!Array.isArray(handoff.source_artifacts) || handoff.source_artifacts.length === 0) {
    errors.push(issue("MISSING_SOURCES", "source_artifacts", "source_artifacts must be a non-empty array"));
  } else {
    const paths = new Map();
    for (const [index, artifact] of handoff.source_artifacts.entries()) {
      if (!isObject(artifact)) { errors.push(issue("INVALID_SOURCE", `source_artifacts[${index}]`, "source artifact must be an object")); continue; }
      if (!artifact.path) errors.push(issue("MISSING_SOURCE_PATH", `source_artifacts[${index}].path`, "source path is required"));
      if (!/^[a-f0-9]{64}$/u.test(String(artifact.sha256 ?? ""))) errors.push(issue("INVALID_SOURCE_DIGEST", `source_artifacts[${index}].sha256`, "sha256 must be a 64-character hex digest"));
      if (!KINDS.has(artifact.kind)) errors.push(issue("INVALID_SOURCE_KIND", `source_artifacts[${index}].kind`, "unknown artifact kind"));
      if (artifact.path && /^[a-f0-9]{64}$/u.test(String(artifact.sha256 ?? ""))) {
        if (paths.has(artifact.path) && paths.get(artifact.path) !== artifact.sha256) errors.push(issue("CONFLICTING_SOURCE", `source_artifacts[${index}]`, "same source path has multiple digests"));
        paths.set(artifact.path, artifact.sha256);
        if (currentDigests && !(artifact.path in currentDigests)) errors.push(issue("MISSING_SOURCE", `source_artifacts[${index}]`, "source path is absent from current snapshot"));
        else if (currentDigests && currentDigests[artifact.path] !== artifact.sha256) errors.push(issue("STALE_SOURCE", `source_artifacts[${index}]`, "source digest differs from current snapshot"));
      }
    }
  }

  const projection = handoff.projection;
  if (!isObject(projection)) errors.push(issue("MISSING_PROJECTION", "projection", "projection must be an object"));
  else {
    if (typeof projection.summary !== "string") errors.push(issue("MISSING_PROJECTION", "projection.summary", "bounded projection summary is required"));
    else if (projection.summary.length > maxSummaryChars) errors.push(issue("BUDGET_EXCEEDED", "projection.summary", "summary exceeds configured character budget"));
    if (!isStringArray(projection.included_claim_ids)) errors.push(issue("INVALID_CLAIMS", "projection.included_claim_ids", "included_claim_ids must be a non-empty string array"));
  }
  if (!Array.isArray(handoff.constraints) || !handoff.constraints.every((item) => isObject(item) && typeof item.id === "string" && typeof item.text === "string")) errors.push(issue("INVALID_CONSTRAINTS", "constraints", "constraints must be an array of {id,text}"));
  if (!Array.isArray(handoff.unresolved) || !handoff.unresolved.every((item) => isObject(item) && typeof item.id === "string" && ["P0", "P1", "P2"].includes(item.severity))) errors.push(issue("INVALID_UNRESOLVED", "unresolved", "unresolved must be an array of {id,severity}"));
  if (!handoff.validation || !VALIDATION_RESULTS.has(handoff.validation.result)) errors.push(issue("INVALID_VALIDATION", "validation.result", "validation result is required"));
  if (handoff.status === "complete" && Array.isArray(handoff.unresolved) && handoff.unresolved.some((item) => item.severity === "P0")) errors.push(issue("P0_UNRESOLVED", "unresolved", "complete handoff cannot contain unresolved P0 issues"));
  if (requireEnvelope || handoff.payload_digest !== undefined || handoff.handoff_id !== undefined) {
    if (!/^[a-f0-9]{64}$/u.test(String(handoff.payload_digest ?? ""))) errors.push(issue("MISSING_PAYLOAD_DIGEST", "payload_digest", "payload_digest is required for a serialized handoff"));
    if (typeof handoff.handoff_id !== "string") errors.push(issue("MISSING_HANDOFF_ID", "handoff_id", "handoff_id is required for a serialized handoff"));
    else if (handoff.handoff_id !== `handoff-${String(handoff.payload_digest).slice(0, 24)}`) errors.push(issue("HANDOFF_DIGEST_MISMATCH", "handoff_id", "handoff_id does not match payload_digest"));
    if (/^[a-f0-9]{64}$/u.test(String(handoff.payload_digest ?? "")) && digest(payloadOf(handoff)) !== handoff.payload_digest) errors.push(issue("PAYLOAD_DIGEST_MISMATCH", "payload_digest", "payload digest does not match canonical handoff payload"));
  }
  return errors;
}

export function createHandoff({ jobId, phase, producer, status = "complete", parentHandoffId = null, sourceArtifacts, projection, constraints = [], unresolved = [], validation = { result: "not_run", commands: [], evidence_refs: [] }, attempt = 1, inputDigest = null, createdAt = new Date().toISOString() } = {}) {
  const base = clone({ schema_version: 1, job_id: jobId, phase, status, created_at: createdAt, producer, parent_handoff_id: parentHandoffId, attempt, input_digest: inputDigest, source_artifacts: sourceArtifacts, projection, constraints, unresolved, validation });
  const errors = validateHandoff(base);
  if (errors.length) throw Object.assign(new Error(`Invalid handoff: ${errors.map((error) => error.code).join(", ")}`), { code: "HANDOFF_INVALID", issues: errors });
  const payloadDigest = digest(base);
  return freeze({ handoff_id: `handoff-${payloadDigest.slice(0, 24)}`, payload_digest: payloadDigest, ...base });
}

function controlMetadata(handoff, sourceErrors = []) {
  if (!isObject(handoff)) return { handoff_id: null, status: "invalid", constraints: [], unresolved: [], validation: { result: "not_run" }, source_artifacts: [], source_errors: [...sourceErrors, issue("INVALID_HANDOFF", "$", "handoff must be an object")] };
  const artifacts = Array.isArray(handoff.source_artifacts) ? handoff.source_artifacts : [];
  return { handoff_id: handoff.handoff_id ?? null, status: handoff.status ?? "invalid", constraints: clone(Array.isArray(handoff.constraints) ? handoff.constraints : []), unresolved: clone(Array.isArray(handoff.unresolved) ? handoff.unresolved : []), validation: clone(handoff.validation ?? { result: "not_run" }), source_artifacts: artifacts.filter(isObject).map(({ path, sha256, kind }) => ({ path, sha256, kind })), source_errors: sourceErrors };
}

export function buildContextManifest(handoffs = [], { budgetChars = 8000, builderVersion = "1", sourceSnapshot = null } = {}) {
  const valid = [];
  const omitted = [];
  const metadata = [];
  const seen = new Map();
  const batchSources = new Map();
  for (const handoff of Array.isArray(handoffs) ? handoffs : []) {
    const errors = validateHandoff(handoff, { currentDigests: sourceSnapshot, requireEnvelope: true });
    if (isObject(handoff) && Array.isArray(handoff.source_artifacts)) {
      for (const artifact of handoff.source_artifacts) {
        if (!isObject(artifact) || !artifact.path || !/^[a-f0-9]{64}$/u.test(String(artifact.sha256 ?? ""))) continue;
        const previous = batchSources.get(artifact.path);
        if (previous && previous !== artifact.sha256) errors.push(issue("BATCH_SOURCE_CONFLICT", `source_artifacts:${artifact.path}`, "batch contains conflicting source digests"));
        else batchSources.set(artifact.path, artifact.sha256);
      }
    }
    const id = handoff?.handoff_id ?? null;
    if (id && seen.has(id)) {
      const duplicateDigest = digest(handoff);
      if (seen.get(id) !== duplicateDigest) omitted.push({ handoff_id: id, reason: "conflicting_duplicate" });
      else omitted.push({ handoff_id: id, reason: "duplicate_handoff" });
      continue;
    }
    if (id) seen.set(id, digest(handoff));
    metadata.push(controlMetadata(handoff, errors));
    if (errors.length) { omitted.push({ handoff_id: id, reason: "invalid_handoff", errors: errors.map((error) => error.code) }); continue; }
    valid.push(handoff);
  }

  let text = "";
  const includedProjections = [];
  const includedClaims = [];
  for (const handoff of valid) {
    const summary = handoff.projection.summary;
    const block = text ? `${text}\n\n${summary}` : summary;
    const claimIds = handoff.projection.included_claim_ids;
    if (block.length > budgetChars) {
      omitted.push({ handoff_id: handoff.handoff_id, claim_ids: claimIds, reason: "budget" });
      continue;
    }
    text = block;
    includedProjections.push({ handoff_id: handoff.handoff_id, claim_ids: [...claimIds], text: summary });
    for (const claimId of claimIds) includedClaims.push({ claim_id: claimId, handoff_id: handoff.handoff_id });
  }

  const blockingOmissions = omitted.some((item) => ["conflicting_duplicate", "invalid_handoff"].includes(item.reason));
  return { schema_version: 1, builder_version: builderVersion, source_verification: sourceSnapshot ? "verified" : "not_run", execution_allowed: !blockingOmissions && Boolean(sourceSnapshot) && metadata.length > 0 && metadata.every((item) => item.status === "complete" && item.validation.result === "pass" && !item.unresolved.some((issueItem) => issueItem.severity === "P0") && item.source_errors.length === 0), handoffs: metadata, handoff_ids: valid.map((handoff) => handoff.handoff_id), source_digests: valid.flatMap((handoff) => handoff.source_artifacts.map((artifact) => ({ path: artifact.path, sha256: artifact.sha256 }))), included_projections: includedProjections, included_claims: includedClaims, omitted_claims: omitted, text, budget_chars: budgetChars, created_at: new Date().toISOString() };
}
