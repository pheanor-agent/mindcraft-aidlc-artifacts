# MindCraft 현재 Model Configuration 정책

> 사용자 결정 반영 baseline. MindCraft는 사용자가 지정한 Model을 사용하며, 자동으로 임의 Model을 선택하거나 추가하지 않는다. 이전 OpenCode/Claude Code 중심 자료는 `docs/legacy/`에 보존한다.

## 목표

MindCraft는 Pi를 뼈대로 사용하고, 사용자가 지정한 Model로 코드·문서 분석, 정리, 목적별 문서 생성·가공 workflow를 실행한다.

## 현재 구현 상태

현재 routing은 **Episode 시작 시 한 번** 실행된다.

```text
Episode 시작
→ purpose 확인
→ Model 선택
→ 전체 Episode 실행
```

현재 구현은 `purpose-based selection`이며, 실행 중 token/context/검증 결과에 따른 `token-aware dynamic switching`은 구현되어 있지 않다. 한 Episode 실행 중 Model을 자동으로 변경하거나 임의로 fallback하지 않는다.

## 설정 규칙

| 설정 | 정책 |
|---|---|
| Model 0개 | 설정 오류, 실행 차단 |
| Model 1개 | 모든 용도에 해당 Model 사용 |
| Model 2개 | 서로 다른 용도에 하나씩 매핑 |
| 동일 용도 Model 2개 이상 | 설정 오류 |
| 자동 Model 추가/임의 선택 | 금지 |
| 지정 Model unavailable | 자동 대체 없이 오류·중단·사용자 조치 안내 |

용도는 사용자가 명시한다. 예를 들어 분석용과 문서 가공용으로 각각 하나씩 지정할 수 있다. 제품이 작업 난이도를 근거로 Model을 임의로 바꾸지 않는다.

## 설정 예시

```json
{
  "models": [
    {
      "id": "user-analysis-model",
      "purpose": "analysis",
      "provider": "user-configured-provider",
      "enabled": true
    },
    {
      "id": "user-document-model",
      "purpose": "document_transformation",
      "provider": "user-configured-provider",
      "enabled": true
    }
  ]
}
```

## 실행·승인 경계

1. 사용자가 지정한 Model 수와 purpose mapping을 검증한다.
2. 실행 전 선택 Model, purpose, provider availability, 예상 비용 또는 `unknown`을 표시한다.
3. Model 0개 또는 동일 purpose 복수 모델이면 실행하지 않는다.
4. 지정 Model이 unavailable이어도 다른 Model로 자동 fallback하지 않는다.
5. 선택 결과와 실패 이유를 session/run history에 저장한다.

## 후속 Token Switching 방향

Token switching은 현재 기능이 아니라 후속 확장안이다. 후보 판단 신호는 다음을 함께 고려한다.

- context 크기와 truncation 여부
- prompt 복잡도
- 작업 목적
- 위험도
- token budget
- 검증 결과, retry 증가, tool 호출량

초기 구현은 자동 전환이 아니라 **승인 기반 전환 제안**으로 한다. 예를 들어 context budget 초과, 검증 실패, retry 증가, 보안 관련 작업이 감지되면 상위 tier 전환을 제안하고 사용자 승인 후에만 전환한다.

```js
{
  fromModel,
  toModel,
  reason,
  trigger,
  approved
}
```

후속 telemetry는 provider가 실제 값을 제공하는 경우 `actual`로 저장하고, 그렇지 않으면 `estimate`로 명확히 구분한다. 후보 항목은 `actualInputTokens`, `actualOutputTokens`, `latency`, `retryCount`, `toolCallCount`, `verificationResult`, `estimatedCost`, `actualCost`, `contextTruncated`, `switchEvents`다.

## Pi 경계

- MindCraft: Model configuration, purpose mapping, session/workflow, approval, Knowledge, recovery 소유
- Pi: agent inner loop, provider/model invocation, 기존 agent interface 소유
- Pi API는 adapter 뒤에 두고 MindCraft 정책이 Pi 내부 동작에 누출되지 않게 한다.

## 비범위

- 외부 coding-agent/CLI 필수 설치
- 자동 난이도 기반 routing
- ensemble 또는 용도별 2개 초과 Model
- 무승인 유료 호출
- AI에 의한 사용자 승인 대체
