# MindCraft Requirements Consolidated Document — Review

- Review target: user-provided `requirements.md`
- Review basis:
  - `docs/aidlc/inception/requirements/requirement.md`
  - `docs/aidlc/inception/constraints/constraint.md`
  - `docs/aidlc/inception/requirements/requirement-verification-answers.md`
  - current MindCraft product SSOT and prior AI-DLC review records
- Review status: **Conditionally acceptable — changes required before final approval**
- Construction status: **Not authorized by this review**

## 1. Executive verdict

The consolidated document is structurally strong and correctly preserves the central product/process boundary. FR-01–FR-12, the NFR summary, the six resolved decisions, MVP exclusions, and the approval gate are substantially aligned with the original documents.

However, it should not yet be treated as the final approved Requirements artifact because four traceability/consistency issues remain:

1. The document introduces extension rule identifiers (`SECURITY-01..15`, `PBT-02/03/07/08/09`) without attaching their authoritative rule source or copying the applicable rule definitions into the AI-DLC artifact set.
2. `Project Type: Greenfield` needs an explicit clarification because the product repository and implementation baseline already exist, while the AI-DLC project may be a greenfield construction workspace. These are different classifications.
3. The claimed SSOT paths use `requirements/requirement.md` and `requirements/constraint.md`, while the prepared files currently live under `docs/aidlc/inception/...`. The canonical path must be fixed or both paths must be explicitly declared aliases.
4. The newly fixed quantitative targets need concrete measurement definitions and test ownership before they can serve as acceptance criteria.

Recommended disposition: **Request Changes, then Approve & Continue after the four corrections are recorded.**

## 2. Alignment review

### 2.1 Correctly aligned

- AI-DLC is kept outside MindCraft runtime state.
- Product workflow remains `Task → Episode → Run`.
- Mock/live process and workspace separation is consistent with the approved decision input.
- Live readiness is separated from local/mock readiness and remains fail-closed.
- Same-Episode + new-Run resume preserves original history.
- Explicit-read-only context ingestion is consistent with the safety boundary.
- Security is treated as blocking.
- Partial PBT is scoped to deterministic/stateful logic rather than all external integrations.
- Formal Resiliency extension is excluded while product recovery requirements remain mandatory.
- The document correctly does not authorize code changes, live calls, credentials, external push, or deployment.

## 3. Findings requiring correction

### F-01 — Extension rule provenance is incomplete

**Severity:** High — traceability blocker

The document states:

- `SECURITY-01..15`
- `PBT-02/03/07/08/09`
- `fast-check`

Those identifiers and the exact rule contents do not exist in the two original requirement/constraint documents reviewed here. They may be valid AI-DLC extension rules, but the consolidated document does not identify their authoritative version/tag/commit or include the source artifact.

**Required correction:** choose one of the following and record it:

- attach/import the exact AI-DLC extension rule files and record provenance (repository, tag/commit, path, checksum if available); or
- remove the numeric identifiers and describe the obligations directly until the extension source is attached.

`fast-check` should remain a proposed framework choice until NFR/design approval, as the document already says.

### F-02 — Greenfield classification is ambiguous

**Severity:** Medium — project metadata blocker

The document says `Project Type: Greenfield`, but the current MindCraft product repository, JavaScript ESM implementation, tests, and product SSOT already exist. This can be correct only if it means **new AI-DLC construction workspace/project state**, not a claim that no product code or baseline exists.

**Required correction:** replace with a two-dimensional classification, for example:

```text
AI-DLC project classification: Greenfield construction workspace
Product baseline classification: Existing/brownfield MindCraft repository and design baseline
```

If the team truly intends a new implementation with no reuse, state that explicitly and identify the existing repository as reference-only.

### F-03 — Canonical SSOT paths are inconsistent

**Severity:** Medium — document discovery blocker

The document declares:

```text
requirements/requirement.md + requirements/constraint.md
```

The prepared artifacts currently exist at:

```text
docs/aidlc/inception/requirements/requirement.md
docs/aidlc/inception/constraints/constraint.md
```

**Required correction:** select one canonical location and update every reference. If the shorter paths are logical names, state the physical paths and the alias rule explicitly. Avoid two independently editable copies.

### F-04 — Quantitative targets lack measurement contracts

**Severity:** Medium — acceptance readiness issue

The p95 targets and 100% checkpoint recovery target are useful baselines, but the document does not define:

- measurement start/end timestamps;
- sample size and workload shape;
- cold-start versus warm-run conditions;
- whether event render latency includes provider/network delay;
- hardware/OS matrix;
- how checkpoint corruption or interrupted writes are tested;
- CI versus manual evidence ownership.

**Required correction:** add a short measurement contract or defer the numbers to NFR Requirements with an explicit placeholder. The current values should be called `MVP baseline targets`, not final proof until measured.

## 4. Lower-priority improvements

### L-01 — FR-05 acceptance should name the isolation evidence

Add evidence requirements for process/workspace separation, such as mode/process/workspace identifiers in the Run snapshot and a test proving a mock Run cannot resolve a live provider configuration.

### L-02 — FR-09 should name the resume linkage field

The text mentions `resumedFrom`/provenance. Promote the field name and invariants to a small contract:

- original Run remains immutable;
- new Run references original Run;
- both Runs belong to the same Episode;
- resume cannot duplicate already committed side effects without an approval/reconciliation check.

### L-03 — D2 should distinguish preflight freshness

Define whether `doctor` results are advisory and revalidated at Run start, and how stale readiness results are represented. The document says a final Run-start preflight is retained; this should become an explicit acceptance criterion.

### L-04 — D4 should clarify Knowledge reuse

“Only user-selected files and approved Knowledge” is consistent with the decision, but define whether previously approved Knowledge can be included automatically after the user selects a Knowledge query/slice. This prevents “explicit reads only” from being interpreted as “no Knowledge retrieval.”

### L-05 — JavaScript type-safety approach should be tracked

JSDoc, runtime schema validation, and contract tests are a sensible substitute for a TypeScript migration. Add them as concrete NFR/design tasks with selected schema library and validation boundaries later; do not leave them only as prose.

## 5. Suggested patch set

Before approval, update the consolidated document as follows:

1. Add canonical physical paths for the original and consolidated artifacts.
2. Clarify Greenfield AI-DLC workspace versus existing product baseline.
3. Add AI-DLC extension provenance or remove unsupported numeric rule IDs.
4. Add the quantitative measurement contract, or move exact thresholds to NFR Requirements.
5. Add explicit resume and mock/live isolation invariants.
6. Add a statement that `doctor` is advisory and Run-start preflight is authoritative for live execution.

## 6. Approval recommendation

**Request Changes** for F-01 through F-04.

After those corrections are applied and reviewed, the consolidated Requirements document is suitable for:

- Requirements approval;
- user story and acceptance-criteria generation;
- NFR Requirements analysis;
- application-design planning.

It is not yet sufficient by itself to authorize Construction implementation.
