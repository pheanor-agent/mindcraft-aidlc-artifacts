# MindCraft AI-DLC Inception — Initial Requirements

- Status: **Draft — approval required**
- Scope: AI-DLC Inception requirements input
- Product baseline: MindCraft 0.1.0, Pi-based terminal TUI workflow package
- Process baseline: AI-DLC is an external development governance process, not a MindCraft runtime feature
- Source baseline: `README.md`, `DESIGN.md`, `ROUTING.md`, `docs/MINDCRAFT-PRODUCT-METADATA.md`, approved design/review records

## 1. Product intent

MindCraft helps a developer manage a repeatable Task/Episode/Run workflow in a terminal TUI, execute work through a controlled Pi-based agent session, assemble bounded project context, require approval for risky side effects, and preserve durable state for recovery and sequential reuse.

AI-DLC governs how MindCraft is developed. AI-DLC stages, artifacts, approvals, and audit records must not be represented as MindCraft's runtime Task/Episode/Run state.

## 2. Primary user and MVP outcome

- Primary user: individual developer or small development team member.
- Primary workflow: start and continue a project task safely, with visible model/configuration state, approval boundaries, streaming progress, durable history, and recoverable runs.
- Product form: Node.js package/CLI with terminal TUI; Windows Terminal is the first product validation target.
- Sharing: local/session-first. Team accounts, central synchronization, and cloud collaboration are out of MVP scope.

## 3. Functional requirements

| ID | Requirement | Priority | Acceptance signal |
|---|---|---:|---|
| FR-01 | Register/select a workspace and diagnose local runtime, storage, model registry, mock readiness, and live-provider readiness separately. | P0 | `doctor` reports actionable local/live status and never treats local readiness as live-provider success. |
| FR-02 | Create, list, and select Tasks; execute bounded Episodes as Runs through the common application dispatcher. | P0 | Task/Episode/Run state is persisted and visible in CLI/TUI. |
| FR-03 | Show streaming events, tool requests, results, errors, current status, and cancellation without losing the durable record. | P0 | User can observe and cancel an active Run; aborted state is persisted. |
| FR-04 | Use the configured Model according to the explicit registry policy: zero models blocks execution; one model serves all purposes; two models map to distinct purposes; duplicate-purpose mappings are rejected; automatic fallback is forbidden. | P0 | Invalid configuration fails before execution and the selected Model/purpose is shown. |
| FR-05 | Keep mock and live provider modes separated by explicit mode/process/workspace boundaries; no automatic provider switching during a Run. | P0 | A mock rehearsal cannot silently call a live provider, and mode changes require an explicit new boundary. |
| FR-06 | Apply execution-root file scope by default. Requests outside the root, shell commands, deletes, network calls, secrets, and other material side effects are denied or require explicit approval. | P0 | Out-of-scope and unapproved operations fail closed with reason and requested scope. |
| FR-07 | Persist approval requests, GrantedScope, decisions, model/mode snapshots, tool events, and audit records without storing credential material. | P0 | History contains decision/provenance metadata and redacts secrets. |
| FR-08 | Support sequential multi-session continuation: session identity/start/close records, replay of prior state, one active writer per workspace, and safe recovery of stale locks. | P0 | Session 2 can continue from Session 1; concurrent writers are blocked. |
| FR-09 | Support recoverable Run resume without overwriting the original Run; resume semantics must be finalized during Inception. | P0 | Resume creates a traceable new Run and preserves the prior record. |
| FR-10 | Capture Knowledge candidates with provenance and redaction; candidates do not enter approved context automatically. | P1 | Candidate status, source Run, and provenance are visible; promotion is explicit. |
| FR-11 | Provide bounded context preview/manifest showing included sources, excluded sources, scope, and reasons. | P1 | User can inspect the context before a Run. |
| FR-12 | Provide install, update, and supported-environment diagnostics; unsupported environments return a reason and manual alternative. | P1 | Fresh installation and offline mock rehearsal are repeatable. |

## 4. Non-functional requirements

- Safety: fail closed for unapproved or out-of-scope side effects; no self-approval.
- Recoverability: append-only/checkpointed state is authoritative; backend logs alone are insufficient.
- Responsiveness: command input and status controls remain responsive while a Run streams events.
- Testability: deterministic offline/mock tests cover core workflows without credentials or network access.
- Auditability: Task, Episode, Run, session, model, mode, approval, tool, Knowledge, and recovery decisions are traceable.
- Privacy: credentials and personal data are excluded from logs, docs, artifacts, and group output.
- Portability: platform and provider-specific behavior stays behind adapters; Windows Terminal is first validation, Linux/WSL/macOS are compatibility targets.
- Maintainability: product code and AI-DLC artifacts remain separate namespaces.

## 5. MVP exclusions

- Concurrent multi-writer or parallel sessions in one workspace
- Automatic provider fallback or switching
- Unapproved execution-root escape
- Full IDE/editor replacement
- Multi-agent autonomous parallel orchestration
- Central server, team accounts, cloud sync
- CI/CD and deployment operations
- Automatic promotion of generated Knowledge
- AI-DLC workflow engine embedded in MindCraft runtime
- Treating mock/offline or Linux results as proof of live provider or Windows-native completion

## 6. Inception decisions required before Construction

1. Resume contract: same Episode with a new Run versus a new Episode with a new Run.
2. Provider preflight: exact top-level readiness and failure contract for live execution.
3. Mock/live boundary: required process/workspace separation and explicit mode transition rules.
4. Workspace context: explicit reads only versus any controlled automatic ingestion.
5. Exact quantitative targets: TUI input latency, event latency, recovery success criterion, and offline/live verification matrix.
6. AI-DLC extension policy: Security Baseline, Property-Based Testing, and Resiliency Baseline enablement.

## 7. Traceability rule

Every approved requirement must map to a user story, acceptance criterion, design component, implementation unit, and verification result. Deferred or rejected requirements must retain the decision and reason.

## 8. Approval gate

This document is an initial Inception input. It is not approval to modify source code, apply a patch, call a live provider, create/push an external repository, or deploy anything. Those actions require later explicit gates.
