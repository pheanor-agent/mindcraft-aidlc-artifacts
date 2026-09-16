# Phase 5 — 상태·복구·관찰성

## 목표

데모 중 실패·중단이 발생해도 상태를 잃지 않고, 사용자가 다음 행동을 알 수 있게 한다.

## 작업

1. `status`를 사람이 읽기 좋은 화면으로 개선한다.
2. Task/Episode/Run별 상태와 ID를 표시한다.
3. latest event, approval 결과, Knowledge metric을 요약한다.
4. Run 중단 시 aborted, process 재시작 시 recoverable을 명확히 표시한다.
5. recoverable Run에 대해 resume action을 제공한다.
6. 기존 Run을 덮어쓰지 않고 resumedFrom 연결을 유지한다.
7. 실패 원인과 다음 행동을 표시한다.
8. JSONL torn tail과 checksum 오류 복구를 검증한다.
9. session dispose와 event unsubscribe를 성공·실패·cancel 모두에서 보장한다.

## 수정 후보

- `src/mindcraft-app.mjs`
- `src/workflow-repository.mjs`
- `src/tui-runner.mjs`
- `src/tui-adapter.mjs`
- `test/recovery-ui.test.mjs`
- `test/status-summary.test.mjs`

## 완료 조건

```text
Run 실행 중 중단
→ 재시작
→ recoverable 표시
→ resume
→ 기존 Run 보존
→ 새 Run 생성 및 resumedFrom 표시
```

status 화면은 최소 다음을 보여준다.

- workspace
- current Task
- latest Run
- Run status
- Model/purpose
- Knowledge 사용량
- 승인/거부 요약
- next action

## 검증

```sh
npm run build
npm test
```

## 작업 시작 프롬프트

```text
MindCraft 저장소에서 Phase 5인 상태·복구·관찰성을 구현해줘.

목표:
- TUI status를 사람이 읽기 쉬운 요약 화면으로 개선한다.
- interrupted running Run을 recoverable로 표시한다.
- resume은 기존 Run을 보존하고 새 Run을 만들며 resumedFrom을 기록한다.
- cancel, provider/session failure, knowledge capture failure를 서로 구분한다.
- 각 실패 상황에서 사용자가 취할 다음 행동을 표시한다.

제약:
- append-only/checksum persistence를 유지한다.
- 기존 completed/failed/aborted 상태를 recoverable로 잘못 분류하지 않는다.
- session dispose와 unsubscribe를 모든 terminal path에서 보장한다.

완료 조건:
- 중단→재시작→resume 테스트
- status 요약 테스트
- torn JSONL tail 및 checksum recovery 테스트
- npm run build와 npm test 통과
```