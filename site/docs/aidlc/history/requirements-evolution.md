# MindCraft AI-DLC Requirements Evolution and Review History

## 1. Timeline

### A. Initial Inception documents

Artifacts:

- `docs/aidlc/inception/requirements/requirement.md`
- `docs/aidlc/inception/constraints/constraint.md`
- `docs/aidlc/inception/approval-request.md`

Initial direction:

- MindCraft is a Node.js package/CLI with terminal TUI.
- Product runtime is `Task → Episode → Run`.
- AI-DLC is an external development governance process, not a runtime feature.
- Safety, approval, execution-root scope, recovery, Knowledge provenance, and model policy are core requirements.
- Six Inception decisions and three extension decisions remained open.

Initial quality gap:

- The documents captured product requirements well, but did not yet make workspace identity, canonical physical paths, extension-rule provenance, or recovery invariants explicit enough.

### B. Verification answers

Artifact:

- `docs/aidlc/inception/requirements/requirement-verification-answers.md`

Resolved decisions:

1. Resume: same Episode + new Run.
2. Live provider: explicit `doctor` preflight plus Run-start re-verification; fail closed.
3. Mock/Live: separate process and workspace; no mid-Run switch.
4. Context: explicit file reads plus approved Knowledge; no automatic file ingestion.
5. MVP targets: p95 input/event targets and committed-checkpoint recovery baseline.
6. Runtime: JavaScript ESM, not a TypeScript migration.
7. Security: full blocking baseline.
8. PBT: partial, focused on deterministic/stateful logic.
9. Resiliency extension: formal extension off; product recovery requirements retained.

Important reasoning:

- Mock/Live was deliberately resolved to the stronger process/workspace separation because the original review history already required isolation.
- JavaScript ESM was retained to avoid an unapproved language/build migration from the existing product baseline.

### C. First consolidated Requirements review

Artifact:

- `docs/aidlc/inception/requirements/requirements-review.md`

Findings:

- Extension rule identifiers had no provenance.
- Greenfield classification was ambiguous because the product baseline already existed.
- Canonical paths in the proposed consolidated document did not match the prepared files.
- Quantitative targets lacked a measurement contract.

Disposition:

- Request Changes before final Requirements approval.

### D. Consolidated Requirements revision 2

The submitted revision 2 addressed the first review by adding:

- two-dimensional project classification:
  - greenfield AI-DLC construction workspace;
  - existing/brownfield MindCraft product baseline;
- a declared canonical SSOT path and no-duplicate policy;
- supplementary evidence contracts for FR-01, FR-05, FR-09, FR-10, and FR-11;
- a D5 measurement contract;
- explicit JavaScript type-safety tasks;
- extension source/tag/commit/path/hash provenance.

### E. Revision 2 review

Artifact:

- `docs/aidlc/inception/requirements/requirements-rev2-review.md`

Remaining blockers:

1. Workspace identity and canonical paths could not be independently verified from the connected workspace.
2. The recovery target said “100% of committed checkpoints restored” while the corruption test intentionally rejects a corrupt committed checkpoint and falls back to the previous valid checkpoint.

Remaining non-blocking improvements:

- add missing NFR section heading;
- attach machine-verifiable extension-rule manifest;
- define cross-mode/workspace resume behavior;
- define Knowledge/file conflict semantics;
- clarify credential-presence diagnostics;
- pin the JSDoc/type-check toolchain;
- map PBT IDs to exact source headings.

Disposition:

- Request targeted changes before final Requirements approval.

## 2. Lessons for a future rewrite

### 2.1 Establish provenance before content expansion

Before writing functional requirements, record:

```text
workspace identity
canonical requirements path
canonical constraints path
product baseline path
reference-only paths
AI-DLC rules repository/tag/commit
installed rule-file paths and hashes
```

If any value is not verified, mark it `Pending verification`; never present it as an established fact.

### 2.2 Separate three kinds of truth

Every statement should be labeled or traceable as one of:

1. product SSOT;
2. AI-DLC process rule;
3. proposed decision or acceptance refinement.

Do not turn a proposed answer into a product fact without recording the decision source.

### 2.3 Define invariants before metrics

For stateful systems, define valid/invalid states before writing percentage targets. For checkpoint recovery, distinguish:

- intact committed data;
- uncommitted/torn data;
- checksum-invalid data;
- fallback behavior;
- immutable historical records.

Only then define “100% recovery” precisely.

### 2.4 Keep extension IDs source-backed

Do not introduce identifiers such as `SECURITY-*` or `PBT-*` unless the exact source rule set is attached or pinned by repository, tag/commit, path, and hash.

### 2.5 Keep classification multidimensional

“Greenfield” and “brownfield” can describe different dimensions:

- construction workspace state;
- product/repository baseline state.

State both instead of forcing one label to describe both.

### 2.6 Make acceptance evidence executable or auditable

Every acceptance contract should name:

- the observable behavior;
- the evidence type;
- the test/manual owner;
- the environment;
- the reproducible command or checklist;
- what the evidence does not prove.

## 3. Workspace provenance split — pending resolution

A later review identified that the project owner is working in a separate AI-DLC agent environment from this Discord agent. The project owner directly verified the intended workspace, canonical requirements/constraints, and extension-rule files there. This Discord agent must not expose or substitute its own environment-specific paths when discussing that project.

Current handling rule:

- Treat the project owner's stated AI-DLC workspace as the intended target for project decisions.
- Do not mention or substitute paths from this Discord agent's separate environment.
- Do not claim that separate agent environments are synchronized unless the project owner explicitly provides synchronization evidence.
- Keep provenance verification scoped to the intended project environment and the artifacts supplied from it.

## 4. Historical status

This file is a reasoning record for future Requirements rewrites. It is not itself approval, does not authorize Construction, and must not be promoted into MindCraft runtime Knowledge automatically.
