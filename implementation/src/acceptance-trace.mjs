const STATUSES = new Set(["planned", "in_progress", "passed", "failed", "not_run", "blocked"]);
const REQUIRED = ["id", "requirement", "acceptance", "implementation", "evidence", "status"];

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  return value;
}

function invalid(message, issues = []) {
  return Object.assign(new Error(message), { code: "TRACEABILITY_INVALID", issues });
}

export function validateAcceptanceTrace(entries) {
  const issues = [];
  if (!Array.isArray(entries) || entries.length === 0) return [{ code: "EMPTY_TRACE", path: "$", message: "traceability requires at least one entry" }];
  const ids = new Set();
  for (const [index, entry] of entries.entries()) {
    const path = `entries[${index}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      issues.push({ code: "INVALID_ENTRY", path, message: "entry must be an object" });
      continue;
    }
    for (const key of REQUIRED) if (typeof entry[key] !== "string" || entry[key].trim() === "") issues.push({ code: "MISSING_FIELD", path: `${path}.${key}`, message: `${key} is required` });
    if (entry.id && ids.has(entry.id)) issues.push({ code: "DUPLICATE_ID", path: `${path}.id`, message: "id must be unique" });
    if (entry.id) ids.add(entry.id);
    if (entry.status && !STATUSES.has(entry.status)) issues.push({ code: "INVALID_STATUS", path: `${path}.status`, message: "unknown status" });
    if (entry.status === "passed" && /not run|미실행|unknown|미확인/i.test(`${entry.evidence} ${entry.notes ?? ""}`)) issues.push({ code: "UNSUPPORTED_PASS", path: `${path}.status`, message: "passed entry cannot rely on unexecuted or unknown evidence" });
  }
  return issues;
}

export function createAcceptanceTrace(entries) {
  const errors = validateAcceptanceTrace(entries);
  if (errors.length) throw invalid(`Invalid acceptance trace: ${errors.map((item) => item.code).join(", ")}`, errors);
  return Object.freeze(clone(entries).map((entry) => Object.freeze(entry)));
}

export function summarizeAcceptanceTrace(entries) {
  const issues = validateAcceptanceTrace(entries);
  const counts = Object.fromEntries([...STATUSES].map((status) => [status, 0]));
  for (const entry of Array.isArray(entries) ? entries : []) if (entry?.status in counts) counts[entry.status] += 1;
  return { valid: issues.length === 0, issues, counts, total: Array.isArray(entries) ? entries.length : 0, passed: counts.passed, unresolved: counts.planned + counts.in_progress + counts.not_run + counts.blocked };
}
