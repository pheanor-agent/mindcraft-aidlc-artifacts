# MindCraft 컨셉 정렬 제안서

> 주의: 이 문서의 AI-DLC 단계는 MindCraft를 개발하기 위한 외부 개발 프로세스다.
> MindCraft 제품 런타임의 Task/Episode/Run 상태나 사용자 실행 단계와 동일한 개념이 아니다.

> 상태: 승인 대기 중인 제안서
> 목적: 제품 컨셉, 전체 설계, 구현 우선순위를 하나의 기준으로 정렬
> 범위: INCEPTION 종료 및 CONSTRUCTION 진입 승인

## 1. 제품 한 문장

MindCraft는 하네스 사용법을 별도로 학습하기 어려운 입문자를 위해 **Pi 기반 Agent와 작업 하네스를 하나의 terminal TUI 패키지로 결합한 개인용 AI 작업 시스템**이다.

사용자는 자연어 목표와 작업 범위만 제시하고, MindCraft는 작업의 목표·단계·승인·검증·기억·재개를 일관된 lifecycle로 관리한다.

## 2. 상위 목표

하네스와 Agent를 따로 설치·연결·운영해야 하는 진입 장벽을 제거하고, 입문자도 일관되고 안전하게 장기 작업을 수행할 수 있는 통합 경험을 제공한다.

여기서 핵심은 단순히 Agent를 포장하는 것이 아니라 다음을 제품이 소유하는 것이다.

- 명시적 작업 workflow
- 승인 가능한 실행 범위
- 검증 가능한 결과
- 재사용 가능한 Knowledge
- 중단·복구 가능한 상태

## 3. 일반 목표의 제품화

### 3.1 Workflow 관리

사용자가 매번 절차를 지시하지 않아도 MindCraft가 다음 lifecycle을 일관되게 수행한다.

```text
Task 생성
→ Episode 목표·완료 조건 정의
→ Context 구성
→ Preflight / Approval
→ Agent 실행
→ 결과 검증
→ 결과·산출물 기록
→ Knowledge candidate capture
→ 사용자 review / promote
→ 다음 Episode 또는 완료
```

구현 단위는 다음처럼 분리한다.

- **Task**: 사용자의 장기 목적
- **Episode**: 명확한 목표와 acceptance criteria를 가진 제한된 진전
- **Run**: Episode의 실제 실행 시도

Agent의 완료 응답만으로 작업 완료를 확정하지 않고, 검증 결과와 acceptance criteria를 별도로 확인한다.

### 3.2 Knowledge 관리

대화·작업에서 생성된 정보가 다음 실행에 재사용되도록 하되, 자동 주입과 자동 승격은 제한한다.

```text
candidate capture
→ review
→ promoted revision 또는 rejected
→ 관련 범위에서 Context에 재사용
```

원칙:

- candidate와 사용자 승인된 promoted revision을 구분
- Knowledge는 provenance와 revision을 보존
- 관련성이 낮은 전체 Knowledge를 무차별 주입하지 않음
- stale·철회·rejected Knowledge는 실행 Context에서 제외
- Knowledge 승인은 재사용 승인일 뿐 실행 권한을 만들지 않음

### 3.3 Model 비용·품질 균형

작업 단계와 목적에 따라 적합한 Model을 선택해 품질과 비용을 균형화한다.

MVP에서는 예측 불가능한 자동 fallback이나 과도한 routing을 도입하지 않는다.

- Model과 목적의 명시적 매핑
- 실행 전 선택 Model·provider·비용 가능성 표시
- 사용량은 실제값·추정값·미상으로 구분
- Model unavailable 시 자동 전환하지 않고 사용자 조치 요청
- token-aware switching은 승인 기반 후속 기능으로 둠

## 4. 차별화 포지셔닝

Roo Code, OpenCode, Claude Code와의 차별점은 단순한 Agent 성능 비교가 아니라 **장기 작업을 관리하는 제품 레이어**에 둔다.

MindCraft의 차별화 메시지:

1. Pi Agent를 재구현하지 않고 native execution backend로 활용
2. Agent loop와 장기 Workflow loop를 분리
3. Task / Episode / Run lifecycle과 검증·복구를 제품이 소유
4. Knowledge를 자동 기억이 아니라 review 가능한 revision으로 관리
5. 실행 전·side-effect 직전 승인과 범위 검사를 적용
6. 개인 workspace 안에서 재현 가능한 상태·기록을 유지

외부 Agent를 지원하더라도 초기에는 각 제품의 permission model을 무리하게 통합하지 않는다. 먼저 PiBackend vertical slice를 완성하고, 필요성이 입증될 때 adapter를 추가한다.

## 5. 협업 효과의 정제된 표현

개발 협업에서 MindCraft 자체를 사용하면 프로젝트의 작업 상태·결정·Knowledge·검증 결과를 동일한 workflow와 기록 체계로 관리할 수 있다. 이를 통해 다음 효과를 기대한다.

- 개발자가 매번 전체 맥락을 수동으로 재구성하는 비용 감소
- Task/Episode/Run 단위의 책임과 진행 상태 가시화
- 코드 반영 전 acceptance criteria와 검증 결과 확인
- 동일 workspace writer·journal·checkpoint를 통한 충돌 가능성 감소
- 단, 충돌이 자동으로 제거된다고 주장하지 않고 승인·검증·single-writer 정책으로 위험을 줄인다고 표현

## 6. 정렬된 전체 설계

```text
TUI / CLI
    ↓
MindCraftApp
    ├─ Workflow: Task / Episode / Run / Verification
    ├─ ContextAssembler
    ├─ KnowledgeRepository
    ├─ ExecutionBackend → PiBackend (MVP)
    ├─ Approval + GrantedScope
    └─ WorkflowRepository / Journal

PiBackend / AgentSession
    ↓
공통 side-effect barrier
    ↓
파일·프로세스·외부 동작
```

책임 경계:

- TUI: 입력·표시·승인 조작
- MindCraftApp: use-case orchestration
- Workflow: lifecycle·목표·검증·다음 행동
- ContextAssembler: 목표·Knowledge·workspace·제약·승인 범위 조합
- KnowledgeRepository: 저장·검색·provenance·revision
- PiBackend: AgentSession과 event·취소·결과 변환
- Persistence: journal·replay·복구 기록

MindCraft가 Pi의 agent loop, provider streaming, tool-call loop를 중복 구현하지 않는다.

## 7. 안전·신뢰 기준

모든 파일·프로세스·network·provider 비용 발생 경로는 공통 승인·범위 계약을 통과해야 한다.

- prompt·Knowledge·모델 출력은 scope를 확대할 수 없음
- 승인된 action의 digest가 변경되면 재승인
- 실행 시작과 effect 결과를 구분 기록
- 실행 여부가 불명확한 effect는 `unknown`으로 남기고 자동 재실행하지 않음
- 중단된 Run은 같은 Episode의 새 Run으로 복구
- 일반 shell 실행을 OS sandbox로 표현하지 않음
- credential과 민감 정보는 기록·Context·provenance에 동일한 redaction 적용

## 8. 구현 방향과 우선순위

### Construction 1: 실제 통합 계약 확인

- Pi 실제 버전·AgentSession·tool·extension·session 경로 확인
- side-effect 경계를 우회하는 경로가 없는지 확인
- 취소·늦은 event·session 복원 계약 확인

### Construction 2: 신뢰 가능한 workflow 기반

- approval digest와 effect barrier
- single-writer lock과 append-oriented journal
- 저장 실패 시 새 side effect 중단
- Task / Episode / Run 상태와 interrupted·unknown effect 복구

### Construction 3: Knowledge와 Context

- candidate/promoted revision lifecycle
- provenance·stale index 검증
- capture idempotency와 retry
- Context manifest와 파일 digest

### Construction 4: 입문자 onboarding

- setup_required와 doctor
- mock provider를 통한 deterministic flow
- credential 원문 비노출 경로
- 실행 전 Model·scope·비용 요약

### Construction 5: Windows vertical slice

- clean Windows 설치·실행
- 한글·공백·경로·resize·Ctrl-C·process 종료
- 실제 provider와 핵심 acceptance scenario 검증

### 후속 범위

- OpenCode/Claude Code adapter
- 승인 기반 Model switching
- 장기 실행 backend capability
- 필요성이 입증된 외부 backend 통합

## 9. MVP 비범위

- Graph workflow engine
- 중앙 LLM gateway
- 분산 worker/message broker
- Pi agent loop 재구현
- 자동 multi-backend fallback
- 자동 Knowledge 승격
- 검증되지 않은 OS sandbox 보장
- 팀 공유·중앙 동기화·다중 사용자 권한

## 10. 승인 요청

다음 기준선으로 승인해 주십시오.

1. 위 제품 한 문장과 상위·일반 목표를 MindCraft의 공식 컨셉으로 채택
2. Task / Episode / Run과 Pi Agent loop의 책임 경계 채택
3. Workflow·Knowledge·Context·ExecutionBackend 구조 채택
4. 공통 approval/scope/effect 계약을 신뢰성 기준으로 채택
5. PiBackend 중심 vertical slice를 Construction의 첫 구현 대상으로 승인
6. 위 구현 우선순위와 MVP 비범위를 승인
7. 외부 Agent backend와 자동 Model switching은 후속 범위로 유지

승인 선택:

- **Approve & Continue** — 이 제안서를 기준선으로 채택하고 Construction 구현·검증으로 진행
- **Request Changes** — 수정할 항목 또는 정책 지정
- **Hold** — 추가 논의 후 보류

본 승인 요청은 설계·구현 진행 승인에 한정하며, GitHub push·배포·credential 변경·외부 환경 변경·운영 전환을 승인하지 않는다.
