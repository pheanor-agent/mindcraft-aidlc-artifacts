# MindCraft AI-DLC Inception — Initial Constraints

- Status: **Draft — approval required**
- Scope: constraints for the MindCraft AI-DLC project definition
- Governing boundary: AI-DLC is an external development method; MindCraft is the product runtime

## 1. Process and scope constraints

1. AI-DLC stage state, artifacts, approvals, and audit are development records, not runtime Task/Episode/Run state.
2. Existing documents and reference kits are evidence/input only until explicitly accepted; they are not automatically copied into a new AI-DLC state.
3. No Construction implementation, source patch, reference-code transplant, live provider call, external push, or deployment occurs before the relevant approval gate.
4. MVP exclusions require an explicit decision and a recorded follow-up plan before implementation scope changes.
5. Product SSOT and AI-DLC documents use separate namespaces and are not silently merged into runtime Knowledge.

## 2. Runtime and architecture constraints

1. MindCraft remains a Node.js package/CLI with terminal TUI and a shared application command dispatcher.
2. Pi/AgentSession is an execution foundation; MindCraft must not reimplement Pi's agent loop.
3. Task → Episode → Run is the product workflow model. AI-DLC phases must not be substituted for these runtime states.
4. Model/provider selection is explicit and deterministic. Automatic fallback or provider switching is prohibited unless separately approved.
5. Mock and live modes are explicit and isolated; a mode change cannot happen implicitly during a Run.
6. State persistence, checkpointing, recovery, and writer-lock behavior must be testable offline.
7. Backend/provider-specific APIs remain behind adapter boundaries.

## 3. Safety and privacy constraints

1. Execution-root files are the default file scope. Absolute paths, `..`, symlink/junction/reparse escapes, and root-outside access fail closed.
2. Root-outside file access, writes, deletes, shell commands, network calls, and other material side effects require an approval containing target, scope, impact, and risk.
3. `.mindcraft` control files and credential/secret-like files are excluded from ordinary agent context unless explicitly approved by a narrowly scoped policy.
4. Secrets are never written to source, prompts, ordinary logs, audit output, Knowledge, artifacts, or approval messages; diagnostics must redact them.
5. Group/Discord output must not disclose personal information or private credentials. Only project decisions and non-sensitive status may be reported.
6. No self-approval: the agent cannot approve its own requested side effect.

## 4. Platform and dependency constraints

1. Windows Terminal is the first product validation target; Linux/WSL/macOS are compatibility targets unless separately promoted.
2. Node.js and npm versions must be pinned/documented for reproducible build and test execution.
3. Pi baseline/version/commit and direct/transitive dependency licenses must be recorded before release.
4. Terminal ownership must not be concurrently taken by Pi TUI and MindCraft TUI.
5. Platform-specific filesystem, shell, process-signal, and path behavior must be hidden behind tested adapters.

## 5. Verification constraints

1. Offline/mock tests must not be represented as evidence of live provider access, paid API behavior, or Windows-native behavior.
2. A passing local `doctor` result must not be represented as a successful live-provider preflight.
3. Every acceptance criterion must have a reproducible verification command or documented manual check.
4. Recovery tests must preserve original Run history and prove that resume creates a traceable continuation.
5. Release claims must distinguish executed evidence from planned or unexecuted checks.

## 6. Open constraints requiring Inception decisions

- Resume Episode/Run contract
- Live-provider readiness and credential preflight semantics
- Exact mock/live process and workspace boundary
- Explicit versus controlled automatic workspace context ingestion
- Quantitative responsiveness, recovery, and cost targets
- Security, property-based testing, and resiliency extension selection
- Final supported-platform and distribution matrix

## 7. Approval gate

These constraints authorize documentation and Inception analysis only. They do not authorize implementation, external side effects, credential changes, live provider usage, repository creation/push, or deployment. Construction begins only after the requirements, constraints, open decisions, and stage plan are approved.
