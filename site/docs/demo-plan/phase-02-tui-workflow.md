# Phase 2 — TUI Command Workflow

## 목표

Task 생성부터 Run 결과 확인까지를 Windows Terminal TUI 안에서 완료한다.

## 작업

1. CLI와 TUI가 같은 application command를 사용하도록 정리한다.
2. TUI에 `tasks`, `use`, `runs`, `resume`, `cancel`, `doctor`를 연결한다.
3. Knowledge 관련 command의 TUI 진입점을 준비한다.
4. 비동기 입력을 command queue로 직렬화한다.
5. Run 중 입력을 안전하게 처리하고 중복 실행을 막는다.
6. streaming event, tool decision, pending approval 상태를 화면에 표시한다.
7. 현재 Task, Episode, Run을 화면 상단에 표시한다.
8. Ctrl-C와 `cancel`의 상태 저장을 통합한다.

## 수정 후보

- `src/tui-runner.mjs`
- `src/tui-adapter.mjs`
- `src/cli.mjs`
- `src/mindcraft-app.mjs`
- `test/tui-workflow.test.mjs`
- `test/cli-command-queue.test.mjs`

## 완료 조건

TUI에서 다음 흐름이 동작한다.

```text
doctor
→ task release-check
→ run 릴리스 준비 상태를 점검해줘
→ status
→ runs
→ quit
```

- 명령 입력 순서가 뒤섞이지 않는다.
- 실행 중 상태가 표시된다.
- 오류는 화면에 표시되고 process가 비정상 종료되지 않는다.
- cancel 이후 Run이 aborted로 저장된다.

## 검증

```sh
npm run build
npm test
```

## 작업 시작 프롬프트

```text
MindCraft 저장소에서 Phase 2인 TUI command workflow를 구현해줘.

목표:
- Windows Terminal TUI에서 doctor, task, tasks, use, run, status, runs, resume, cancel을 사용할 수 있게 한다.
- CLI와 TUI가 동일한 application API를 사용하게 한다.
- readline/TUI의 비동기 입력이 겹치지 않도록 command queue를 도입한다.
- Run 중 streaming event와 현재 상태를 표시한다.

제약:
- business rule을 UI 코드에 복사하지 않는다.
- 기존 persistence, recovery, model routing 정책을 유지한다.
- side effect tool은 다음 Phase에서 구현하므로 이번 Phase에서는 command routing과 표시 중심으로 작업한다.

완료 조건:
- TUI command flow 테스트 추가
- 빠른 연속 입력 순서 보장 테스트
- cancel 상태 저장 테스트
- npm run build와 npm test 통과

실제 변경 파일과 테스트 출력 요약을 남겨줘.
```