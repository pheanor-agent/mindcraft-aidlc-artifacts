# MindCraft Architecture Baseline

> **Status: BASELINE FROZEN / CODE FREEZE**
>
> 이 문서는 MindCraft 코어 엔진의 안정화 기준선과 의도된 운영 제약을 정의한다.
> 이 기준선 이후에는 안정성 계약을 변경하는 코어 아키텍처 수정, 자동 재시도,
> 프롬프트 자동 절단을 기본 기능으로 도입하지 않는다.

## 1. Baseline Freeze

현재 기준선은 다음 검증 결과를 만족한다.

```text
npm test      → 120 passed, 0 failed
npm run build → passed
```

기존 118개 회귀 테스트는 모두 유지되며, 안정화 동작을 검증하는 테스트가 추가되어
현재 총 테스트 수는 120개다.

### 1.1 적용된 코어 안정화 패치

#### Recovery 실행 결과 기록

대상:

- `src/safety-recovery.mjs`
- `src/workflow-repository.mjs`
- `src/mindcraft-app.mjs`

외부 효과가 있는 Tool 실행은 다음 Journal 순서를 따른다.

```text
Approval pending
→ Approval decision
→ tool_execution_started
→ 외부 효과 실행
→ tool_execution_result
→ executed/failed decision
```

각 실행에는 안정적인 `requestId`가 부여된다. Repository는 모든
`tool_execution_started` 기록에 대응하는 `tool_execution_result`가 있는지 검사한다.

결과 기록이 없는 실행은 효과가 실제로 수행되었는지 판단할 수 없으므로
`unknown`으로 보존하고 자동 재실행하지 않는다. 이를 통해 재시작 과정에서 파일 쓰기,
명령 실행 등 외부 효과가 비결정적으로 중복 실행되는 것을 방지한다.

#### Timeout / Abort 경계

대상:

- `src/command-queue.mjs`
- `src/mindcraft-app.mjs`

`CommandQueue.enqueue()`는 선택적으로 다음 제어값을 받는다.

```js
queue.enqueue(command, { signal, timeoutMs, label });
```

또한 `withTimeout()`과 `CommandTimeoutError`, `CommandCancelledError`를 제공한다.

Run마다 별도의 `AbortController`를 관리하며 다음 Session 경계에 timeout을 적용한다.

```text
session.prompt()
session.waitForIdle()
```

기본 Session timeout은 120초다. timeout 또는 사용자의 `cancelRun()`이 발생하면
Session의 `abort?.()`를 호출하고, Run Controller와 live Session을 정리한다.

이 경계는 논리적 Queue hang과 무한 대기를 방지한다. 이미 수행되었을 수 있는 외부
효과의 불확실성을 자동으로 추정하거나 재실행하지는 않는다.

#### Approval UI Flush 동기화

대상:

- `src/mindcraft-app.mjs`
- `src/command-queue.mjs`

`approve()`와 `reject()`는 비동기 함수이며 Approval Journal의 `flush()`가 완료된
후에만 결과를 반환한다. Command dispatcher도 해당 Promise를 `await`한다.

따라서 UI는 디스크 영속성이 완료되기 전에 승인/거부 성공을 표시하지 않는다.

#### Context Budget Fail-hard

대상:

- `src/mindcraft-app.mjs`

최종 Execution Prompt 전체 길이를 `executionPromptMaxChars`와 비교한다.
기본 한계는 8,000자다.

한계를 넘으면 다음 오류를 발생시킨다.

```text
CONTEXT_BUDGET_EXCEEDED
```

이 검사는 Session 생성 및 Model 호출 전에 수행되며, 원문을 임의로 자르지 않는다.

## 2. Known Limitations & By Design

아래 동작은 미완성 버그가 아니다. 데이터 무결성, 외부 효과의 중복 실행 방지,
LLM Context 의미 보존을 위해 자동화를 의도적으로 배제한 설계다.

### 2.1 Context Budget 제약

`CONTEXT_BUDGET_EXCEEDED`가 발생하면 MindCraft는 다음을 수행하지 않는다.

- Knowledge 원문의 임의 `slice()` 또는 Truncation
- 의미 단위가 보장되지 않는 자동 텍스트 압축
- 누락된 문맥을 추정한 뒤 Model 호출 계속
- 예산을 초과한 Prompt의 강제 전송

임의 절단은 제약조건, 명령, 예외 조건의 일부만 남길 수 있으며 LLM의 잘못된 추론과
환각을 유발할 수 있다. 따라서 MindCraft는 예산을 초과하면 Fail-hard로 즉시 멈춘다.

운영자는 TUI에서 불필요한 과거 Knowledge를 수동으로 검토하고 Demote한 뒤,
필요한 Context만 남겨 다시 실행해야 한다.

자동 요약이나 의미 보존형 압축이 필요하다면 별도의 승인된 기능으로 설계·검증해야
하며, 현재 Code Freeze 기준선에는 포함하지 않는다.

### 2.2 네트워크 Timeout 제약

API 통신이 설정된 시간 안에 완료되지 않으면 Session은 timeout/abort 경로로
안전하게 종료된다.

MindCraft는 다음을 지원하지 않는다.

- 백그라운드 자동 재시도
- timeout 이후 동일 Tool 실행의 자동 재실행
- 외부 효과가 있었는지 추정한 뒤의 자동 resume
- 사용자가 승인하지 않은 다른 Model로의 자동 Fallback

네트워크 응답이 유실된 시점에는 API 요청이 서버에서 처리되었는지, 파일 쓰기나
명령 실행이 완료되었는지 확정할 수 없다. 이 상태에서 자동 재시도하면 외부 효과가
중복될 수 있다.

따라서 timeout 후에는 Run을 안전하게 종료하고, 사용자가 TUI에서 상태를 확인한
뒤 수동으로 재실행해야 한다. `unknown` 효과가 감지된 Run은 자동 resume하지 않는다.

## 3. Stability Contract

Code Freeze 이후 코어 엔진 변경은 다음 계약을 보존해야 한다.

1. 기존 회귀 테스트를 삭제하거나 기대값을 낮춰 통과시키지 않는다.
2. 변경 후 반드시 다음 두 명령을 실행한다.

   ```sh
   npm test
   npm run build
   ```

3. `tool_execution_started`에 대응하는 결과가 없으면 자동 재실행하지 않는다.
4. Approval Journal 영속성이 완료되기 전에 UI 성공 상태를 표시하지 않는다.
5. Session timeout과 abort 이후 live Session 및 Run Controller를 정리한다.
6. Context 예산 초과 시 임의 절단 없이 `CONTEXT_BUDGET_EXCEEDED`로 중단한다.
7. 네트워크 timeout 이후 자동 retry, 자동 Fallback, 자동 Tool 재실행을 하지 않는다.
8. 외부 side effect가 불확실한 경우 Fail-safe 상태를 유지하고 사용자 판단을 요구한다.
9. Credential, API key, token 등 비밀값을 Journal, Knowledge, 오류 메시지에 기록하지 않는다.
10. AI-DLC Phase는 개발·검증 방법론이며 MindCraft Runtime 상태나 실행 엔진으로 추가하지 않는다.

## 4. Change Policy After Freeze

다음 변경은 Code Freeze를 깨는 변경으로 간주한다.

- 자동 Retry 또는 Exponential Backoff 도입
- 자동 Model Fallback 도입
- Context 자동 요약·압축·Truncation 도입
- `unknown` 외부 효과를 자동으로 완료 또는 성공으로 판정
- Approval/Journal 순서 변경
- Task → Episode → Run 구조를 대체하는 새 Workflow Engine 도입
- 기존 Queue, Recovery, Approval 경계를 우회하는 전면 재설계

이러한 변경이 필요할 경우 먼저 별도의 설계 제안, 실패 시나리오, 회귀 테스트,
데이터 복구 전략을 승인한 후 새로운 Baseline을 수립해야 한다.

## 5. Final Status

```text
Baseline construction: DONE
Core architecture: FROZEN
Automatic retry: DISABLED BY DESIGN
Automatic fallback: DISABLED BY DESIGN
Automatic prompt truncation: DISABLED BY DESIGN
Recovery unknown-effect auto-rerun: DISABLED BY DESIGN
Regression baseline: 120 tests passed
Build baseline: passed
```
