# MindCraft 설계 및 배경 자료 통합본 — Revision 1

> 기준 원본: `docs/mindcraft-design-and-background-bundle.md`
>
> 보완 검토: `mindcraft-design-review-and-revision1.md`
>
> 상태: **검토·승인 대기 중인 보완 기준선**
>
> 주의: 이 문서는 설계 계약을 보완한 문서다. 코드·Pi 실제 API·Windows native 환경의 사실은 별도 실행 검증 없이는 확정하지 않는다.

---

## 1. 제품 정의와 배경

MindCraft는 별도의 agent 프로그램과 harness를 각각 설치·연결하기 어려운 사용자를 위한 **Pi 기반 terminal TUI AI 작업 시스템**이다.

주요 문제:

- 초기 agent/harness 설치와 연결이 어렵다.
- 코드·문서 분석 및 결과 가공을 반복하기 어렵다.
- 결과·교훈·Knowledge가 다음 작업으로 안전하게 이어지지 않는다.
- 파일·명령·외부 동작의 범위를 통제하기 어렵다.
- 장시간 작업 중단 후 상태와 재개 지점을 잃기 쉽다.

핵심 사용자 흐름:

```text
mindcraft 실행
→ 환경·Model preflight
→ 첫 실행 setup 또는 기존 상태 복원
→ Task 생성
→ Episode 목표·완료 조건 정의
→ 승인된 context 구성
→ Pi AgentSession 실행
→ 결과 및 acceptance criteria 검증
→ Run/Episode 결과·산출물 저장
→ Knowledge candidate capture
→ 사용자 review/promote
→ 다음 Run에서 승인된 revision 재사용
```

제품의 1차 interface는 Windows Terminal 또는 호환 terminal TUI다. 개인용 제품이며 팀 공유, 중앙 동기화, 다중 사용자 권한, 중앙 LLM gateway는 범위 밖이다.

---

## 2. 유지할 핵심 방향

다음 방향은 유지한다.

- MindCraft가 장기 Task/Episode/Run lifecycle을 소유한다.
- Pi가 한 번의 agent/model-tool loop를 소유한다.
- Graph/DAG 대신 bounded Episode loop를 사용한다.
- 명시적 Model 선택을 사용하고 자동 fallback을 하지 않는다.
- Knowledge는 candidate와 사용자 승인된 promoted revision을 구분한다.
- 상태는 단일 workspace writer와 append-oriented journal로 보존한다.
- 실행 결과와 Knowledge capture는 분리한다.
- AI-DLC는 제품 runtime이 아니라 개발 governance process다.
- 외부 backend와 자동 routing은 실제 필요와 계약이 확인된 후 추가한다.

도입하지 않는다.

- Graph workflow engine
- 중앙 gateway
- 분산 worker/message broker
- Pi agent loop 재구현
- 검증되지 않은 OpenCode/Claude Code 공통 프레임워크
- 자동 multi-backend fallback
- 분산 트랜잭션
- 자동 Knowledge 승격
- 근거 없는 sandbox/보안 격리 주장

---

## 3. 전체 구조와 책임 경계

```text
TUI / CLI
    ↓
MindCraftApp
    ├─ Workflow: Task / Episode / Run / Verification
    ├─ ContextAssembler
    ├─ KnowledgeRepository
    ├─ ExecutionBackend → PiBackend / 후속 adapter
    ├─ Approval + GrantedScope
    └─ WorkflowRepository

PiBackend / AgentSession
    ↓
공통 승인·범위 검사
    ↓
파일·프로세스·외부 동작
```

### 책임 규칙

- TUI는 입력과 표시만 담당하며 상태를 직접 확정하지 않는다.
- MindCraftApp은 use-case 진입점이지만 세부 path 검사·저장·Pi API를 모두 흡수하는 거대 객체로 확장하지 않는다.
- Workflow는 목표, acceptance criteria, 시도, 검증, 다음 행동을 결정한다.
- PiBackend는 AgentSession, prompt/event 변환, cancel/dispose 연결만 담당한다.
- Pi와 모델 출력은 권한을 생성하거나 scope를 확대할 수 없다.
- persistence는 기록과 replay를 담당하며 외부 동작을 자동 재실행하지 않는다.
- AI-DLC 기록은 제품의 runtime approval 상태를 대신하지 않는다.

### Pi 통합 전제

아래는 특정 Pi API가 존재한다는 주장이 아니라 구현 시 확인해야 할 계약이다.

- 파일·shell·extension·native tool의 모든 side effect 경로가 공통 경계를 우회하지 않아야 한다.
- session 자동 복원으로 이전 scope·Knowledge·tool 설정이 몰래 적용되지 않아야 한다.
- context compaction 뒤에도 권한 검사는 prompt 밖에서 계속 유효해야 한다.
- 늦은 event는 Run ID로 식별하고 종료된 Run의 상태를 되돌리지 않아야 한다.
- provider 취소와 실행 중 subprocess 취소를 구분해야 한다.
- 계약을 만족하지 못하는 도구는 MVP에서 비활성화하거나 제한 모드로 둔다.

---

## 4. Workflow와 상태 계약

### 4.1 개념 loop

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

구현 상태는 다음처럼 단순화한다.

```text
load
→ define goal
→ assemble context
→ preflight / approval
→ execute
→ verify
→ record outcome
→ done / next / waiting / blocked
```

### 4.2 객체 의미

- **Task**: 사용자의 장기 목적
- **Episode**: 고정된 목표와 acceptance criteria
- **Run**: 해당 Episode를 수행하는 한 번의 실행 시도

실행이 끝났다는 사실과 목표가 달성됐다는 사실을 분리한다. 모델의 완료 응답만으로 Episode나 Task를 완료 처리하지 않는다.

### 4.3 상태

```text
Task:    active → completed | cancelled
Episode: queued → running → completed | failed | aborted
Run:     queued → running → completed | failed | aborted | interrupted
         interrupted → recoverability 판정 → 같은 Episode의 새 Run
```

보조 정보:

- Run: `stopReason`, `waitingReason`, `resumedFrom`
- ApprovalRequest: `pending`, `approved`, `rejected`, `expired`
- Effect: `prepared`, `started`, `executed`, `failed`, `unknown`

`resumed`를 정상적인 Run lifecycle 종료 상태로 사용하지 않는다. Resume은 같은 Episode에 새 Run을 만들고 이전 시도를 `resumedFrom`으로 연결한다. 목표나 acceptance criteria가 실제로 변경될 때만 새 Episode를 만든다.

### 4.4 복구

1. writer lock과 journal 무결성·schema를 확인한다.
2. 종료 기록이 없는 Run을 `interrupted`로 기록한다.
3. `started` 이후 결과가 없는 effect는 `unknown`으로 분류한다.
4. unknown effect는 자동 재실행하지 않고 read-only 확인 또는 사용자 확인을 요청한다.
5. 같은 Episode에 새 Run을 만들고 파일 digest, Model, scope, 승인 상태를 재평가한다.
6. 새 Pi session에 목표, 검증 결과, 확인된 산출물만 전달한다. 과거 tool call을 통째로 자동 재생하지 않는다.

---

## 5. 승인·범위·실행 계약

### 5.1 공통 side-effect barrier

```text
approval_pending
→ approved
→ execution_started
→ executed | failed | unknown
```

모든 파일·프로세스·network·provider 비용 발생 경로가 동일한 정책을 거쳐야 한다. custom tool만 검사한다는 설명으로 native tool, extension, subprocess까지 통제되었다고 주장하지 않는다.

실행 절차:

1. action을 정규화한다.
2. 현재 유효한 GrantedScope와 비교한다.
3. 필요한 경우 immutable ApprovalRequest를 저장한다.
4. 사용자 결정과 action digest를 durable하게 저장한다.
5. 실행 직전에 경로·입력·취소·승인 유효성을 다시 검사한다.
6. `execution_started`를 저장한 뒤 effect를 시작한다.
7. 결과를 저장한다. 실행 여부가 불명확하면 `unknown`으로 남긴다.

Prompt, Knowledge, 모델 출력은 scope를 확대할 수 없다. 승인된 action 내용이 변경되면 재승인한다.

### 5.2 권한 구분

- execution root 밖 파일: 승인 필요
- shell/external process: 구체적인 executable·args·cwd를 표시하고 승인
- provider 선택: Model, provider, 전송 범위와 비용 가능성을 설명
- Knowledge promote: 지식 재사용 승인일 뿐 실행·외부 전송 권한을 만들지 않음
- 기본 scope에 허용된 동작은 매번 질문하지 않고 기존 grant를 참조
- pending 승인에 대한 늦거나 중복된 결정은 무효화

일반 shell을 실행한다고 해서 OS 수준 sandbox가 제공되는 것은 아니다. 그런 격리가 구현·검증되지 않았다면 sandbox라고 표현하지 않는다.

### 5.3 경로 정책

read/write/create/delete에 동일한 canonical path 정책을 적용한다. `..`, absolute path, symlink, Windows drive-relative path, UNC, junction/reparse point, case 차이 등 지원하지 못하는 경로는 fail-closed한다. 새 파일은 부모 경로를 기준으로 확인하고 실행 직전에 다시 검사한다.

`.mindcraft`, config, state, Knowledge, credential reference, raw session 경로는 일반 agent write 대상에서 제외하고 App 내부 전용으로 취급한다. 동일 사용자 권한의 임의 shell까지 이 정책만으로 격리할 수 있다는 주장은 하지 않는다.

---

## 6. 상태 저장과 SSOT

SSOT는 모든 정보를 한 파일에 넣는 것이 아니라 각 사실의 단일 원본과 파생 관계를 정하는 것이다.

| 사실 | 원본 | 파생물 |
|---|---|---|
| 현재 기본 설정 | config.json | TUI 설정 표시 |
| 특정 Run의 Model/scope/budget | Run 시작 snapshot | history/status |
| Task/Episode/Run lifecycle | state journal | 메모리·화면 |
| approval/effect 상태 | state journal | GrantedScope·승인 화면 |
| Knowledge 본문·review·revision | Knowledge journal | 검색 index·vault 화면 |
| 실제 산출물 | workspace/artifact | digest·검증 결과 |
| Run context | context manifest + revision/digest | context inspector |
| Pi 대화 내역 | 정한 Pi session/transcript 원본 | history reference |
| 검색 score | 재생성 가능한 index/검색 계산 | 화면 |

JSONL record에는 `schemaVersion`, `sequence`, `eventId`, `type`, 대상 ID, payload, checksum을 둔다. checksum은 손상 검출이지 durable write나 보안 서명이 아니다.

- workspace lock으로 두 번째 writer를 차단한다.
- 중요 경계의 flush/sync 성공을 확인한다.
- torn tail은 유효 prefix까지 복구하고 원본을 보존한다.
- 중간 손상·sequence 충돌·지원하지 않는 schema는 repair 필요 상태로 연다.
- 저장 실패 후 새로운 side effect를 시작하지 않는다.
- config는 임시 파일 후 교체 방식으로 갱신한다.
- effect journal과 외부 파일 변경의 원자적 exactly-once는 보장하지 않는다.

---

## 7. Knowledge와 Context

### 7.1 Knowledge lifecycle

```text
candidate capture
→ review
→ promoted | rejected
→ archive 또는 conflict 기록(필요한 경우)
```

Run이 성공했지만 Knowledge capture가 실패할 수 있다. 이 경우 Run 성공을 취소하지 않고 후처리 실패로 표시한다. 동일 입력은 `runId + artifactDigest + extractorVersion` 등 idempotency key로 중복 capture를 막는다.

### 7.2 Context 우선순위

1. Episode 목표·acceptance criteria·제약
2. 사용자 지정 자료와 현재 Task의 검증된 결과·feedback
3. 범위가 맞는 promoted Knowledge의 고정 revision
4. 관련 workspace 자료

관련 Knowledge가 부족하다고 무관한 전체 Knowledge를 자동 주입하지 않는다. workspace fallback은 실행 root, scope, 자료 예산, secret/binary/generated 제외 정책을 적용한다.

`captured`와 `rejected`는 context에서 제외한다. 철회/archive된 revision과 stale index도 context 직전에 다시 검증한다.

### 7.3 Manifest와 보존

Run manifest에는 사용 item/revision, file digest, 순서, 길이, 제외 사유를 기록한다. digest만으로 당시 원문 복구가 보장되지는 않는다. 재현이 필요한 자료만 허용 범위에서 snapshot하고 무제한 transcript·stdout 복제는 하지 않는다.

provenance·source URI·raw reference·stderr·transcript에도 동일한 redaction 정책을 적용한다. Knowledge 내부 지시문은 시스템 정책이나 승인으로 승격하지 않는다.

---

## 8. 첫 실행 onboarding

실행 파일 하나로 TUI에 진입하되, “추가 설치 불필요”라는 약속은 Node runtime과 provider credential 경로가 실제 packaging으로 검증된 뒤에만 사용한다.

첫 실행:

```text
mindcraft
→ setup_required 안내
→ setup mock deterministic
   또는 setup airouter <model>
→ doctor
→ 자연어 목표 입력
→ Task/Episode/Run 실행
→ 승인·검증·저장
→ candidate review/promote
→ 다음 Run에서 재사용
```

`setup`은 config를 저장하고 preflight/runtime을 갱신한다. credential 원문을 command history나 config에 입력하지 않으며 SecretResolver가 참조할 지원 경로와 누락 시 조치를 안내한다.

첫 화면은 고급 명령 전체를 암기시키기보다 다음을 우선 표시한다.

- mock 또는 실제 provider 선택
- 실제 provider의 Model·credential reference·전송/비용 동의
- 작업 폴더와 읽기/수정 범위
- 자연어 목표 입력
- 실행 전 Model·scope 요약
- 실행 중 approval·cancel
- 종료 후 검증 결과와 Knowledge review 제안

`approve`, `reject`, `cancel`은 장시간 `run` 완료를 기다리는 동일 queue 뒤에 갇히면 안 된다. 장시간 실행은 Run 시작 상태를 저장한 후 입력 처리로 복귀하고, 상태 변경만 짧게 직렬화한다. MVP에서는 workspace당 active Run 하나로 제한한다. 실행 중 setup은 기존 Run을 변경하지 않고 다음 Run부터 적용한다.

---

## 9. Model과 ExecutionBackend

Model 수 정책:

- 0개: `setup_required`, 실제 Run은 차단
- 1개: 모든 허용 purpose에 사용
- 2개: 서로 다른 purpose에 하나씩 매핑
- 동일 purpose 중복: 설정 오류
- unavailable: 자동 fallback 없이 오류·사용자 조치

단일 Model의 setup_required는 history·Knowledge 열람까지 막는 fatal startup error가 아니다. 로컬 초기화 진단과 실제 provider 실행 검사를 분리한다.

```ts
interface ExecutionBackend {
  readonly id: BackendId;
  probe(): Promise<BackendInfo>;
  execute(request: ExecutionRequest, options: ExecutionOptions): Promise<ExecutionResult>;
}
```

계약에는 Run ID, selected Model, ContextPackage reference, workspace, budget, AbortSignal, event stream, terminal reason, artifact references, usage의 `actual/estimate/unknown` 구분이 포함되어야 한다. 늦거나 중복된 event가 terminal 상태를 되돌리지 않도록 한다.

Token-aware switching은 후속 기능이다. 초기에는 자동 전환하지 않고 필요 시 승인 기반 제안으로만 다룬다.

---

## 10. 검증 및 구현 순서

### 우선 구현 순서

1. Pi 실제 버전·도구·extension·session 경로 확인
2. 승인 digest, effect barrier, writer lock, 저장 실패 정지
3. Episode/Run 분리와 interrupted/resume 계약
4. Knowledge 원본·index·capture idempotency
5. setup_required·credential 안내·패키징
6. Windows thin vertical slice
7. 실제 필요가 입증된 external backend

### 완료 기준

- 승인 우회 경로를 코드와 테스트로 확인
- approve/reject/cancel이 장시간 Run에 의해 교착되지 않음
- effect unknown을 자동 재실행하지 않음
- 같은 Episode resume이 새 Run으로 연결됨
- Run 완료와 Episode 목표 완료가 분리됨
- 두 journal 간 분산 트랜잭션을 가정하지 않음
- Knowledge 중복 capture와 stale revision 주입이 차단됨
- `.mindcraft` 제어 파일 보호
- clean Windows 환경에서 설치·한글·경로·resize·Ctrl-C·프로세스 종료 검증

### 필수 시나리오

- 승인 저장 실패, execution-start 저장 실패, 결과 저장 실패
- 승인 대기 중 approve/reject/cancel 경합
- process restart와 unknown effect
- 두 번째 writer 차단
- root 밖·symlink·junction·UNC·공백/한글 경로
- verification 실패 후 같은 Episode 재시도
- Knowledge capture 실패와 retry
- Knowledge archive/revision 및 stale index
- cancel 뒤 늦은 Pi event
- clean Windows + 실제 provider

---

## 11. 현재 문서와 구현 사실의 구분

현재 로컬 프로젝트에 기재된 build/test/release 결과는 해당 프로젝트의 기록으로 유지한다. 그러나 이 리뷰 문서 자체는 그 결과를 재검증한 것이 아니므로 다음을 구분한다.

- 문서에 기록된 검증 결과: 원본 기록
- 이번 Revision 1: 설계 계약과 검증 요구사항 보완
- 실제 Pi API·native tool 경계·Windows UX: 구현 환경에서 별도 확인 필요
- 보완안의 제안: 승인 전에는 새 제품 기준선으로 확정하지 않음

기존 기록을 삭제·재작성하지 않는다. 과거 `resumed` 상태나 기존 schema가 존재하면 호환 read 규칙과 새 write 규칙을 분리한다.

---

## 12. AI-DLC 승인 요청

AI-DLC 단계:

```text
INCEPTION
→ 요구사항·배경·범위·설계·계획·human approval

CONSTRUCTION
→ Unit 설계·구현·테스트·리뷰

OPERATIONS
→ 현재 pilot 범위 밖
```

이번 Revision 1 승인 범위:

1. 위 책임 경계와 Episode/Run 의미를 설계 기준으로 채택
2. 모든 side effect에 공통 approval/scope 계약 적용
3. journal과 Knowledge의 SSOT·파생 관계 채택
4. 첫 실행 setup_required와 non-blocking control input 방향 채택
5. Pi 실제 통합 계약과 Windows 검증을 다음 construction/verification 작업으로 등록

승인 선택:

- **Approve & Continue** — Revision 1을 기준선으로 채택하고 구현·검증 작업 진행
- **Request Changes** — 수정할 계약·정책·범위 지정
- **Hold** — 추가 결정 전 보류

이번 문서 승인만으로 GitHub push, 배포, credential 변경, 외부 환경 변경, 운영 전환을 승인하지 않는다.

---

## 참조 자료

- `docs/mindcraft-design-and-background-bundle.md`
- `DESIGN.md`
- `ROUTING.md`
- MindCraft product brief / constraints
- AI-DLC requirements 및 phase artifacts
- `mindcraft-design-review-and-revision1.md`
- workflow/persistence/recovery/Knowledge 검토 기록
