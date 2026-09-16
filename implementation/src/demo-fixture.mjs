import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const DEMO_FILES = {
  "README.md": `# Release demo workspace\n\nA deterministic, credential-free workspace for the MindCraft release-readiness demo.\n\nRun the check with:\n\n\`\`\`sh\nnpm test\n\`\`\`\n`,
  "docs/release-notes.md": `# Release notes\n\n- The demo checks the release readiness of a small sample project.\n- No network access or production credentials are required.\n- A write request is intentionally approval-gated.\n`,
  "src/release-check.mjs": `export const releaseChecklist = Object.freeze([\n  { id: "tests", label: "Automated tests pass", status: "ready" },\n  { id: "docs", label: "Release notes are present", status: "ready" },\n  { id: "approval", label: "Risky write requires approval", status: "review" },\n]);\n\nexport function summarizeRelease(checklist = releaseChecklist) {\n  return checklist.map(({ id, status }) => ({ id, status }));\n}\n`,
  "test/release-check.test.mjs": `import test from "node:test";\nimport assert from "node:assert/strict";\nimport { releaseChecklist, summarizeRelease } from "../src/release-check.mjs";\n\ntest("release checklist has a review gate", () => {\n  assert.equal(releaseChecklist.length, 3);\n  assert.equal(summarizeRelease()[2].status, "review");\n});\n`,
};

export const RELEASE_DEMO_FILES = Object.freeze({ ...DEMO_FILES });

export const RELEASE_DEMO_SCENARIO = Object.freeze({
  title: "릴리스 준비 상태 점검",
  prompt: "release readiness를 점검하고 테스트·문서 상태를 요약해줘",
  workspace: "examples/release-demo",
  expectations: Object.freeze({
    success: Object.freeze({ expectedState: "completed", observation: "점검 결과와 테스트 요약이 표시된다." }),
    approval: Object.freeze({ expectedState: "pending_approval", observation: "workspace 밖 write 또는 command는 실행 전에 승인 요청으로 멈춘다." }),
    rejection: Object.freeze({ expectedState: "denied", observation: "거부된 위험 작업은 실행되지 않고 거부 사유가 기록된다." }),
    knowledge: Object.freeze({ expectedState: "promoted_then_reused", observation: "candidate를 promote한 뒤 다음 Run의 approved knowledge context에 포함된다." }),
  }),
  providerPolicy: Object.freeze({
    mock: Object.freeze({ deterministic: true, network: false, credential: "none", use: "기본 테스트와 리허설" }),
    real: Object.freeze({ deterministic: false, network: true, requiresCredential: true, use: "명시적 provider 검증" }),
  }),
});

const unsafePattern = /(AKIA[0-9A-Z]{16}|Bearer\s+\S+|(?:api[_-]?key|password|secret|token)\s*[:=]\s*\S+|BEGIN [A-Z ]+ PRIVATE KEY)/i;

function manifestFor(files) {
  return Object.keys(files).sort().map((path) => ({
    path,
    sha256: createHash("sha256").update(files[path]).digest("hex"),
    bytes: Buffer.byteLength(files[path]),
  }));
}

async function listRelativeFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) files.push(...await listRelativeFiles(root, path));
    else files.push(relative(root, path).replaceAll("\\", "/"));
  }
  return files.sort();
}

export async function createReleaseDemoWorkspace(destination) {
  const root = resolve(destination);
  for (const [path, content] of Object.entries(DEMO_FILES)) {
    const target = join(root, path);
    await mkdir(resolve(target, ".."), { recursive: true });
    await writeFile(target, content, { encoding: "utf8", mode: 0o644 });
  }
  return { root, files: { ...DEMO_FILES }, manifest: manifestFor(DEMO_FILES), scenario: RELEASE_DEMO_SCENARIO };
}

export async function validateReleaseDemoWorkspace(destination) {
  const root = resolve(destination);
  let actual = [];
  try { actual = await listRelativeFiles(root); } catch (error) {
    if (error.code === "ENOENT") return { valid: false, missing: Object.keys(DEMO_FILES).sort(), unexpected: [], changed: [], unsafe: [] };
    throw error;
  }
  const expected = Object.keys(DEMO_FILES).sort();
  const missing = expected.filter((path) => !actual.includes(path));
  const unexpected = actual.filter((path) => !expected.includes(path));
  const changed = [];
  const unsafe = [];
  for (const path of actual) {
    const content = await readFile(join(root, path), "utf8");
    if (DEMO_FILES[path] !== undefined && content !== DEMO_FILES[path]) changed.push(path);
    if (unsafePattern.test(content)) unsafe.push(path);
  }
  return { valid: missing.length === 0 && unexpected.length === 0 && changed.length === 0 && unsafe.length === 0, missing, unexpected, changed, unsafe };
}
