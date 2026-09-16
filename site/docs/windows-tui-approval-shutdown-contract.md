# JOB-72 — Windows TUI·approval·shutdown·recovery 계약

- 작업 방식: **DDT 기본 작업 워크플로우**
- 상태: **설계 완료 — 리뷰 대기**
- 실제 TUI 실행/IME 검증: **미수행**

## 1. TUI 상태

```text
Boot → Welcome → Workspace → Setup → Ready → Home
Home → TaskSelect → RunPreparing → Running
Running → ApprovalPending → Running
Running → Completed | Failed | Aborted | Unknown
Any state → Help | Settings | ExitConfirm
```

TUI는 입력·표시만 담당한다. Task/Episode/Run, approval, persistence 상태는 App/repository가 확정한다.

## 2. Input/출력 계약

- 원본 message/event 배열을 저장하고 화면 폭에 따라 재렌더링한다.
- `render()` 결과를 journal/transcript 원본으로 저장하지 않는다.
- 최근 1,000 message 또는 2 MiB 중 먼저 도달한 상한을 적용한다.
- 한글 IME 조합·삭제·붙여넣기와 한글/영문/공백 경로를 하나의 입력값으로 보존한다.
- 비밀번호 입력은 일반 history/transcript에 전달하지 않는다.
- 색상만으로 상태를 구분하지 않고 텍스트 상태를 함께 표시한다.
- 좁은 창에서는 최소 너비 안내 또는 단일 열 화면을 사용한다.

## 3. Approval panel

표시 항목:

- immutable requestId
- RunId
- operation kind
- canonical target
- executable/args/cwd
- 변경 diff 또는 전후 요약
- impact/risk
- approval scope
- 현재 status

동작:

```text
request normalized
→ scope check
→ pending journal
→ 사용자 approve/reject
→ decision journal
→ execution_started journal
→ effect
→ result/failed/unknown
```

중복·늦은·다른 Run의 결정은 무효화한다. Knowledge promote는 실행 승인이 아니다.

## 4. Command/Run 응답성

Approval·status·cancel·quit는 장시간 queue에 막히지 않는 별도 control 경로로 처리한다. 일반 prompt 실행은 CommandQueue로 직렬화한다. 실행 중 새 Run은 차단한다.

## 5. ShutdownCoordinator

모든 종료 원인을 한 번만 처리한다.

```text
new input 차단
→ active Run cancel 요청
→ pending approval invalidate
→ session unsubscribe/dispose
→ child process tree cleanup
→ Run/session journal flush
→ lock release
→ terminal restore
→ launcher exit code
```

- Escape: 뒤로/닫기
- Ctrl-C: 실행 중이면 cancel, idle이면 종료 확인
- EOF/window close: 동일 coordinator 사용
- 강제 종료는 flush를 보장하지 않는다고 가정

## 6. Recovery

다음 시작에서:

- 종료 기록 없는 Run을 recoverable로 분류
- started 후 result 없는 effect를 unknown으로 분류
- unknown effect 자동 재실행·자동 승인 금지
- 원본 Run을 보존하고 새 Run에 `resumedFrom` 연결
- 새 Run에서 model/mode/scope/approval을 재평가

## 7. 검증 계획

오프라인 검증:

- streaming 중 approvals/status/cancel 응답
- 중복 approval 무효화
- 승인 전 side effect 없음
- cancel 시 pending approval 무효화
- 종료 후 session/lock/journal 정리
- reload 후 recoverable/unknown 분류
- 원본 Run 보존과 새 Run 연결

실제 Console Host/Windows Terminal, IME, resize, 창 닫기 검증은 구현 후 별도 수행한다.
