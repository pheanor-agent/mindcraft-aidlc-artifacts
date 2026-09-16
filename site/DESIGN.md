# MindCraft 상세 설계 및 리뷰

> 현재 제품은 Pi 기반 terminal TUI와 Episode 시작 시 1회 purpose-based Model selection을 기준으로 합니다. 과거 컨셉은 `docs/legacy/`에 보존합니다.

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

- Node.js `>=22.19.0`, npm, 선택한 provider의 credential/endpoint readiness를 실행 전에 명확히 검사한다.
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
Pi AgentSession -- selected provider/model
        |
        v
MindCraft custom tools -> GrantedScope -> operation
```

### CLI/TUI

- 사용자 명령을 공통 application command dispatcher로 변환한다.
- 상태 출력은 저장소의 최신 상태를 기준으로 한다.
- 실행 중에는 prompt 중복 입력을 막고, `cancel`을 제공한다.
- 비동기 입력은 `CommandQueue`로 직렬화하며, streaming event와 tool decision을 표시한다.
- 상단 상태 표시에는 현재 Task/Episode/Run을 노출한다.
- UI는 orchestration/business rule을 포함하지 않는다.

### MindCraftApp

- Task/Episode/Run lifecycle을 조정한다.
- `init()`은 repository journal 무결성을 먼저 확인한 뒤 runtime, knowledge를 준비하고 preflight 결과를 보관한다. 손상 시 runtime/provider/session을 시작하지 않는다.
- `runNextEpisode()`는 preflight와 approval을 통과한 뒤에만 Run을 실행한다.
- 모든 terminal path에서 Run과 Episode를 일관되게 저장한다.
- session dispose와 event unsubscribe는 성공·실패 모두 수행한다.

### WorkflowRepository

- append-only JSONL과 checksum으로 기록한다.
- load 시 유효한 마지막 prefix만 replay하고 첫 손상 지점 이후는 무시한다.
- 손상이 감지되면 `JOURNAL_CORRUPTED`를 반환하고 모든 append를 fail-closed한다.
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
2. `init()`이 repository journal 무결성을 먼저 확인하고, 정상이면 Node/runtime/dependency와 선택한 provider/model 설정을 preflight한다.
3. repository가 정상이면 knowledge를 load하고 recoverable Run을 표시한다.
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

## 5.1 Persistence contract

- 0.1.x는 하나의 MindCraft 프로세스가 state/Knowledge writer를 소유하는 단일 프로세스 모델이다. 여러 번의 순차 session은 지원하며, 각 session은 `sessionId`와 start/close record를 남긴다.
- 동일 workspace의 process-level writer는 `${statePath}.lock` directory lock으로 하나만 허용한다. 소유 process가 종료된 stale lock만 다음 시작 시 복구한다. 병렬 writer/session은 현재 지원하지 않는다.
- 프로세스 내부 append는 single-writer 순서로 처리한다. 메모리 상태를 먼저 성공으로 보고하지 않고, append 완료 이후에만 저장 성공으로 간주한다.
- JSONL은 record별 checksum을 사용하고, 첫 손상 이후의 record는 replay하지 않는다. 손상 이후 append는 `JOURNAL_CORRUPTED`로 차단한다. `mindcraft repair`만 원본을 backup하고 유효 prefix를 새 journal로 atomic 전환하며 `journal_repaired` audit를 남긴 뒤 쓰기를 재개한다.
- 저장 실패는 호출자에게 전파한다. 승인·실행 시작 기록 실패는 side effect를 시작하지 않는 차단 사유다.
- journal rotation/compaction은 현재 MVP 범위가 아니다. journal 크기와 startup/status latency를 관찰한 뒤 별도 Task로 설계한다.

## 5.2 Side-effect uncertainty contract

```text
approval_pending -> approved -> execution_started -> executed
                                  \-> failed
                                  \-> unknown
```

- 승인 request는 immutable snapshot이며 requestId/runId, canonical target, payload digest 또는 exact executable/argv/cwd를 포함한다.
- decision과 execution_started 기록이 각각 성공한 뒤에만 write/command effect를 시작한다.
- effect 이후 결과 기록이 없거나 저장 실패가 발생하면 성공/미실행을 확정하지 않고 `unknown`/확인 필요로 표시한다.
- `unknown` effect는 자동 재실행하지 않는다. read-only 확인 또는 사용자의 명시적 확인이 선행되어야 한다.
- journal과 외부 effect 사이의 원자적 exactly-once는 보장하지 않으며, 이를 보장한다고 문서화하지 않는다.

## 5.3 Context contract

- preview와 실제 Run은 동일한 ContextBuilder 경로를 사용한다.
- context 순서는 `관련 promoted Knowledge -> 같은 범위의 전체 promoted Knowledge -> 허용된 workspace 자료`다.
- captured/rejected Knowledge는 context에 포함하지 않는다.
- workspace 자료는 execution root 내부에서만 수집하며 `.mindcraft`, credential, binary, generated, vendor, 대형 파일을 제외하고 redaction과 자료 예산을 적용한다.
- Run 시작 직전에 context를 재계산하고, 확정된 item ID/revision 또는 file digest, 순서, 길이, 제외 사유를 manifest로 저장한다.
- tokenizer 기반 상한은 현재 제공하지 않으며, 보수적 문자 예산을 사용한다. 자동 Model switching은 하지 않는다.

## 5.4 Phase handoff and ContextManifest contract

Workflow phase와 subagent 결과는 자유 형식 요약만으로 다음 단계에 전달하지 않는다. 각 handoff는 `src/context-handoff.mjs`의 schema v1 envelope로 source artifact path/SHA-256, producer, phase/status, projection, constraints, unresolved, validation을 기록한다.

- 원본 artifact는 append-only로 보존하고 projection은 원본을 대체하지 않는다.
- 다음 phase는 파일명·최신 수정시간이 아니라 handoff manifest와 digest를 사용한다.
- missing/stale/conflicting source, redaction 누락, budget 초과는 validator가 차단하거나 omission 사유를 기록한다.
- `partial`/`blocked` subagent 결과는 `complete` 또는 `approved`로 자동 승격하지 않는다.
- ContextManifest는 included projection/claim, omitted claim/reason, handoff ID, source digest, handoff status/control metadata, execution eligibility, budget을 기록한다.
- 현재 `src/context-handoff.mjs`는 독립 contract/validator와 테스트로 제공되며, 모든 runtime phase/subagent 전이에 자동 연결된 것은 아니다.
- runtime 연결 시 source snapshot/resolver를 반드시 전달해 missing/stale/conflict를 실행 전 검증한다.

Phase 최소 handoff:

```text
investigation -> evidence/claims/unresolved
 design        -> design/acceptance/traceability
 review        -> decision/blocking conditions
 approval      -> attestation snapshot
 execution     -> plan/attempt/observed result
 test          -> evidence/pass-fail
```

## 5.5 Process cleanup contract

- 정상 완료·실패·cancel은 session dispose, event unsubscribe, child process 정리를 한 번만 시도한다.
- cancel은 `aborted`, timeout은 `failed` 또는 실행 결과 불확실 시 `unknown`으로 구분한다.
- `AbortSignal`은 Run에서 custom tool과 command runner까지 전달한다. 승인 대기 중에는 pending approval을 무효화하고, 실행 중에는 signal abort가 process cleanup을 시작한다.
- child process를 생성하는 command는 timeout/cancel/output-limit 시 process tree 정리 정책을 적용한다. POSIX는 detached process group, Windows는 `taskkill /T /F`를 사용하며 단일 child 종료만으로 cleanup 완료를 주장하지 않는다.
- `cancelRun`은 실행 중인 command/session의 completion barrier와 journal 기록이 정리된 뒤에만 `aborted`를 반환한다. cleanup 확인 전 사용자에게 중단 완료를 보고하지 않는다.
- command 결과 journal은 `cleanup.requested`, `cleanup.confirmed`, `cleanup.method`, `effectStatus`를 기록한다. 이미 관측된 완료 effect와 cancel/timeout 이후의 `uncertain` effect를 구분하며, 완료된 effect를 되돌렸다고 주장하지 않는다.
- 강제 kill에서는 cleanup이 실행됐다고 가정하지 않고, 다음 시작 시 nonterminal Run을 recovery 규칙으로 처리한다.

## 5.5 MVP performance envelope

- 현재 MVP는 소규모 개인 workspace와 단일 프로세스 실행을 대상으로 한다.
- state/Knowledge는 현재 전체 replay/search 구조를 사용하므로, 대규모 데이터에서의 성능을 보장하지 않는다.
- 다음 최적화는 실제 benchmark 이후 결정한다: journal rotation/compaction, history pagination, Knowledge indexing, streaming parser.
- benchmark는 startup, status/history, Knowledge search, repair, peak memory, journal size를 측정하며 결과가 없는 성능 주장은 완료로 기록하지 않는다.

## 6. 구현 단계와 검증 게이트

### P0 — 실행 차단 제거

- runtime preflight와 명확한 Node version error
- selected provider credential/model availability preflight
- 초기화·session 생성 실패 시 상태 정리
- 검증: Node 22 전체 test + CLI smoke + credential 누락 test

### P1 — 안전성 보강 — 완료

- canonical path 및 symlink escape 방지
- approval decision과 denied operation audit
- 검증: `..`, 절대경로, symlink, write/command deny 및 승인 전 side-effect 없음 test

구현된 approval 상태는 `pending → approved|rejected → executed`이며, 모든 decision은
Run event와 append-only repository audit record에 저장한다. TUI/CLI에서 `approvals`,
`approve <id>`, `reject <id>` 명령을 사용한다.

### P2 — 사용자 흐름 — 완료

- CLI/TUI 공통 command dispatcher 및 command queue
- `doctor`, `task`, `tasks`, `use`, `run`, `status`, `runs`, `resume`, `cancel`, `knowledge`, `promote` 연결
- TUI streaming event, tool decision, 승인 대기 대상/영향/위험, 현재 Task/Episode/Run 표시
- 실행 중 중복 Run 차단 및 cancel 상태 영속화
- 검증: command queue 순서 보장, approval 전 side-effect 없음, path/command deny, 기존 회귀 테스트 포함 99 tests pass

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

4. **Approval boundary**: Phase 3에서 write/command approval lifecycle과 audit schema를 구현했다. network tool은 여전히 기본 차단 상태다.
5. **TUI 범위**: Phase 3에서 실제 write/command approval UX를 연결했다. Windows Terminal 실환경 리허설은 Phase 6의 후속 범위다.
6. **통합 테스트 의존성**: vertical slice test는 Airouter 환경/credential에 의존한다. credential 없는 CI에서는 deterministic mock provider와 별도 live smoke test를 분리해야 한다.

### Medium

7. 0.1.x는 single-process/single-workspace writer contract를 사용하며 workspace lock으로 두 번째 writer를 차단한다. multi-writer는 현재 비범위다.
8. `Task/Episode/Run` state transition이 domain 함수로 강제되지 않아 임의 상태 변경이 가능하다. P1 이후 transition API를 도입한다.
9. README의 배포 branch(`master`)와 현재 local branch(`master`) 정보가 불일치한다는 문제는 해결했다. `main`은 초기 release/documentation 이력으로 보존한다.
10. `@sinclair/typebox`와 transitive `typebox`가 동시에 존재한다. 실제 API 호환성을 확인하고 불필요한 직접 dependency는 제거 검토한다.

## 8. 리뷰 결론

현재 구현은 **Node 22.19.0 환경에서 실행 가능한 vertical-slice MVP**로 판단된다. 다만 일반 사용자에게 "즉시 사용 가능"으로 배포하려면 최소한 P0의 세 항목(runtime/preflight, failure finalization, path boundary)을 먼저 통과시켜야 한다.

리뷰 게이트:

- [x] 요구 runtime에서 build/test/release-check 통과
- [x] CLI 기동·status·quit smoke 확인
- [ ] P0 코드 보강
- [x] P1 safety test 보강
- [ ] clean checkout 설치 검증
- [ ] 최종 배포 승인
