# MindCraft 상세 설계 및 리뷰

작성 목적: 현재 0.1.0 구현을 실제 설치·실행 가능한 MVP로 정리하기 위한 설계 기준과 사전 리뷰 기록.

## 1. 목표와 완료 기준

### 목표

사용자가 프로젝트 directory에서 MindCraft를 실행하고 다음의 한 사이클을 안전하게 완료할 수 있어야 한다.

```text
초기화
-> 환경 preflight
-> Task 생성
-> Episode 생성
-> 승인된 Knowledge context 구성
-> 실행 전 승인/범위 확인
-> Pi AgentSession 실행
-> 결과 검증
-> Run/Knowledge 기록
-> status에서 결과 확인
```

### MVP 완료 기준

- Node.js `>=22.19.0`, npm, Airouter credential을 실행 전에 명확히 검사한다.
- preflight 실패 시 외부 model 호출이나 agent session 생성을 하지 않는다.
- Task/Episode/Run의 상태 전이가 명시된 순서로만 일어난다.
- process 중단 뒤 `running` Run은 `recoverable`로 식별되고, resume은 새 Run을 만든다.
- 승인된 Knowledge만 prompt context에 포함하며 candidate는 자동 승인하지 않는다.
- 모든 custom tool은 GrantedScope와 approval 정책을 통과해야 실행된다.
- 테스트에서 성공·실패·복구·scope 거부·credential 누락·CLI smoke flow를 검증한다.
- 요구 Node runtime에서 `npm run build`, `npm test`, `npm run release:check`가 통과한다.

## 2. 구성 요소와 책임

```text
CLI / TUI adapter
        |
        v
MindCraftApp (orchestrator)
  |       |          |
  v       v          v
Domain  Workflow   Knowledge
        Repository  Service
  |
  v
Preflight + Approval Policy
        |
        v
Pi AgentSession -- Airouter Provider
        |
        v
MindCraft custom tools -> GrantedScope -> operation
```

### CLI/TUI

- 사용자 명령을 parse하고 App command로 변환한다.
- 상태 출력은 저장소의 최신 상태를 기준으로 한다.
- 실행 중에는 prompt 중복 입력을 막고, `cancel`을 제공한다.
- UI는 orchestration/business rule을 포함하지 않는다.

### MindCraftApp

- Task/Episode/Run lifecycle을 조정한다.
- `init()`은 runtime, repository, knowledge를 준비하고 preflight 결과를 보관한다.
- `runNextEpisode()`는 preflight와 approval을 통과한 뒤에만 Run을 실행한다.
- 모든 terminal path에서 Run과 Episode를 일관되게 저장한다.
- session dispose와 event unsubscribe는 성공·실패 모두 수행한다.

### WorkflowRepository

- append-only JSONL과 checksum으로 기록한다.
- load 시 유효한 마지막 prefix만 replay하고 손상된 tail은 무시한다.
- 동일 entity의 latest record를 기준으로 상태를 재구성한다.
- 향후 동시 writer가 필요하면 lock 또는 단일 writer queue를 추가한다.

### KnowledgeService

- candidate에는 task/episode/run/source/capturedAt provenance를 기록한다.
- `captured -> promoted|rejected` 전이는 review command만 수행한다.
- prompt에 들어가는 slice는 `promoted` 상태만 대상으로 하고 문자 수 제한을 지킨다.
- 저장·출력·오류 경로에서 secret 패턴을 redaction한다.

### Safety boundary

- read/write/command/network 요청을 서로 독립된 capability로 판단한다.
- default는 deny이며, write/command/network는 approval 없이는 실행하지 않는다.
- 경로는 `realpath`/허용 root 기준으로 검증해 `..`, symlink escape를 차단한다.
- tool decision은 audit event로 Run에 기록한다.

## 3. 상태 모델

### Task

```text
active -> completed
active -> cancelled
```

### Episode

```text
queued -> running -> completed
queued -> running -> failed|aborted
```

### Run

```text
queued -> running -> completed
queued -> running -> failed|aborted
running (process restart) -> recoverable -> resumed
```

`resumed`는 기존 Run의 terminal 상태이며, 실제 재실행은 새로운 Run ID로 기록한다. 상태 변경은 메모리 변경보다 repository commit을 우선한다.

## 4. 실행 시퀀스

1. CLI가 App을 생성한다.
2. `init()`이 Node/runtime/dependency/Airouter 설정을 preflight한다.
3. repository와 knowledge를 load하고 recoverable Run을 표시한다.
4. `task`가 유효성 검사 후 Task를 생성하고 commit한다.
5. `run`이 현재 Task와 prompt를 검증한다.
6. Episode와 queued Run을 commit한다.
7. approval policy와 model availability를 확인한다.
8. Run을 running으로 commit한다.
9. Pi AgentSession을 생성하고 승인된 custom tools만 등록한다.
10. prompt 및 Knowledge slice를 전달하고 idle까지 기다린다.
11. assistant output을 검증하고 Run/Episode를 completed로 commit한다.
12. 결과를 redacted candidate로 capture한다.
13. 예외 시 error를 redaction한 뒤 failed/aborted 상태를 commit하고 원래 오류를 사용자에게 표시한다.

## 5. 실패·복구 설계

- preflight 실패: Run을 생성하지 않고 actionable error를 출력한다.
- session 생성 실패: queued Run을 failed로 commit한다.
- prompt/idle 실패: running Run을 failed 또는 aborted로 commit한다.
- process restart: latest running Run을 recoverable로 재구성한다.
- resume: 기존 Run은 resumed로 commit하고, 새 Episode/Run을 생성한다.
- JSONL의 checksum 불일치 또는 잘린 마지막 줄: 해당 줄 이후를 replay하지 않는다.
- 외부 API timeout/retry 정책은 provider adapter에 두고 App은 terminal 결과만 처리한다.

## 6. 구현 단계와 검증 게이트

### P0 — 실행 차단 제거

- runtime preflight와 명확한 Node version error
- Airouter credential/model availability preflight
- 초기화·session 생성 실패 시 상태 정리
- 검증: Node 22 전체 test + CLI smoke + credential 누락 test

### P1 — 안전성 보강

- canonical path 및 symlink escape 방지
- approval decision과 denied operation audit
- 검증: `..`, 절대경로, symlink, write/command/network deny test

### P2 — 사용자 흐름

- CLI 명령 상태 업데이트와 cancel
- TUI adapter를 실제 command/event stream과 연결
- 검증: task/run/status/knowledge/promote/cancel smoke test

### P3 — 배포

- README와 package branch/version 정보 일치
- clean checkout 설치 test
- `npm audit --audit-level=high`
- release artifact 검토 후 승인 요청

## 7. 사전 리뷰 결과

### Critical

1. **Runtime mismatch**: package는 Node `>=22.19.0`인데 검증 환경은 Node 20이었다. Node 20에서 `undici` import 단계가 실패한다. 설치 script의 차단은 정상이며, 배포 전 Node 22가 필수다.
2. **실패 상태 고착 가능성**: `runNextEpisode()`에서 model 조회 또는 session 생성이 `try` 바깥에 있어 실패 시 이미 저장된 Run이 `running`으로 남을 수 있다. P0에서 terminal failure commit으로 수정해야 한다.
3. **경로 escape 위험**: 현재 scope 판정은 문자열 prefix만 검사하고 `readFile(params.path)`를 직접 호출한다. 상대경로·symlink 기준의 canonical root 검증이 필요하다.

### High

4. **Approval boundary 미완성**: 현재 등록 tool은 read 하나이며, write/command/network approval lifecycle은 policy 수준에 머문다. 실제 tool 추가 전 approval state와 audit schema를 고정해야 한다.
5. **TUI 미완성**: `MindCraftTuiAdapter`는 상태 표시 컴포넌트지만 CLI는 readline을 사용한다. 따라서 현재 배포물은 "TUI 기반"이라기보다 CLI MVP로 표기하는 것이 정확하다.
6. **통합 테스트 의존성**: vertical slice test는 Airouter 환경/credential에 의존한다. credential 없는 CI에서는 deterministic mock provider와 별도 live smoke test를 분리해야 한다.

### Medium

7. JSONL append는 concurrent writer에 안전하지 않다. 단일 CLI MVP에서는 허용하되 multi-process 사용 전 lock을 추가한다.
8. `Task/Episode/Run` state transition이 domain 함수로 강제되지 않아 임의 상태 변경이 가능하다. P1 이후 transition API를 도입한다.
9. README의 배포 branch(`main`)와 현재 local branch(`master`) 정보가 불일치한다. release 전 정정한다.
10. `@sinclair/typebox`와 transitive `typebox`가 동시에 존재한다. 실제 API 호환성을 확인하고 불필요한 직접 dependency는 제거 검토한다.

## 8. 리뷰 결론

현재 구현은 **Node 22.19.0 환경에서 실행 가능한 vertical-slice MVP**로 판단된다. 다만 일반 사용자에게 "즉시 사용 가능"으로 배포하려면 최소한 P0의 세 항목(runtime/preflight, failure finalization, path boundary)을 먼저 통과시켜야 한다.

리뷰 게이트:

- [x] 요구 runtime에서 build/test/release-check 통과
- [x] CLI 기동·status·quit smoke 확인
- [ ] P0 코드 보강
- [ ] P1 safety test 보강
- [ ] clean checkout 설치 검증
- [ ] 최종 배포 승인
