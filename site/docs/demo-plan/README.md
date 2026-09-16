# MindCraft Windows Terminal TUI Demo 작업 계획

> 주의: 이 문서의 Phase 0~6은 MindCraft 개발·검증을 위한 해커톤 작업 단계다.
> MindCraft 제품 사용자의 런타임 workflow나 AI-DLC 실행 엔진을 의미하지 않는다.

## 문서 목적

이 문서는 MindCraft를 Windows Terminal + WSL 환경에서 안정적으로 시연 가능한 수준으로 보강하기 위한 전체 작업 계획이다. 제품 전체 완성이 아니라, 5분 내에 핵심 가치를 보여주는 검증 가능한 데모 수직 슬라이스 완성을 목표로 한다.

## 최종 데모 시나리오

```text
Windows Terminal
→ WSL/Linux에서 MindCraft TUI 실행
→ 환경 진단
→ 데모 workspace 준비
→ 릴리스 점검 Task 생성
→ AI 분석 실행
→ 파일/명령 승인 요청 확인
→ 승인 또는 거부
→ 결과 저장
→ Knowledge candidate 검토 및 promote
→ 다음 Run에서 승인된 Knowledge 재사용
→ status/history 확인
```

## 핵심 데모 메시지

> 사용자가 지정한 Model로 작업을 수행하고, 위험한 작업은 사용자 승인을 거치며, 검토된 결과를 다음 작업에서 재사용한다.

## 페이즈 순서

| Phase | 이름 | 목적 | 완료 기준 |
|---|---|---|---|
| 0 | 데모 기준선과 fixture | 반복 가능한 sample workspace와 acceptance 고정 | 누구나 같은 입력으로 데모 시작 가능 |
| 1 | 초기화·Preflight·Model 설정 | 첫 실행 실패를 제거 | `doctor`와 설정 안내가 동작 |
| 2 | TUI command workflow | CLI와 TUI 기능 차이 제거 | Task부터 Run까지 TUI에서 완료 |
| 3 | 승인·Tool safety | MindCraft의 안전성 차별점 시연 | write/command가 승인 전 실행되지 않음 |
| 4 | Knowledge 재사용 | 결과 축적과 재사용 시연 | promote 후 다음 Run context에 포함 |
| 5 | 상태·복구·관찰성 | 실패와 중단도 데모 가능한 흐름으로 정리 | status/history/resume/cancel 확인 |
| 6 | Windows Terminal 검증·릴리스 | 실제 데모 환경에서 재현성 확보 | clean checkout 및 Windows Terminal 리허설 통과 (현재 mock/Linux만 검증) |

## 공통 작업 원칙

- 기존 Pi adapter 경계를 유지한다.
- Model 자동 선택/fallback을 추가하지 않는다.
- 기본값은 fail-closed다.
- 승인 전 side effect를 실행하지 않는다.
- secret은 로그와 결과에서 redaction한다.
- 실제 provider 테스트와 deterministic mock 테스트를 분리한다.
- 각 페이즈 종료 시 `npm run build && npm test`를 실행한다.
- 구현보다 먼저 테스트 또는 acceptance scenario를 추가한다.

## 권장 실행 순서

1. Phase 0에서 데모 시나리오와 fixture를 확정한다.
2. Phase 1에서 설정과 preflight를 해결한다.
3. Phase 2에서 TUI command queue와 기본 화면을 완성한다.
4. Phase 3에서 실제 승인 가능한 write/command tool을 연결한다.
5. Phase 4에서 Knowledge 검색·승인·재사용을 화면에 노출한다.
6. Phase 5에서 cancel/resume/history를 안정화한다.
7. Phase 6에서 Windows Terminal + WSL 리허설과 release check를 수행한다.

### Phase 2 구현 상태

Phase 2는 완료되었다. CLI와 TUI가 공통 application command dispatcher를 사용하며,
`CommandQueue`가 비동기 입력을 직렬화한다. 다음 명령이 연결되어 있다.

```text
doctor → task → tasks/use → run → status/runs → resume/cancel → quit
```

Run 중 streaming event와 tool decision을 화면에 표시하고, 상단에 현재
Task/Episode/Run을 표시한다. 중복 실행은 차단되며 cancel 또는 Ctrl-C는
Run을 `aborted`로 저장한다.

### Phase 3 구현 상태

Phase 3는 완료되었다. read/write/command custom tool이 분리되어 있으며,
write와 command는 `pending → approved/rejected → executed` approval lifecycle을
사용한다. TUI와 readline CLI에서 다음 명령으로 승인 대기 작업을 확인·결정한다.

```text
approvals → approve <id> | reject <id>
```

승인 전 side effect는 실행되지 않는다. canonical path와 realpath로 `..` 및 symlink
escape를 차단하고, command allowlist/working directory/timeout/redaction을 적용한다.
결정은 Run history/audit에 저장된다. Windows Terminal 실환경 검증은 Phase 6에서 수행한다.

보완 수행 기록: [Phase 1](phase-01-followup.md) · [Phase 2](phase-02-followup.md) · [Phase 3](phase-03-followup.md) · [Phase 4](phase-04-knowledge-reuse.md) · [Phase 5](phase-05-recovery-observability.md) · [Phase 6](phase-06-windows-release.md)

## Phase 6 수행 기록 — Windows Terminal + WSL 검증·릴리스 준비

상세 기록은 [phase-06-windows-release.md](phase-06-windows-release.md)에 정본으로 남긴다.
현재 판정은 **mock 데모 준비 완료 / Windows Terminal·WSL native 및 live provider 미검증**이다.

Phase 4는 redacted candidate/provenance/revision, promoted-only context builder, 안전한 workspace fallback, Run manifest, preview와 실제 입력 일치, capture retry 경로를 검증했다.

## 데모에서 보류하는 항목

- token-aware dynamic model switching
- 다중 사용자 권한/중앙 서버
- 완전한 IDE 기능
- 자동 provider/model 탐색
- 외부 coding-agent 자동 설치
- 고급 Knowledge graph

## 종료 조건

아래 명령과 시나리오가 모두 성공해야 데모 완료로 판정한다.

```sh
npm run build
npm test
npm run release:check
npm audit --audit-level=high
```

그리고 Windows Terminal + WSL에서 다음 흐름을 중단 없이 수행한다.

```text
doctor → task → run → approval → result → promote → second run → status
```

## Phase 0 acceptance baseline

Phase 0 fixes the input before any provider is involved. The canonical workspace is
`examples/release-demo/`; it contains a small release checklist module, one test, and
release notes. It has no network dependency, credential, personal information, or
production data.

Create or refresh it from an empty checkout with:

```sh
node --input-type=module -e "import { createReleaseDemoWorkspace } from './src/demo-fixture.mjs'; await createReleaseDemoWorkspace('examples/release-demo')"
```

Validate the exact file set and safety boundary with:

```sh
node --input-type=module -e "import { validateReleaseDemoWorkspace } from './src/demo-fixture.mjs'; const result = await validateReleaseDemoWorkspace('examples/release-demo'); console.log(JSON.stringify(result, null, 2)); if (!result.valid) process.exitCode = 1"
```

### Fixed acceptance states

| Scene | Expected state | What the audience should see |
|---|---|---|
| Successful release check | `completed` | The three checklist items and test/documentation summary are returned. |
| Risky operation | `pending_approval` | A write or command outside the granted scope pauses before side effect. |
| Rejected operation | `denied` | The operation is not executed and the denial reason is recorded. |
| Knowledge reuse | `promoted_then_reused` | A reviewed candidate is promoted and appears in the next Run's approved context. |

### Five-minute script

1. **0:00–0:30 — context:** Open Windows Terminal, enter WSL, and show the clean
   `examples/release-demo` fixture. Run the validator so the audience sees a stable
   starting point.
2. **0:30–1:15 — task:** Run `doctor`, create a release-readiness Task, and show the
   selected user-configured Model and provider availability before execution.
3. **1:15–2:30 — success:** Run the fixed prompt. Point out the completed Run,
   checklist result, and persisted history.
4. **2:30–3:20 — safety:** Ask for the intentionally risky write/command. Stop at the
   approval prompt, then demonstrate both approve and reject as separate outcomes.
5. **3:20–4:20 — Knowledge:** Review the captured candidate, promote it, and run the
   same prompt again. Highlight that only promoted Knowledge is reused.
6. **4:20–5:00 — close:** Show `status`/history and explain that the same fixture and
   deterministic mock make the result reproducible.

### Provider policy

The deterministic mock provider is the default for tests and rehearsals: it makes no
network request and needs no credential. A real provider is an explicit, separate
verification path; it requires the user's configured credential, may be unavailable,
and is not substituted automatically. Never put that credential in the fixture or
commit it to the repository.

## Phase 5 수행 기록 — 상태·복구·관찰성

### 기준선

- 시작 branch: `master`
- 시작 HEAD: `1feef1e88472ebe75c8dceb6a72be29fd1ad03ba`
- 시작 working tree: clean; staged/unstaged 변경 없음
- 기존 충족 항목: Phase 4까지의 Knowledge manifest/capture retry와 기존 cancel/resume 기본 경로는 108개 테스트로 확인

### 이번 변경

- `WorkflowRepository`와 `JsonlCheckpointStore`가 첫 torn tail 또는 checksum 오류에서 replay를 중단하고 valid prefix만 사용한다. `repair()`는 손상 원본을 timestamp 백업으로 보존하고 valid prefix로 새 journal을 만든 뒤 후속 append를 유지한다.
- 상태는 별도 DB 없이 repository replay에서 구성한다. Run별 Task/Episode/Model/purpose/latest event, approval 요약, Knowledge manifest/capture, 오류와 next action, journal 손상 정보를 `MindCraftApp.status()`/`getRunStatus()`로 제공하고 CLI `status`와 `history`에서 노출한다.
- terminal Run은 reload 때 변경하지 않는다. process interruption으로 남은 running만 recoverable로 바꾸며, `tool_execution_started` 후 결과가 없는 Run은 `unknown`으로 표시하고 resume을 차단한다.
- resume은 새 Run에 `resumedFrom`을 최초 checkpoint부터 기록하고 이전 Run을 보존한다. session dispose는 한 번만 시도하며 cleanup 오류가 terminal 결과를 되돌리지 않는다. cancel의 늦은 abort 오류도 terminal 상태를 덮지 않는다.

### 실제 검증

- `npm run build` — 통과
- `npm test` — 통과, 111 tests / 111 pass / 0 fail
- `node --check src/workflow-repository.mjs && node --check src/safety-recovery.mjs` — 통과
- 추가한 `test/phase-05-recovery-observability.test.mjs`가 valid-prefix repair/원본 보존/후속 기록, 결과 없는 external effect의 unknown 차단, terminal reload를 검증한다.
- Windows Terminal/WSL 실환경, 실제 강제 kill 및 live provider 호출은 이 환경에서 수행하지 않았다.

### 남은 문제와 다음 조건

- journal과 외부 side effect 사이에 원자적 exactly-once 보장은 없다. 결과가 없는 execution은 read-only 확인 또는 사용자 확인 없이는 재실행하지 않는다.
- 실제 child process 강제 종료와 Windows Terminal 리허설은 Phase 6에서 수행해야 한다.
