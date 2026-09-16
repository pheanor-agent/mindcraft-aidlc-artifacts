# Requirements Rewrite Preflight Checklist

Use this checklist before creating a new MindCraft AI-DLC Requirements or Constraints draft.

## A. Workspace and provenance

- [ ] Confirm the exact workspace path and record it in the document.
- [ ] Confirm the product baseline path and whether it is reference-only or reusable.
- [ ] Confirm one canonical requirements file path.
- [ ] Confirm one canonical constraints file path.
- [ ] Search for duplicate requirement/constraint copies and classify each as canonical, alias, or historical.
- [ ] Confirm AI-DLC rules repository, tag, commit, installed paths, and file hashes.
- [ ] Mark every unverified path or hash as `Pending verification`.

## B. Product/process boundary

- [ ] State that AI-DLC is external development governance.
- [ ] State that AI-DLC stages are not MindCraft runtime Task/Episode/Run states.
- [ ] Keep product SSOT, AI-DLC artifacts, and runtime Knowledge in separate namespaces.

## C. Classification

- [ ] Classify the AI-DLC construction workspace.
- [ ] Classify the product/repository baseline separately.
- [ ] State whether existing code is reference-only, reusable, or out of scope.

## D. Requirement quality

- [ ] Every FR has priority, acceptance signal, source, and evidence owner.
- [ ] Every NFR has a measurable target or an explicit deferred decision.
- [ ] Every resolved decision links back to the original open question.
- [ ] Every introduced field/invariant has a schema or contract owner.
- [ ] Every extension identifier maps to a pinned source rule.

## E. Stateful behavior

- [ ] Define original Run immutability before defining resume success.
- [ ] Distinguish valid committed, uncommitted/torn, and corrupt records.
- [ ] Define fallback behavior for invalid checkpoints.
- [ ] Define same/different Episode and Run linkage.
- [ ] Define cross-mode and cross-workspace resume behavior.
- [ ] Define stale-lock and concurrent-writer behavior.

## F. Context and safety

- [ ] Define explicit file source rules.
- [ ] Define approved Knowledge source rules.
- [ ] Define overlap/conflict precedence and manifest behavior.
- [ ] Define secret-like and control-file exclusions.
- [ ] Define approval scope, fail-closed behavior, and no-self-approval.
- [ ] Ensure diagnostics never expose credential material.

## G. Metrics and evidence

- [ ] Define measurement start/end boundaries.
- [ ] Define sample size and workload.
- [ ] Define cold/warm conditions.
- [ ] Define CI versus manual evidence ownership.
- [ ] State what offline/mock evidence does not prove.
- [ ] Record environment, Node/npm versions, OS, and hardware class.

## H. Approval gate

- [ ] Requirements status is clear: Draft, Review, Approval Requested, or Approved.
- [ ] Construction authorization is separate from Requirements approval.
- [ ] Code changes, live provider calls, credentials, external push, and deployment require explicit later gates.
- [ ] Review findings are linked from the current document.
