# MindCraft 종합 개발 현황 및 상세 설계

> 문서 기준: 현재 저장소의 `master` HEAD와 제품 SSOT 문서
> 저장소: `/opt/data/workspace/mindcraft`
> 제품 버전: `0.1.0`
> 문서 목적: MindCraft의 제품 정의, 현재 구현 상태, 설계 계약, 검증 결과, 미완료 항목을 한 파일에서 확인
>
> 보안·개인정보 원칙: credential, token, 개인 정보, 내부 인증 경로와 비공개 실행 정보는 포함하지 않는다.

---

## 1. Executive summary

MindCraft는 사용자가 지정한 Model을 이용해 코드·문서 작업을 반복 실행할 수 있도록 만든 **Pi 기반 terminal TUI workflow package**다. MindCraft가 장기 작업의 `Task → Episode → Run` lifecycle, Knowledge, 승인·범위 정책, persistence·recovery를 소유하고, Pi는 한 번의 AgentSession 및 model/tool loop를 담당한다.

현재 저장소는 다음 기준의 **vertical-slice MVP**를 구현한다.

- Node.js package/CLI와 Pi 기반 terminal TUI
- 첫 실행 `setup` onboarding
- Task/Episode/Run 생성·조회·실행·취소·resume
- 목적(`purpose`) 기반 Model 선택
- 승인 기반 filesystem/command tool
- path·symlink·control-file 경계
- append-oriented JSONL state와 checksum/recovery
- Knowledge candidate capture → 사용자 review/promote → bounded context 재사용
- deterministic mock rehearsal
- 한국어 우선 UI 메시지와 공통 CLI/TUI command dispatcher

현재 자동 Model switching/fallback, 중앙 gateway, 팀 공유 동기화, 분산 worker, Graph/DAG workflow engine, 자동 Knowledge 승격은 제품 범위가 아니다.

---

## 2. 현재 기준선과 확인 방법

### 2.1 저장소 상태

- 현재 branch: `master`
- 현재 HEAD: `6623ada` — `docs: clarify MindCraft and AI-DLC boundary`
- 최근 기준선에는 first-run onboarding, side-effect safety, single-writer persistence, AI-DLC와 제품 경계 정정이 반영되어 있다.
- 제품 문서의 권위 순서는 `ROUTING.md` → `README.md` → `DESIGN.md` → 제품 metadata → `src/**`, `test/**`다.
- `docs/legacy/**`와 개발 작업 기록은 historical/reference 자료이며 제품 SSOT로 자동 승격하지 않는다.

### 2.2 실제 실행 검증 결과

다음 명령을 저장소에서 실제 실행했다.

```text
npm run build          PASS
npm test               PASS — 118/118
npm run release:check  PASS — mindcraft-0.1.0.tgz dry-run
```

`npm run release:check` 결과:

- package: `mindcraft@0.1.0`
- 총 파일 수: 22
- package size: 약 30.8 kB
- unpacked size: 약 104.0 kB

이 문서에 적은 검증 결과는 위 실행 출력과 현재 저장소 문서를 기준으로 한다. Windows Terminal native 검증과 실제 provider 호출은 별도의 증거가 필요하다.

---

## 3. 제품 정의와 문제 영역

### 3.1 해결하려는 문제

- agent와 harness를 별도로 설치·연결하기 어려움
- 초기 설정과 Model 선택의 진입장벽
- 코드·문서 분석 및 결과 가공을 반복하기 어려움
- 이전 결과와 교훈을 다음 작업에 안전하게 이어가기 어려움
- 파일·명령·외부 동작의 범위를 통제하기 어려움
- 장시간 작업 중단 시 상태와 재개 지점을 잃기 쉬움

### 3.2 핵심 사용자

- 개인 사용자
- Windows Terminal 또는 호환 terminal 사용자
- 개발자·문서 작업자
- 별도 agent/harness 설치를 최소화하려는 사용자

1차 제품 interface는 Windows Terminal 또는 호환 terminal이다. Linux/WSL/macOS는 compatibility 검토 대상이며 Windows native UX는 별도 환경에서 확인해야 한다.

### 3.3 핵심 사용 사례

- 코드 분석 및 정리
- 문서 분석·요약·생성·가공
- 반복 작업 실행
- 이전 결과와 승인된 Knowledge 재사용
- 승인 기반 파일·명령 작업
- 중단된 작업의 안전한 resume

---

## 4. 제품 범위와 비범위

### 포함

- terminal TUI와 CLI
- `MindCraftApp` orchestration
- `Task / Episode / ExecutionRun` lifecycle
- Episode 실행과 결과 검증
- bounded ContextAssembler
- Knowledge 저장·검색·provenance·candidate review
- Pi AgentSession integration
- ApprovalRequest와 GrantedScope
- checkpoint·cancel·resume·recovery
- 결과·산출물·실행 상태 표시
- 첫 실행 onboarding

### 제외

- 중앙 LLM proxy 또는 inbound API gateway
- Graph/DAG workflow engine
- 분산 worker platform·message broker·microservice 분리
- 자동 multi-backend routing/fallback
- 생성 Knowledge의 자동 canonical 승격
- Pi agent loop 재구현
- 무승인 shell 실행
- 팀 공유·중앙 동기화·다중 사용자 권한
- GitHub private repository 생성·push·배포

AI-DLC는 MindCraft runtime이 아니다. AI-DLC는 MindCraft를 개발·검증하는 외부 governance/development method이며, 제품 런타임의 `Task/Episode/Run`과 동일한 상태 모델이 아니다.

---

## 5. 아키텍처와 책임 경계

```text
CLI / TUI
    ↓
MindCraftApp
    ├─ Workflow: Task / Episode / Run / Verification
    ├─ ContextAssembler
    ├─ KnowledgeService / KnowledgeRepository
    ├─ ExecutionBackend → PiBackend
    ├─ Approval + GrantedScope
    └─ WorkflowRepository
              ↓
       append-oriented JSONL

Pi AgentSession
    ↓
공통 승인·범위 검사
    ↓
허용된 파일·프로세스·외부 동작
```

### 책임 분리

- **CLI/TUI**: 입력, 상태, streaming event, 승인 대기 표시. Business rule과 상태 확정은 App에 위임한다.
- **MindCraftApp**: 초기화, preflight, Task/Episode/Run lifecycle, context 구성, Pi 실행, 결과 저장을 조정한다.
- **WorkflowRepository**: append-oriented JSONL, checksum, replay, repair, single-writer 순서를 담당한다.
- **KnowledgeService**: candidate/promoted/rejected lifecycle, provenance, redaction, bounded retrieval을 담당한다.
- **Pi backend**: AgentSession 생성, prompt/event 연결, cancel/dispose를 담당한다.
- **GrantedScope/approval**: side effect가 실행되기 전 경로·명령·범위 정책을 적용한다.

Pi의 model 출력, Knowledge 내부 지시문, prompt는 scope나 권한을 확대할 수 없다.

---

## 6. 실행 workflow

```text
mindcraft 시작
→ runtime/storage/Model preflight
→ 첫 실행 setup 또는 기존 상태 복원
→ Task 생성·선택
→ Episode 목표와 요청 정의
→ 승인된 Knowledge와 workspace context 구성
→ Model/purpose/availability 확인
→ 승인·범위 확인
→ Pi AgentSession 실행
→ streaming event 표시
→ 결과·acceptance criteria 검증
→ Run/Episode 상태 저장
→ redacted Knowledge candidate capture
→ 사용자 review/promote
→ 다음 Run에서 promoted Knowledge 재사용
```

### 주요 CLI 명령

```text
setup <provider> <model> [purpose]  첫 실행 Model 설정
doctor                            환경·Model·storage 진단
task <title>                      Task 생성
tasks                             Task 목록
use <task-id>                     현재 Task 선택
run <prompt>                      Episode 생성·실행
status                            현재 Task/Run 표시
runs                              선택 Task의 Run 목록
resume <run-id>                  recoverable Run 재개
cancel <run-id>                  실행 중 Run 중단
approvals                         승인 대기 목록
approve <id>                      승인
reject <id>                       거부
knowledge [query]                Knowledge 검색
knowledge-detail <id>            상세·provenance
promote <id>                     candidate 승격
reject-knowledge <id>            candidate 거부
preview <prompt>                 context/manifest 미리보기
mode <name>                      실행 모드 조회·변경
quit                              종료
```

CLI와 TUI는 공통 command dispatcher와 `CommandQueue`를 사용한다. 빠른 연속 입력은 순서대로 처리하며, control command와 장시간 실행이 서로 영구적으로 막히지 않도록 하는 방향이 적용되어 있다. MVP에서는 workspace당 active Run 하나를 기준으로 한다.

---

## 7. 상태 모델과 복구

### 7.1 상태 전이

```text
Task:    active → completed | cancelled
Episode: queued → running → completed | failed | aborted
Run:     queued → running → completed | failed | aborted
         running (restart) → recoverable → 새 Run으로 resume
```

Resume은 기존 Run을 덮어쓰지 않는다. 기존 실행 기록을 보존하고, 같은 Episode에 새 Run ID를 만들어 `resumedFrom`으로 연결한다. 목표나 acceptance criteria 자체가 바뀌는 경우에만 새 Episode를 만든다.

### 7.2 오류·복구 규칙

- preflight 실패: Run을 만들지 않고 조치 가능한 오류를 표시
- session 생성 실패: queued/running Run과 Episode를 failed로 저장
- prompt/idle 실패: failed 또는 abort 상태 저장
- 정상 cancel: `aborted`로 저장
- process restart: 종료 기록이 없는 실행을 recoverable/interrupted로 식별
- `execution_started` 뒤 결과가 없으면 effect를 `unknown`으로 표시
- `unknown` effect는 자동 재실행하지 않으며 read-only 확인 또는 사용자 확인을 요구
- 늦은 Pi event는 Run ID와 terminal 상태를 확인하며 종료 상태를 되돌리지 않음
- session dispose와 event unsubscribe는 성공·실패 경로에서 모두 시도

### 7.3 Persistence contract

- state와 Knowledge는 append-oriented JSONL로 저장
- record별 checksum으로 손상 위치 감지
- 유효한 prefix까지만 replay하고 손상 이후 기록은 자동 신뢰하지 않음
- 손상 감지 후 모든 append를 fail-closed하고 `mindcraft repair`를 안내
- repair 전에 원본 backup을 보존하고 `journal_repaired` audit를 기록
- repair 완료 및 재검증 후에만 쓰기 재개
- 저장 실패는 호출자에게 전파하고, 중요 저장 실패 뒤 side effect를 시작하지 않음
- 0.1.x는 단일 MindCraft 프로세스가 writer를 소유
- concurrent append는 내부 single-writer 순서로 직렬화
- journal rotation/compaction과 대규모 indexing은 후속 최적화 범위

주요 workspace 경로:

```text
.mindcraft/config.json
.mindcraft/state.jsonl
.mindcraft/knowledge.jsonl
```

실제 effect와 journal의 원자적 exactly-once는 보장하지 않는다.

---

## 8. Model 정책과 routing

현재 routing은 **Episode 시작 시 한 번** 수행한다.

```text
Episode 시작
→ purpose 확인
→ Model 선택
→ Episode 전체 실행
```

| 설정 | 정책 |
|---|---|
| Model 0개 | `setup_required`, 실제 실행 차단 |
| Model 1개 | 모든 허용 purpose에 사용 |
| Model 2개 | 서로 다른 purpose에 하나씩 매핑 |
| 동일 purpose 2개 이상 | 설정 오류 |
| 지정 Model unavailable | 자동 fallback 없이 오류·사용자 조치 |
| 실행 중 switching | 현재 미구현 |

실행 전 selected Model, purpose, availability와 비용 추정 또는 `unknown`을 표시·기록한다. 제품은 자동으로 Model을 탐색하거나 추가하지 않는다.

Token-aware switching은 후속 기능이다. 후속 검토 시 context 크기, prompt 복잡도, 위험도, token budget, retry, 검증 결과, tool 호출량을 신호로 삼되 초기 방식은 자동 전환이 아닌 사용자 승인 기반 제안으로 둔다. 실제 사용량과 추정치는 `actual`과 `estimate`를 분리한다.

---

## 9. Knowledge와 Context 설계

### 9.1 Knowledge lifecycle

```text
capture candidate
→ review
→ promoted | rejected
→ 필요 시 archive/conflict 처리
```

Run 결과에서 생성된 candidate는 자동으로 실행 context에 들어가지 않는다. 사용자 review를 거쳐 `promoted`된 Knowledge만 다음 실행에 사용된다.

Candidate에는 다음 provenance가 포함된다.

- Task/Episode/Run reference
- source와 source URI
- capturedAt
- raw data reference
- derived content metadata
- review state
- revision/confidence/score
- redaction 결과

### 9.2 Context 우선순위와 fallback

```text
Episode 목표·acceptance criteria·제약
→ 사용자 지정 자료와 검증된 결과·feedback
→ 관련 promoted Knowledge
→ 같은 범위의 promoted Knowledge fallback
→ 허용된 execution workspace 자료
```

Context는 실행 직전에 bounded slice로 재계산하며, preview와 실제 Run은 같은 ContextBuilder 경로를 사용한다. Manifest에는 item ID/revision 또는 file digest, 순서, 길이, 제외 사유를 기록한다.

workspace fallback에서 제외하는 항목:

- `.mindcraft` 제어 파일
- credential·secret 의심 파일
- binary
- vendor/generated 대형 자료
- execution root 외부 자료
- 예산을 초과하는 자료

captured/rejected Knowledge는 context에 포함하지 않는다. stale revision과 검색 index는 실행 직전에 재검증한다.

### 9.3 Redaction과 보존

credential/token/secret 형태의 값은 저장·출력·오류·provenance·transcript 경로에서 redaction한다. digest만으로 당시 원문 복구가 보장되지는 않으며, 재현에 필요한 자료만 허용 범위 내 snapshot한다.

---

## 10. 안전성·승인·side-effect barrier

모든 파일·프로세스·network·provider 비용 발생 경로는 공통 정책을 통과해야 한다.

```text
approval_pending
→ approved | rejected
→ execution_started
→ executed | failed | unknown
```

실행 절차:

1. action을 정규화
2. 현재 GrantedScope와 비교
3. 필요한 경우 immutable ApprovalRequest 저장
4. 사용자 decision과 action digest 또는 정확한 executable/args/cwd 저장
5. 실행 직전 path·입력·cancel·승인 유효성 재검사
6. `execution_started` durable 기록
7. effect 수행
8. 결과 저장; 실행 여부가 불명확하면 `unknown`

### 경로 정책

read/write/create/delete에 동일한 canonical path 정책을 적용한다. `..`, 절대경로, symlink escape, 지원되지 않는 Windows drive-relative/UNC/junction/reparse 경로 등은 fail-closed한다. 새 파일은 부모 경로 확인 후 실행 직전에 다시 검사한다.

`.mindcraft` config/state/Knowledge와 credential reference·raw session 경로는 agent의 일반 write 대상에서 제외한다. 동일 OS 사용자 권한으로 실행되는 임의 shell까지 이 정책만으로 sandbox된다고 주장하지 않는다.

### 승인 정책

- execution root 밖 파일: 승인 필요
- shell/external process: 구체적인 executable·args·cwd 표시 후 승인
- network 또는 비용 발생 동작: 승인 필요
- Knowledge promote: Knowledge 재사용 승인일 뿐 실행·외부 전송 권한을 만들지 않음
- pending 승인에 대한 늦거나 중복된 결정: 무효화
- 승인 journal 또는 execution-start journal 저장 실패: side effect 차단
- 결과 저장 실패 또는 effect 불확실: `unknown`, 자동 재실행 금지

---

## 11. 첫 실행 onboarding

첫 실행에 Model이 없어도 프로그램이 즉시 fatal 종료되지 않고 TUI에서 설정을 안내한다.

```text
mindcraft
→ setup_required 안내
→ setup mock deterministic
   또는 setup airouter <model>
→ doctor
→ task <목표>
→ run <요청>
→ approval / verify / 저장
→ knowledge / promote
```

정책:

- credential 원문을 입력받거나 저장하지 않고 reference 경계를 유지
- `mock deterministic`은 network 없이 offline rehearsal만 수행
- mock 결과는 실제 provider 호출이나 Windows Terminal native 검증의 증거가 아님
- setup 완료 후 같은 프로세스에서 preflight/runtime 갱신
- setup 변경은 기존 active Run을 몰래 변경하지 않고 다음 Run에 적용
- UI는 한국어 우선이며 command/provider/model/path/error code는 식별성을 위해 원어 유지 가능

---

## 12. 현재 구현된 항목

현재 코드와 테스트·문서 기준으로 구현된 기준선:

- Pi 기반 terminal TUI adapter
- CLI/TUI 공통 command dispatcher
- `CommandQueue` 기반 입력 순서 보장
- 첫 실행 `setup`과 `doctor`
- Model registry 및 purpose validation
- Task/Episode/Run 영속 lifecycle
- Run 상태 표시·목록·cancel·resume
- preflight와 fail-closed Model availability
- approval-gated custom tools
- canonical path 및 symlink safety
- `.mindcraft` control-file 보호
- command allowlist와 approval
- side-effect approval/start/result audit
- single-writer WorkflowRepository
- checksum 기반 replay/repair
- interrupted/recoverable Run 처리
- Knowledge candidate capture·redaction·provenance
- promote/reject와 bounded retrieval
- Knowledge fallback 및 budget·oversized item 정책
- capture idempotency와 capture 실패 시 Run 결과 보존
- deterministic mock rehearsal
- Token Doctor의 estimate/actual 구분
- 한국어 UI catalog와 onboarding 상태 메시지

실제 테스트 suite는 승인·경로·복구·Knowledge·routing·CLI/TUI·onboarding을 포함해 118개 테스트를 통과했다.

---

## 13. 미완료·후속 작업

### P0 — 현재 Model routing 정합성

- Model registry와 purpose validation 사용자 안내 보강
- Model 0/1/2개 정책의 onboarding 문구 보강
- routing reason, selected model, purpose, availability audit 정리
- Episode 시작 시 1회 선택 동작의 회귀 테스트 유지

### P0 — 실제 실행 흐름 검증

- Pi AgentSession의 실제 interactive smoke
- session 생성·prompt·idle·abort·dispose 흐름
- 실행 root·scope·approval·redaction의 실제 경계 검증
- provider credential을 사용하는 live smoke 분리

### P1 — Knowledge 품질

- candidate/promoted/rejected 상태 표시 보강
- provenance와 raw data reference 검증 강화
- 관련 Knowledge → 전체 promoted Knowledge → workspace fallback 검증 유지
- oversized item·검색 경계·redaction 테스트 유지
- 기존 Knowledge migration은 별도 승인 후 검토

### P1 — 사용성·배포

- task/run/status/knowledge/promote/resume onboarding 개선
- Windows Terminal compatibility smoke
- clean checkout 설치 검증
- package artifact와 문서 목록 검증
- 한글 입력·삭제·커서·붙여넣기·resize·긴 streaming output·Ctrl-C 검증

### P2 — 후속 제안

- 승인 기반 Token Switching 제안
- verification feedback loop
- history graph/curator 필요성 검토
- journal rotation/compaction
- Knowledge indexing과 대규모 workspace benchmark
- 실제 필요가 확인된 경우에만 external backend adapter

후속 제안은 source·schema·test·승인 근거가 생기기 전까지 현재 기능으로 문서화하지 않는다.

---

## 14. 검증 매트릭스

| 영역 | 현재 상태 | 근거/비고 |
|---|---|---|
| JavaScript syntax/build | 통과 | `npm run build` 실제 실행 |
| 기본 regression | 통과 | `npm test`, 118/118 |
| package dry-run | 통과 | `npm run release:check` 실제 실행 |
| approval/path safety | 통과 | 회귀 테스트 포함 |
| persistence/recovery | 통과 | repair, single-writer, resume 테스트 포함 |
| Knowledge lifecycle | 통과 | capture/promote/reuse/redaction 테스트 포함 |
| Model routing | 통과 | 0/1/2개·purpose·unavailable 테스트 포함 |
| offline mock flow | 통과 | network 없는 vertical slice 테스트 포함 |
| live provider | 별도 실행 필요 | credential·network 의존 |
| Windows Terminal native UX | 미검증 | 현재 실행 환경에 Windows native 없음 |
| clean checkout 설치 | 후속 검증 | release gate에 등록 |
| high-level audit | 별도 확인 필요 | 이 문서 작성 실행에는 포함하지 않음 |

---

## 15. 승인 경계와 의사결정

현재 문서·코드 기준선은 로컬 제품 코드·문서·테스트에 한정된다. 다음은 별도 승인 없이는 수행하지 않는다.

- GitHub push
- 배포 또는 운영 전환
- credential 변경
- 외부 환경 변경
- 실제 유료 provider 호출
- 팀 공유·중앙 동기화 도입

권장 다음 단계는 다음 순서다.

1. 현재 설계와 Model 정책 승인
2. Pi 실제 API/session/tool 경계 확인
3. 실제 provider smoke와 Windows Terminal thin vertical slice 실행
4. 미완료 P0 안전성·실패·복구 검증 보강
5. clean checkout 설치 및 release rehearsal
6. 그 이후에만 P1/P2 확장 검토

---

## 16. 참고 문서

- `README.md` — 사용자-facing 제품 범위와 실행 안내
- `ROUTING.md` — 현재 Model 정책의 권위 문서
- `DESIGN.md` — 상세 설계·상태·안전·persistence 계약
- `TODO.md` — 등록 작업과 후속 항목
- `docs/SSOT.md` — 문서 권위 및 Knowledge 경계
- `docs/mindcraft-design-and-background-bundle.md` — 설계·배경 통합본
- `docs/mindcraft-design-and-background-bundle-revision1.md` — 보완 설계 계약 초안
- `docs/mindcraft-ai-dlc-knowledge-audit.md` — AI-DLC와 MindCraft 제품 경계 점검
- `docs/first-run-onboarding-design.md` — onboarding 설계·검증 요구사항
- `src/**`, `test/**` — 구현 및 회귀 테스트

> 핵심 결론: MindCraft는 현재 Pi 기반 개인용 terminal TUI workflow MVP로서 핵심 lifecycle·Knowledge·approval·persistence·recovery vertical slice와 118개 기본 테스트를 통과했다. 다만 실제 provider, Windows Terminal native UX, clean checkout 설치와 일부 P0/P1 항목은 별도 검증·보강이 남아 있다.
