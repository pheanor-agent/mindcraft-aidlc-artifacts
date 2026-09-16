# MindCraft 설계 및 배경 자료 통합본

> 문서 목적: MindCraft의 제품 배경, 핵심 요구사항, 현재 확정 설계, 실행 workflow, Knowledge, 안전성, 첫 실행 onboarding 및 후속 계획을 한 파일에서 검토할 수 있도록 통합한다.
>
> 범위: 현재 팀에서 공유·검토된 제품 설계와 구현 기준
>
> 보안: credential, token, 개인 정보, 내부 인증 경로 및 비공개 실행 정보는 포함하지 않는다.

---

## 1. 한눈에 보는 결론

MindCraft는 별도의 agent 프로그램과 harness를 각각 설치·연결하기 어려운 사용자를 위한 **Pi 기반 terminal TUI AI 작업 프로그램**이다.

사용자는 실행 파일 하나로 진입하고, MindCraft는 다음을 내부적으로 수행한다.

```text
mindcraft 실행
→ 환경·Model preflight
→ 첫 실행 setup 또는 기존 상태 복원
→ Task 생성
→ Episode 목표 정의
→ 승인된 Knowledge와 workspace context 구성
→ Pi AgentSession을 통한 실행
→ 검증
→ 결과·산출물·provenance 저장
→ Knowledge candidate 생성
→ 사용자 review/promote
→ 다음 Episode/Run에서 재사용
```

MindCraft의 장기 작업 관리와 승인·검증·Knowledge·복구는 MindCraft가 소유한다. 한 번의 실제 agent loop와 provider/model 호출은 Pi가 소유한다.

MindCraft는 중앙 LLM gateway, 팀 공유 SaaS, IDE 대체 제품, AI-DLC runtime engine이 아니다.

---

## 2. 설계 배경

### 2.1 해결하려는 문제

- agent와 harness를 별도로 설치·연결하기 어렵다.
- 개발 환경에 익숙하지 않은 사용자에게 초기 설정 장벽이 높다.
- 코드·문서 분석과 결과 가공을 반복하기 어렵다.
- 이전 작업 결과와 교훈이 다음 작업으로 안전하게 이어지지 않는다.
- 파일·명령 실행 범위를 통제하기 어렵다.
- 장시간 작업이 중단되었을 때 상태와 재개 지점을 잃기 쉽다.

### 2.2 주요 사용자와 환경

- 개인 사용자
- Windows Terminal 사용자
- 개발자 또는 문서 작업자
- 별도 agent/harness 설치·연결을 최소화하려는 사용자

1차 제품 interface 대상은 Windows Terminal 또는 호환 terminal이다. Linux/WSL/macOS는 compatibility 검토 대상이며, Windows native UX는 별도 환경에서 검증한다.

### 2.3 제품의 핵심 사용 사례

- 코드 분석 및 정리
- 문서 분석·요약
- 목적에 맞는 문서 생성·가공
- 반복 작업 실행
- 이전 산출물과 Knowledge 재사용
- 승인 기반 파일·명령 작업
- 중단된 작업의 안전한 resume

---

## 3. 제품 경계

### 포함

- terminal TUI와 `MindCraftApp`
- Task / Episode / ExecutionRun lifecycle
- Episode loop와 검증
- ContextAssembler
- Knowledge 저장·검색·provenance·candidate review
- Pi AgentSession integration
- 실행 backend 경계
- ApprovalRequest와 GrantedScope
- checkpoint, pause, cancel, resume
- 결과·산출물·실행 상태 표시
- 첫 실행 onboarding

### 제외

- 중앙 LLM proxy 또는 inbound API gateway
- Graph/DAG 기반 workflow engine
- 분산 worker platform 또는 microservice 분리
- MVP의 자동 multi-backend routing/fallback
- 생성 Knowledge의 자동 canonical 승격
- Pi agent loop 재구현
- GitHub private repository 생성·push·배포
- 무승인 shell 실행
- 팀 공유·중앙 동기화·다중 사용자 권한

Git repository 운영과 agent bridge는 제품 runtime이 아니라 개발 환경 운영 수단이다.

---

## 4. 핵심 설계 원칙

1. **Episode loop 우선**: 복잡한 graph보다 실행 → 검증 → feedback → 다음 Episode 구조를 기본으로 한다.
2. **Human approval**: AI가 자기 작업을 승인하지 않는다.
3. **검증 우선**: 결과와 산출물을 검증하고 실패하면 feedback을 반영해 다음 loop로 재진입한다.
4. **출처 보존**: Knowledge와 외부 자료는 source/provenance를 보존한다.
5. **책임 분리**: Workflow, Context, Knowledge, Execution, TUI, persistence를 분리한다.
6. **Pi 경계 유지**: MindCraft workflow loop와 Pi 내부 agent loop를 중복 구현하지 않는다.
7. **안전한 중단**: timeout, provider 장애, 승인 대기, context 부족에서도 상태를 보존한다.
8. **fail-closed**: 승인·범위·경로 검증에 실패하면 side effect를 실행하지 않는다.
9. **민감정보 보호**: credential/token/개인정보를 로그·문서·Knowledge에 노출하지 않는다.
10. **작게 시작**: Pi 기반 Core Vertical Slice를 먼저 완성하고 외부 backend는 후속 adapter로 둔다.

---

## 5. 현재 권장 아키텍처

```text
MindCraft
│
├─ TUI
│   └─ 사용자 입력 / 상태 / 승인 / diff / context 확인
│
├─ App
│   └─ MindCraftApp
│       └─ 제품 use-case orchestration
│
├─ Workflow
│   ├─ Task
│   ├─ Episode
│   ├─ ExecutionRun
│   ├─ Checkpoint
│   ├─ ApprovalRequest
│   └─ VerificationReport
│
├─ Context
│   └─ ContextAssembler
│
├─ Knowledge
│   ├─ Vault / JSONL persistence
│   ├─ Retrieval
│   ├─ Index
│   └─ Provenance
│
├─ Execution
│   ├─ ExecutionBackend
│   ├─ PiBackend
│   ├─ OpenCodeBackend (후속)
│   └─ ClaudeCodeBackend (후속)
│
└─ Infra
    ├─ WorkflowRepository
    ├─ ProcessRunner
    ├─ SecretResolver
    └─ Filesystem boundary
```

TUI는 core module을 직접 조율하지 않고 `MindCraftApp` facade를 통해 접근한다.

### 5.1 MindCraft와 Pi의 책임

| 구분 | MindCraft | Pi |
|---|---|---|
| 장기 작업 | Task, Episode, Run | 해당 없음 |
| workflow | 목표, 승인, 검증, checkpoint, resume | 해당 없음 |
| Knowledge | 저장, 검색, lifecycle, provenance | context 입력을 받음 |
| 실행 | backend 선택과 실행 경계 | 한 번의 agent/model-tool loop |
| session | MindCraft 실행 상태 | AgentSession 내부 상태 |
| 안전성 | GrantedScope, approval, redaction | Pi native tool/session 동작 |

---

## 6. Workflow 설계

### 6.1 개념 loop

```text
observe
→ plan
→ ask-if-needed
→ act
→ verify
→ feedback
→ gate
→ repeat 또는 done
```

실제 상태 machine은 과도하게 세분화하지 않고 다음처럼 단순화한다.

```text
load
→ define episode goal
→ assemble context
→ preflight / approval
→ execute
→ verify
→ record outcome
→ done / next / waiting / blocked
```

`ask-if-needed`는 별도 실행 단계가 아니라 `waiting_for_user_input` 결과 상태로 기록한다.

### 6.2 상태 모델

```text
Task:    active → completed | cancelled
Episode: queued → running → completed | failed | aborted
Run:     queued → running → completed | failed | aborted
         running (restart) → recoverable → resumed
```

Resume은 기존 Run을 덮어쓰지 않는다. 기존 Run은 `resumed`로 기록하고 새 Episode/Run을 생성한다.

### 6.3 일반 실행 순서

1. CLI/TUI가 App을 생성한다.
2. preflight에서 Node, storage, Model, provider 상태를 확인한다.
3. state journal과 Knowledge를 load한다.
4. 이전 `running` Run을 `recoverable`로 표시한다.
5. Task를 생성하고 영속화한다.
6. Episode 목표와 종료 조건을 만든다.
7. 승인된 Knowledge와 workspace 자료로 context를 구성한다.
8. Model/purpose와 실행 범위를 확인한다.
9. Pi AgentSession을 생성한다.
10. prompt를 전달하고 event를 streaming 표시한다.
11. 결과를 검증한다.
12. Run/Episode 결과와 산출물 metadata를 저장한다.
13. redacted Knowledge candidate를 capture한다.
14. 사용자가 candidate를 promote/reject한다.
15. 다음 Run에서 promoted Knowledge를 bounded context로 재사용한다.

---

## 7. 첫 실행 onboarding 설계

### 7.1 사용자 경험 목표

첫 사용자가 별도 설정 명령과 문서를 오가지 않고 실행 파일 하나로 TUI에 진입해 필수 설정을 완료해야 한다.

Model이 없는 상태는 오류로 종료하는 대신 **설정이 필요한 정상적인 첫 실행 상태**로 취급한다.

### 7.2 첫 실행 흐름

```text
mindcraft
→ First run 안내
→ setup mock deterministic       (오프라인 리허설)
   또는 setup airouter <model>    (실제 provider)
→ doctor
→ task <목표>
→ run <요청>
→ approval / 검증 / 저장
→ knowledge / promote
→ 두 번째 run에서 context 재사용
```

TUI에 표시되는 주요 명령:

```text
setup <provider> <model> [purpose]
doctor
task <title>
run <prompt>
approvals
approve <id>
reject <id>
status
history
runs
resume <run-id>
cancel <run-id>
knowledge [query]
promote <id>
reject-knowledge <id>
quit
```

### 7.3 setup 정책

- 설정은 `.mindcraft/config.json`에 저장한다.
- credential 자체는 받거나 저장하지 않는다.
- provider와 model은 사용자가 명시한다.
- setup 완료 직후 같은 프로세스에서 preflight와 runtime을 갱신한다.
- `mock deterministic`은 네트워크 없이 테스트·리허설만 수행한다.
- 실제 provider 호출과 Windows Terminal 검증은 mock 결과로 대체하지 않는다.
- Model 0개는 실행을 차단한다.
- 자동 Model 탐색·임의 fallback은 하지 않는다.

---

## 8. Model 및 Execution Backend 정책

### 8.1 현재 Model 정책

| 설정 | 정책 |
|---|---|
| Model 0개 | 설정 오류, 실행 차단 |
| Model 1개 | 모든 용도에 사용 |
| Model 2개 | 서로 다른 purpose에 하나씩 매핑 |
| 동일 purpose 2개 이상 | 설정 오류 |
| 지정 Model unavailable | 자동 대체 없이 오류·중단 |
| 실행 중 자동 switching | 현재 미구현 |

Model selection은 Episode 시작 시 한 번 수행하며 실행 전 selected model, purpose, availability, cost estimate/unknown을 기록한다.

### 8.2 ExecutionBackend 계약

```ts
interface ExecutionBackend {
  readonly id: BackendId;
  probe(): Promise<BackendInfo>;
  execute(
    request: ExecutionRequest,
    options: ExecutionOptions
  ): Promise<ExecutionResult>;
}
```

PiBackend는 MVP의 첫 backend다. OpenCode와 Claude Code는 각각 native permission과 agent loop를 가진 외부 backend로 취급하며, Pi 내부에 중첩해 재구현하지 않는다.

### 8.3 후속 Token Switching

Token-aware dynamic switching은 현재 기능이 아니다. 후속 검토 시 다음 신호를 사용한다.

- context 크기와 truncation
- prompt 복잡도
- 작업 목적과 위험도
- token budget
- 검증 실패와 retry
- tool 호출량

초기 방식은 자동 전환이 아니라 사용자 승인 기반 제안이다. 실제 사용량과 추정값은 `actual`과 `estimate`를 명확히 구분한다.

---

## 9. Context와 Knowledge 설계

### 9.1 ContextPackage

```text
ContextPackage
├─ episode goal
├─ relevant promoted Knowledge refs
├─ required files/paths
├─ previous feedback
├─ constraints
└─ approval scope
```

전체 vault를 무조건 prompt에 넣지 않고 실행 직전에 bounded slice를 생성한다.

### 9.2 Knowledge lifecycle

```text
capture candidate
→ review
→ promoted 또는 rejected
→ 필요 시 archive/quarantine/conflict 처리
```

captured candidate는 자동으로 실행 context에 들어가지 않는다. `promoted` 상태인 Knowledge만 사용한다.

### 9.3 Retrieval fallback

```text
관련 promoted Knowledge
→ 전체 promoted Knowledge
→ 허용된 execution workspace 자료
```

workspace fallback에서도 다음을 제외한다.

- `.mindcraft` 내부 제어 파일
- credential/secret 의심 파일
- binary
- vendor/generated 대형 자료
- execution root 외부 파일

각 Run에는 item ID/revision 또는 file digest, 순서, 길이, 제외 사유를 manifest로 남긴다.

### 9.4 Provenance

Knowledge item은 최소한 다음 정보를 보존한다.

- Task/Episode/Run reference
- source와 source URI
- capturedAt
- raw data reference
- derived content metadata
- review state
- revision/confidence/score

검색과 context 구성은 relevance/similarity를 우선하고, 결과가 부족하면 정의된 fallback으로 확장한다.

---

## 10. 안전성·승인·복구

### 10.1 파일과 명령 정책

- execution folder 내부 파일: 기본 scope
- execution folder 외부 파일: 사용자 승인 필요
- shell command: 사용자 승인 필요
- network 또는 비용 발생 동작: 사용자 승인 필요
- 모든 decision과 결과: Run history/audit에 기록

custom tool은 `GrantedScope`를 먼저 통과해야 하며, 경로 traversal과 symlink escape를 차단한다.

### 10.2 Side-effect barrier

```text
approval_pending
→ approved
→ execution_started
→ executed | failed | unknown
```

결정 기록과 `execution_started` 기록이 각각 성공한 뒤에만 실제 side effect를 실행한다.

effect 이후 결과 저장이 실패하거나 실행 여부가 확정되지 않으면 `unknown`으로 표시한다. `unknown` effect는 자동 재실행하지 않는다.

### 10.3 영속성

- state와 Knowledge는 append-oriented JSONL로 저장한다.
- record checksum으로 손상 여부를 확인한다.
- 손상된 tail 이후는 replay하지 않는다.
- repair 전 원본을 보존한다.
- 저장 실패는 호출자에게 전파한다.
- 단일 MindCraft 프로세스가 writer를 소유한다.

경로:

```text
.mindcraft/config.json
.mindcraft/state.jsonl
.mindcraft/knowledge.jsonl
```

### 10.4 복구

- preflight 실패: Run을 만들지 않고 조치 가능한 오류를 표시
- session 생성 실패: Run/Episode를 failed로 저장
- prompt/idle 실패: failed 또는 aborted로 저장
- process restart: running Run을 recoverable로 표시
- resume: 새 Run ID를 생성하고 `resumedFrom`을 기록
- 강제 종료 후 effect 불확실: unknown 및 사용자 확인 필요

---

## 11. AI-DLC와 개발 프로세스의 관계

AI-DLC는 MindCraft runtime이 아니라 **MindCraft를 개발·검증하는 governance workflow**로 사용한다.

```text
INCEPTION
→ 요구사항·배경·범위·설계·계획·승인

CONSTRUCTION
→ Unit별 상세설계·구현계획·코드·테스트·리뷰

OPERATIONS
→ 현재 pilot 범위 밖의 placeholder
```

각 단계의 결정, 요구사항, 계획, 리뷰, 상태, audit 기록은 Markdown 산출물로 보존한다. 단계 전환과 외부 side effect에는 human approval이 필요하다.

현재 구현 우선순위:

1. Pi 기반 Core Vertical Slice
2. persistence와 recovery
3. approval/safety boundary
4. Knowledge lifecycle과 bounded context
5. TUI onboarding 및 반복 실행 UX
6. Windows Terminal native 검증
7. 후속 external backend adapter

---

## 12. 현재 구현 및 검증 상태

### 구현된 기준선

- Pi 기반 terminal TUI
- 공통 command dispatcher와 CommandQueue
- Task/Episode/Run 영속 상태
- preflight와 Model routing
- approval-gated custom tools
- path/symlink safety
- Knowledge candidate capture/promote/reuse
- recovery/resume/cancel
- deterministic mock rehearsal
- 첫 실행 `setup` onboarding vertical slice

### 이번 onboarding 변경의 산출물

- `src/cli.mjs`
- `src/command-queue.mjs`
- `src/tui-runner.mjs`
- `src/mindcraft-app.mjs`
- `test/first-run-onboarding.test.mjs`
- `docs/first-run-onboarding-design.md`
- `docs/first-run-onboarding-approval-request.md`

### 로컬 검증

```text
npm run build          PASS
npm test               PASS — 117/117
npm run release:check  PASS
npm audit --audit-level=high
                       PASS — 0 vulnerabilities
```

임시 workspace에서 다음 흐름도 실행했다.

```text
setup mock deterministic → doctor → task → run → status → quit
```

### 미검증 또는 후속 검증

현재 실행 환경에 Windows/Windows Terminal/WSL native 환경이 없어 다음은 별도 검증이 필요하다.

- 한글 입력
- 색상·줄바꿈·resize
- Ctrl-C와 terminal 복원
- 긴 streaming output
- Windows/WSL/Linux 경로 경계
- clean checkout 후 Windows 3회 반복 본편

mock 결과는 위 native 검증의 증거로 간주하지 않는다.

---

## 13. 승인 요청

이번 통합 설계와 첫 실행 onboarding vertical slice에 대해 다음 중 하나를 선택한다.

- **Approve & Continue**: 현재 설계와 onboarding을 기준선으로 채택하고 Windows Terminal UX 및 반복 실행 검증을 진행
- **Request Changes**: 수정할 정책·UX·범위를 명시
- **Hold**: 추가 제품·Model 정책 결정 전 보류

이번 승인 범위는 로컬 제품 코드·문서·테스트에 한정한다. GitHub push, 배포, credential 변경, 외부 환경 변경은 별도 승인이 필요하다.

---

## 14. 참조한 공유 자료

- MindCraft 제품 brief 및 constraints
- 현재 `DESIGN.md`
- 현재 Model 정책 `ROUTING.md`
- MindCraft AI-DLC requirements
- MindCraft 전체 설계·배경 자료
- workflow/persistence/recovery/Knowledge review addenda
- Phase 0~6 demo plan 및 release rehearsal 기록

이 파일은 위 자료의 공개 가능한 설계·배경·결정 내용을 검토용으로 통합한 문서이며, credential·개인정보·내부 인증 정보는 의도적으로 제외했다.
