# Phase 3 — 승인·Tool Safety

## 목표

MindCraft가 위험한 파일 변경과 명령 실행을 사용자 승인 없이 수행하지 않는다는 점을 실제 화면에서 보여준다.

## 작업

1. filesystem read/write custom tool을 분리한다.
2. command execute tool을 추가한다.
3. 모든 tool request에 decision event를 기록한다.
4. `pending → approved/rejected → executed` 상태를 정의한다.
5. TUI에 승인 대기 화면과 y/n 또는 명시적 명령을 추가한다.
6. 승인 전에는 실제 write/command를 호출하지 않는다.
7. workspace 내부/외부 경계를 canonical path 기준으로 검증한다.
8. `..`, 절대 외부 경로, symlink escape를 차단한다.
9. command allowlist, working directory, timeout, stdout/stderr redaction을 적용한다.
10. Run의 `AbortSignal`을 command runner까지 전달하고, cancel/timeout/output-limit 시 child process tree를 정리한다.
11. 실행 종료 확인 전 cancel 완료를 보고하지 않으며, effect 상태와 cleanup 확인 결과를 journal에 남긴다.

## 수정 후보

- `src/pi-tools.mjs`
- `src/safety-recovery.mjs`
- `src/mindcraft-app.mjs`
- `src/tui-runner.mjs`
- `src/tui-adapter.mjs`
- `test/approval-workflow.test.mjs`
- `test/path-security.test.mjs`

## 완료 조건

```text
AI tool request
→ 승인 화면 표시
→ 사용자가 승인/거부
→ 실행 또는 차단
→ Run history에 decision 저장
```

검증할 것:

- read는 허용 scope 안에서만 동작
- write는 승인 전 실행되지 않음
- command는 승인 전 실행되지 않음
- 거부된 작업은 실제 side effect가 없음
- symlink와 `..` escape가 차단됨
- secret이 출력과 audit에 노출되지 않음

## 검증

```sh
npm run build
npm test
```

## 구현 완료 기록

상태: **완료**

구현 위치:

- `src/pi-tools.mjs`: `mindcraft_inspect`, `mindcraft_write`, `mindcraft_command` custom tool
- `src/safety-recovery.mjs`: `ApprovalManager`, canonical/realpath scope 검사, redaction, checkpoint audit 기반
- `src/mindcraft-app.mjs`: approval lifecycle을 Run event와 JSONL repository에 연결
- `src/tui-runner.mjs`, `src/cli.mjs`, `src/command-queue.mjs`: `approvals`, `approve <id>`, `reject <id>` 명령
- `test/approval-workflow.test.mjs`, `test/path-security.test.mjs`: 승인 전 side effect 없음, 승인/거부, traversal/symlink/command deny 검증

read는 허용된 scope와 realpath를 모두 통과해야 실행된다. write와 command는 명시적
approval 없이는 `pending`으로 fail-closed 반환하며 실제 side effect를 수행하지 않는다.
- command는 allowlist, `shell: false`, workspace-bound working directory, timeout을 사용하고
stdout/stderr/error는 redaction 후 반환한다. Run cancel은 AbortSignal로 실행 중 command까지 전파되며,
POSIX process group 또는 Windows `taskkill /T /F`로 자식 트리를 종료한다. command 결과에는
cleanup 확인 여부와 `completed`/`uncertain` effect 상태가 기록된다.

검증 결과:

```text
npm run build  — 통과
npm test       — 166 tests passed
```

기존 model routing과 Pi adapter 경계는 변경하지 않았다.

## 작업 시작 프롬프트

```text
MindCraft 저장소에서 Phase 3인 승인·Tool Safety를 구현해줘.

목표:
- filesystem read/write와 command execute의 실제 approval workflow를 만든다.
- pending, approved, rejected, executed 상태를 저장한다.
- TUI에서 대상, 영향 범위, 위험 설명을 보여주고 사용자의 승인/거부를 받는다.
- approval 전에는 side effect를 절대 실행하지 않는다.

보안 요구:
- default deny/fail-closed
- canonical path와 realpath 기준 root 검증
- .. 및 symlink escape 차단
- command allowlist와 실행 directory 제한
- stdout/stderr 및 error redaction
- 모든 decision을 Run event/audit에 저장

완료 조건:
- 승인/거부 end-to-end 테스트
- 승인 전 side effect 없음 테스트
- path escape/symlink 테스트
- npm run build와 npm test 통과

기존 model routing 및 Pi adapter 경계를 불필요하게 변경하지 말고, 변경 이유를 보고해줘.
```