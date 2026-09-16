# MindCraft — Requirements Verification Answers

- Status: **Answered — Inception decision input**
- Based on:
  - `docs/aidlc/inception/requirements/requirement.md`
  - `docs/aidlc/inception/constraints/constraint.md`
  - Current MindCraft product SSOT and prior AI-DLC review records
- Purpose: answer the six open Inception decisions and three extension questions without changing the original SSOT silently

> The answers below complete the open decision input. They do not by themselves authorize Construction, source-code changes, live provider calls, credential changes, external repository operations, or deployment. The resulting decision set still requires human approval at the AI-DLC gate.

---

## Question 1 — Resume 계약

**[Answer]: A) 같은 Episode + 새 Run**

### 근거 코멘트

- `requirement.md` FR-09는 원본 Run을 보존하면서 traceable한 새 Run을 생성하도록 요구합니다.
- 동일 Episode 아래에 새 Run을 연결하면 장기 목표(Task)와 bounded progress 단위(Episode)를 유지하면서 재시도 이력을 누적할 수 있습니다.
- 원본 Run을 덮어쓰지 않고 `resumedFrom` 또는 동등한 provenance를 보존하는 것을 acceptance 조건으로 둡니다.
- 기존 문서에 새 Episode를 생성하는 reference 구현이 있었지만, 이는 현재 결정의 SSOT가 아니며 Inception에서 확정할 계약으로 남겨져 있었습니다.

**결정 요약:** `Task → 동일 Episode → 원본 Run + 새 resume Run`

---

## Question 2 — Live provider preflight 계약

**[Answer]: A) 명시적 `doctor` 라이브 프리플라이트**

### 근거 코멘트

- `requirement.md` FR-01은 local runtime/storage, model registry, mock readiness, live-provider readiness를 분리해 진단하도록 요구합니다.
- `constraint.md`는 local/mock 진단 성공을 live-provider 성공으로 표현하지 못하도록 제한합니다.
- 따라서 `doctor`는 최소한 credential 존재 여부, provider 도달성, model registry 매핑을 별도 상태로 표시해야 합니다.
- 하나라도 live 실행 조건을 만족하지 못하면 live Run은 사유와 해결 방법을 표시하고 fail-closed해야 합니다.
- Run 시작 시점의 최종 preflight도 유지하되, 명시적인 `doctor`가 사전 진단의 기준 명령입니다.

**결정 요약:** `doctor`의 local/mock/live 상태는 분리하며, live readiness 미충족 시 live 실행을 차단합니다.

---

## Question 3 — Mock/Live 경계

**[Answer]: B) 모드별로 프로세스·워크스페이스까지 분리**

### 근거 코멘트

- 질문지의 A안은 MVP 단순성 측면에서는 매력적이지만, 최초 승인 문서와 기존 검토 기록은 Mock/Live를 기본적으로 별도 process/workspace로 운영하도록 정리되어 있습니다.
- `requirement.md` FR-05는 mode/process/workspace 경계를 명시적으로 요구하고, `constraint.md`는 Mock/Live 격리와 실행 중 자동 전환 금지를 요구합니다.
- 실제 provider 호출과 비용·외부 전송 가능성이 있는 live 환경을 deterministic mock 환경과 같은 workspace에 혼합하지 않는 것이 안전성·재현성에 유리합니다.
- 모드 전환은 새 세션 또는 새 workspace 경계에서 명시적으로 수행하며, 실행 중 provider/mode 전환은 금지합니다.

**결정 요약:** Mock과 Live는 별도 process/workspace로 분리하고, mode 변경은 새 세션/경계에서만 허용합니다.

---

## Question 4 — 워크스페이스 컨텍스트 수집 방식

**[Answer]: A) 명시적 읽기만**

### 근거 코멘트

- `constraint.md`는 execution-root 하위 파일을 기본 범위로 하되, secret-like 파일과 `.mindcraft` control files를 일반 agent context에서 제외하도록 합니다.
- 자동 수집은 의도하지 않은 파일·민감정보·불필요한 context가 포함될 위험을 높입니다.
- `requirement.md` FR-11의 context preview/manifest 요구를 충족하려면 포함되는 모든 source를 사용자가 확인할 수 있어야 합니다.
- 따라서 MVP에서는 명시적 read와 Knowledge reuse만 증거로 사용하고, 자동 workspace ingestion은 별도 요구사항으로 분리합니다.

**결정 요약:** 자동 수집 없이 명시적으로 선택된 파일과 승인된 Knowledge만 context에 포함합니다.

---

## Question 5 — 정량 목표

**[Answer]: A) MVP 실용 기본값 채택**

### 근거 코멘트

- 측정 가능한 목표가 없으면 NFR responsiveness와 recoverability를 검증할 수 없습니다.
- MVP 기준으로 다음 기본값을 채택합니다.
  - TUI 입력 지연: p95 `< 100 ms`
  - streaming event 렌더 지연: p95 `< 250 ms`
  - 복구 성공: 커밋된 checkpoint의 `100%` 복원 및 원본 Run 무결성 유지
  - 검증 매트릭스: CI에서는 offline/mock 검증을 필수화하고, live provider 및 Windows Terminal 검증은 수동 체크리스트로 분리
- 이 수치는 초기 acceptance 기준이며, Construction NFR 단계에서 실제 측정 결과에 따라 조정할 수 있습니다.
- offline/mock 결과를 live provider나 Windows native 동작의 증거로 해석하지 않는다는 제약은 유지합니다.

**결정 요약:** 위 수치를 MVP baseline으로 삼고, 검증 evidence를 offline/mock과 live/Windows로 분리합니다.

---

## Question 6 — MVP 구현 언어/런타임

**[Answer]: B) 순수 JavaScript (ESM)**

### 근거 코멘트

- 최초 문서와 현재 제품 SSOT는 MVP를 Node.js package/CLI로 정의하지만 TypeScript 전환을 승인하지 않았습니다.
- 현재 MindCraft 저장소와 테스트·build 흐름은 JavaScript ESM 기반이며, `npm run build`와 `npm test`가 이 기준선에 맞춰져 있습니다.
- 이 단계에서 TypeScript로 전환하면 구현 언어 변경, build pipeline 변경, type migration이 추가 범위가 됩니다.
- 따라서 MVP는 현재 Node.js ESM 기준을 유지하고, 타입이 필요한 경계는 JSDoc, runtime schema validation, contract test로 보강합니다.
- TypeScript 전환은 별도 변경 제안과 승인 없이는 수행하지 않습니다.

**결정 요약:** MVP는 현재 기준선과 호환되는 Node.js JavaScript ESM으로 진행합니다.

---

## Question 7 — Security Baseline 확장

**[Answer]: A) Yes — enforce all SECURITY rules as blocking constraints**

### 근거 코멘트

- 승인 경계, GrantedScope, fail-closed, secret redaction, execution-root scope가 이미 최초 `constraint.md`의 핵심 제약입니다.
- 이는 선택적 품질 향상 항목이 아니라 MindCraft의 기본 안전 계약입니다.
- 따라서 Security Baseline은 모든 Construction unit에서 blocking constraint로 적용합니다.
- 특히 unapproved side effect, scope escape, credential 노출, self-approval은 테스트 실패 및 진행 차단 사유로 취급합니다.

**결정 요약:** Security Baseline 전체를 필수·차단형 제약으로 활성화합니다.

---

## Question 8 — Property-Based Testing 확장

**[Answer]: B) Partial — pure functions and serialization round-trips**

### 근거 코멘트

- MindCraft에는 model registry validation, path/scope 판단, redaction, 상태 serialization/replay 등 property 검증에 적합한 순수·결정적 로직이 있습니다.
- 반면 provider 호출, TUI, OS process, 실제 filesystem side effect 전체를 PBT blocking 대상으로 확대하면 MVP의 검증 복잡도가 과도하게 증가합니다.
- 따라서 다음 범위에 PBT를 적용합니다.
  - 순수 validation 및 policy 함수
  - path normalization/scope 판정의 invariant
  - redaction 함수
  - state/event serialization 및 replay round-trip
  - model registry mapping invariant
- 외부 provider·TUI·process integration은 deterministic example test와 contract/integration test로 검증합니다.

**결정 요약:** 순수 함수와 serialization/state invariant에는 PBT를 적용하고, 외부 통합 영역에는 적용하지 않습니다.

---

## Question 9 — Resiliency Baseline 확장

**[Answer]: B) No — skip the resiliency baseline as a formal extension**

### 근거 코멘트

- 현재 MVP는 cloud workload나 중앙 운영 서비스가 아니라 local CLI/TUI이며, CI/CD·배포·클라우드 운영은 명시적으로 제외되어 있습니다.
- 따라서 AWS Well-Architected 기반 Resiliency Baseline을 별도 formal extension으로 강제하면 현재 범위를 불필요하게 확장할 수 있습니다.
- 다만 resiliency와 관련된 제품 요구사항은 제거하지 않습니다. checkpoint, recoverable Run, sequential session, stale-lock recovery, fail-closed 오류 처리는 기본 `requirement.md`와 `constraint.md`의 필수 범위로 유지합니다.
- 이후 중앙 서비스, remote execution, business-critical deployment 범위가 승인되면 Resiliency Baseline을 별도 재검토합니다.

**결정 요약:** 공식 Resiliency extension은 MVP에서 비활성화하되, 로컬 제품의 recovery/safety 요구사항은 그대로 적용합니다.

---

# Consolidated decision table

| Question | Answer | Decision |
|---|---|---|
| Q1 | A | Same Episode + new Run |
| Q2 | A | Explicit `doctor` live preflight; fail-closed |
| Q3 | B | Separate Mock/Live process and workspace |
| Q4 | A | Explicit reads only |
| Q5 | A | p95 100/250 ms, 100% committed-checkpoint recovery, separated verification matrix |
| Q6 | B | Node.js JavaScript ESM for MVP |
| Q7 | A | Security Baseline blocking constraints |
| Q8 | B | Partial PBT for pure functions and serialization/invariants |
| Q9 | B | No formal Resiliency extension; retain product recovery requirements |

## Approval note

These answers are the proposed completion of the open Inception decisions. Please approve this decision set before Construction planning begins. Until approval, the project remains at the Inception gate and no implementation or external side effect is authorized.
