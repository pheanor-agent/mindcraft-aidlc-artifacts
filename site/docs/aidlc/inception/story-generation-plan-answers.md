# Story Generation Plan — Answers and Rationale

- Status: **Answered — ready for Story Generation approval**
- Basis: approved MindCraft Requirements rev.3, original requirements/constraints SSOT, and resolved decisions D1–D6
- Purpose: determine personas, story breakdown, granularity, acceptance format, MVP labeling, and cross-cutting concern treatment before generating `personas.md` and `stories.md`

> These answers authorize planning decisions for Story Generation only. They do not authorize implementation, live provider calls, credential changes, external repository operations, or deployment.

---

## Question 1 — Personas 범위

**[Answer]: B) 개인 개발자 + 소규모 팀 구성원(순차 세션·검토 관점 포함)**

### 근거 코멘트

- Requirements의 1차 사용자는 개인 개발자 또는 소규모 팀 구성원입니다.
- MVP는 중앙 팀 계정·동시 협업을 지원하지 않지만, 소규모 팀 구성원이 순차적으로 workspace를 이어받고 결과를 검토하는 관점은 FR-08의 sequential multi-session과 직접 연결됩니다.
- C안의 별도 보안/감사 리뷰어는 현재 MVP의 primary user 범위를 불필요하게 확장할 수 있으므로 독립 persona로 만들지 않습니다.
- 다만 approval, audit, redaction 요구사항은 팀 구성원 persona의 review scenario와 횡단 관심사 story group에서 추적합니다.

**결정:** 두 persona를 사용합니다.

1. Individual Developer — 작업 생성·실행·복구의 주 사용자
2. Small-Team Contributor — 순차 session continuation, history review, handoff 관점의 사용자

---

## Question 2 — Story 분해 방식

**[Answer]: A) Feature-Based — FR-01..12 능력 단위로 구성**

### 근거 코멘트

- 현재 Requirements는 FR-01부터 FR-12까지 기능 단위로 명확히 식별되어 있습니다.
- Feature-Based 분해는 각 story를 FR/NFR/decision ID와 직접 매핑하기 쉽고, 누락·중복 검토가 용이합니다.
- User Journey는 acceptance flow와 예시 시나리오에서 보조적으로 사용하고, Domain은 story group 또는 epic 분류로 활용합니다.
- 따라서 기본 구조는 Feature-Based epic, 각 story의 acceptance는 Journey/Gherkin 흐름으로 구성합니다.

**결정:** Feature-Based를 기본으로 하고 acceptance criteria에서는 Journey 흐름을 사용합니다.

---

## Question 3 — Story 세분화(granularity)

**[Answer]: B) 중간 세분화 — 주요 시나리오/수용 흐름별 분리(총 약 20~30개)**

### 근거 코멘트

- FR 하나당 하나의 coarse story만 만들면 FR-03 streaming/cancel, FR-05 mode isolation, FR-08 session/lock, FR-09 resume처럼 서로 다른 acceptance 흐름이 한 story에 과도하게 묶입니다.
- 반대로 acceptance criterion마다 story를 만들면 implementation detail에 가까워지고 관리 비용이 커집니다.
- 20~30개 수준은 INVEST의 Small/Testable 기준과 FR traceability를 함께 유지하기 적절합니다.
- 한 story는 하나의 사용자 가치와 하나의 독립적인 acceptance 흐름을 가져야 하며, 단순한 내부 함수나 단일 UI label은 독립 story로 만들지 않습니다.

**분해 규칙:**

- 하나의 story가 서로 다른 사용자 가치나 승인 경계를 동시에 요구하면 분리
- 독립적으로 검증할 수 없는 내부 기술 단계는 같은 story에 유지
- P0 story는 우선 작성하고 P1 story는 deferred/in-MVP label과 함께 작성
- Security/PBT/recovery invariant는 관련 기능 story와 cross-cutting story에 중복 추적 가능

---

## Question 4 — 수용 기준(Acceptance Criteria) 형식

**[Answer]: A) Given/When/Then (Gherkin 스타일)**

### 근거 코멘트

- Mock/offline 검증, approval gate, model registry validation, scope enforcement, session recovery처럼 상태 전이가 많은 요구사항에 적합합니다.
- Given/When/Then은 사용자 행동·시스템 상태·기대 결과를 분리하므로 자동화 테스트와 수동 checklist를 연결하기 쉽습니다.
- 각 story에는 정상 흐름뿐 아니라 fail-closed, redaction, permission denial, interruption/recovery 등 부정 흐름을 포함합니다.
- 성능 수치나 PBT 같은 횡단 요구사항은 Gherkin scenario와 별도의 Evidence/Measurement 필드를 병행합니다.

**기본 형식:**

```gherkin
Given <precondition and scope>
When <user action or system event>
Then <observable result and persisted evidence>
And <safety/audit invariant if applicable>
```

---

## Question 5 — MVP 스코프 경계(P0 vs P1)

**[Answer]: B) P0 + P1 모두 스토리로 작성하되 각 스토리에 in-MVP/deferred 라벨 부여**

### 근거 코멘트

- Requirements의 SSOT §7은 모든 승인 요구사항을 user story, acceptance criterion, design component, implementation unit, verification result에 연결하도록 합니다.
- P1인 Knowledge, context preview, install/update diagnostics를 단순히 제외하면 추적성이 끊기고 향후 재논의 시 문맥이 사라집니다.
- 다만 모든 story를 in-MVP로 간주하면 MVP 범위가 부풀려집니다.
- 따라서 각 story에 다음 metadata를 부여합니다.

```text
Scope: in-MVP | deferred
Priority: P0 | P1
Status: proposed | approved | implemented | verified
```

- P0은 MVP construction candidate로 우선 계획합니다.
- P1은 story와 acceptance를 작성하되 `deferred`로 표시하고, MVP construction unit에 자동 포함하지 않습니다.
- P1을 in-MVP로 승격하려면 별도 scope decision과 approval이 필요합니다.

---

## Question 6 — 비기능/안전 요구의 스토리화

**[Answer]: B) 횡단 관심사를 별도의 안전/감사/복구 스토리 그룹으로 명시 + 기능 스토리 수용 기준에도 반영**

### 근거 코멘트

- fail-closed, no self-approval, secret redaction, execution-root scope, checkpoint integrity, session lock은 특정 기능 하나에만 속하지 않습니다.
- 기능 story acceptance에 해당 안전 조건을 반영하지 않으면 구현 단계에서 누락될 수 있습니다.
- 반대로 기능 story에만 흩어 놓으면 전체 안전 계약을 한 번에 검토하기 어렵습니다.
- 따라서 별도의 cross-cutting story group을 만들고, 각 관련 기능 story에는 적용되는 invariant를 다시 명시합니다.

**Cross-cutting story group 예시:**

- Safety & Approval — fail-closed, no self-approval, GrantedScope, execution-root boundary
- Audit & Privacy — redaction, credential non-persistence, provenance, immutable history
- Recovery & Session — checkpoint integrity, resume linkage, sequential session, stale-lock handling
- Verification & Quality — offline/mock evidence boundary, PBT subset, quantitative measurement evidence

**Extension 적용:**

- Security Baseline: blocking acceptance criteria
- Partial PBT: 순수 함수·serialization·state invariant story에 적용
- Resiliency extension: 별도 formal story로 만들지 않되 Recovery 요구사항은 필수 기능 story로 유지

---

# Consolidated decision table

| Question | Answer | Result |
|---|---|---|
| Q1 | B | Individual Developer + Small-Team Contributor |
| Q2 | A | Feature-Based, Journey-based acceptance 보조 |
| Q3 | B | Medium granularity, 약 20–30 stories |
| Q4 | A | Given/When/Then |
| Q5 | B | P0/P1 모두 작성, in-MVP/deferred label |
| Q6 | B | Cross-cutting groups + feature-story acceptance 반영 |

## Generation constraints

When generating `personas.md` and `stories.md`:

1. Do not introduce requirements that are absent from the approved Requirements or Constraints.
2. Do not turn deferred P1 stories into MVP implementation scope.
3. Map every story to FR/NFR/decision IDs.
4. Include negative/fail-closed acceptance scenarios for safety-sensitive stories.
5. Preserve the distinction between AI-DLC process artifacts and MindCraft runtime behavior.
6. Record unresolved story-level assumptions instead of inventing product behavior.

## Next approval gate

After approval of these six planning answers, generate:

- `personas.md`
- `stories.md`

The generated stories remain planning artifacts. Application Design and Construction require their own later approval gates.
