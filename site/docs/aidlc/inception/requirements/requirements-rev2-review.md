# MindCraft Requirements Rev. 2 — Review

- Review target: user-provided `requirements.md` (Requirements, Inception, Consolidated, rev. 2)
- Review type: consistency, traceability, acceptance-readiness, approval-gate review
- Review basis: original requirements/constraints, verification answers, prior review, and the supplied rev. 2 content
- Verdict: **Nearly ready — conditional approval after targeted corrections**
- Construction authorization: **Not granted by this review**

## 1. Executive summary

Rev. 2 successfully addresses the previous review's major concerns:

- It distinguishes the greenfield AI-DLC construction workspace from the existing/brownfield product baseline.
- It declares a single canonical SSOT path and rejects duplicate editable copies.
- It adds supplementary acceptance/evidence contracts for D1–D4.
- It adds a quantitative measurement contract for D5.
- It registers concrete JavaScript type-safety tasks.
- It adds extension-rule provenance, source paths, version, commit, and hashes.

The document is therefore substantially stronger and is suitable as an **Inception Requirements candidate**. Two issues remain blocking for final approval, plus several non-blocking clarifications.

## 2. Blocking findings

### B-01 — Canonical path and workspace identity cannot be verified from the current evidence

**Severity:** High — provenance/SSOT blocker

The document claims that the canonical files are physically present at:

```text
requirements/requirement.md
requirements/constraint.md
```

and that the construction workspace is:

```text
/home/bot/ai-dlc/mindcraft
```

In the currently connected workspace used for this review, the discoverable files are instead:

```text
/opt/data/workspace/mindcraft/docs/aidlc/inception/requirements/requirement.md
/opt/data/workspace/mindcraft/docs/aidlc/inception/constraints/constraint.md
/opt/data/workspace/mindcraft/package.json
```

No `requirements/requirement.md` or `requirements/constraint.md` was discoverable there, and no `.aidlc-rule-details` extension files were discoverable there.

This may simply mean that the submitted document describes a different AI-DLC workspace. It must not be silently treated as the same workspace.

**Required action:** record one of the following explicitly:

1. The review is for `/home/bot/ai-dlc/mindcraft`, and provide/attach a manifest proving the canonical files and extension files exist there; or
2. The review is for the connected `/opt/data/workspace/mindcraft` workspace, and update the paths to the actual canonical locations; or
3. Mark the submitted paths and provenance as an external workspace claim that is pending independent verification.

Do not approve final Requirements provenance until workspace identity is unambiguous.

### B-02 — Recovery target conflicts with corruption fallback behavior

**Severity:** High — acceptance-contract blocker

The D5 definition says:

> recovery success = 100% of committed checkpoints restored

But the corruption test intentionally corrupts a committed checkpoint and expects the system to reject it and fall back to the prior valid committed checkpoint.

A corrupted committed checkpoint cannot simultaneously be restored and rejected. The intended contract is likely:

- all **valid committed checkpoints** before interruption are recoverable;
- a corrupt or checksum-invalid checkpoint is detected and rejected;
- recovery falls back to the latest prior valid checkpoint;
- no uncommitted/torn checkpoint is accepted;
- the recovery outcome records that data loss may exist after the last valid checkpoint.

**Required action:** replace the 100% statement with a two-part target, for example:

```text
For an intact store, 100% of committed checkpoints are restorable.
For corruption scenarios, invalid checkpoints are detected and rejected, and recovery selects the latest prior valid checkpoint without mutating the original Run.
```

Then define whether “100%” applies per test fixture, per checkpoint, or across a CI run.

## 3. Non-blocking findings and recommended corrections

### N-01 — Section numbering/structure

After `## 2a. Supplementary Acceptance & Evidence Contracts`, the NFR bullets appear without an explicit `## 3. Non-Functional Requirements` heading. Add the missing heading and renumber subsequent sections if needed. This is a documentation-quality issue but important for traceability citations.

### N-02 — Extension provenance should include verification evidence

The provenance block is much improved. Before final approval, add one machine-verifiable manifest entry or attached evidence containing:

- source file path;
- exact file size;
- SHA-256 computed from the installed file;
- commit/tag resolution evidence;
- date and command used for verification.

The current connected workspace does not contain the claimed installed rule paths, so the hashes and commit cannot be independently verified here. Treat them as supplied claims until verified in the named workspace.

### N-03 — D3 process/workspace isolation needs lifecycle semantics

The document correctly requires separate process and workspace per mode. Add the rule for what happens when a user attempts to resume a Run in a different mode/workspace:

- reject by default, or
- create a new Run only after explicit migration/reconciliation approval.

Also specify that the persisted mode/workspace identity is immutable for the Run.

### N-04 — D4 source precedence needs conflict semantics

The document says the live explicit file is authoritative when it overlaps approved Knowledge. Define how conflicts are represented:

- both source IDs remain in the manifest;
- the Knowledge item is not silently overwritten;
- the conflict is visible to the user or audit record;
- context assembly uses the selected precedence deterministically.

### N-05 — D2 credential check wording

“Credential presence” should mean a non-secret reference/configuration is available, not that a credential value is copied into diagnostic output. Add an explicit statement that `doctor` reports presence/usable configuration status only and never logs credential material.

### N-06 — NFR-TS-02 toolchain is still open

`tsc --checkJs --noEmit or equivalent` is reasonable, but the exact tool and version should be selected during NFR Design. The phrase “no new any-equivalent gaps” needs an enforceable rule or should be removed until a lint/type policy is approved.

### N-07 — PBT property identifiers need exact rule mapping

The document says PBT-02/03/07/08/09 correspond to summarized concepts. Add the exact section/heading names from the pinned rule file, so a future rule update cannot silently change their meaning.

## 4. Consistency checks

### Passed

- Greenfield construction workspace versus existing product baseline: clearly separated.
- AI-DLC versus runtime boundary: preserved.
- FR-05 isolation: consistent with D3.
- FR-09 resume: consistent with D1 and same-Episode contract.
- FR-01 freshness/reverification: concrete and testable.
- FR-10/FR-11 explicit files plus promoted Knowledge: bounded and manifestable.
- JavaScript ESM baseline: consistent with the existing product baseline.
- Security full + PBT partial + Resiliency formal extension off: internally coherent.
- Approval gate remains explicit and does not authorize implementation.

### Needs the corrections above

- Workspace/path provenance.
- Checkpoint recovery wording.
- Extension-file verification evidence.
- Final document heading/section structure.

## 5. Approval recommendation

**Request targeted changes for B-01 and B-02.**

After the workspace identity/canonical paths are verified and the recovery contract is corrected, the document can be approved as the Requirements Analysis output and used to produce:

- user stories and acceptance criteria;
- NFR Requirements and NFR Design;
- application design;
- construction-unit planning.

Even after Requirements approval, a separate AI-DLC gate is still required before source-code generation or implementation begins.
