# JOB-71 — Windows credential/provider/onboarding 계약

- 작업 방식: **DDT 기본 작업 워크플로우**
- 상태: **설계 완료 — 리뷰 대기**
- 실제 credential 저장/live 호출: **미수행**

## 1. Provider 계약

ProviderAdapter는 다음을 함께 소유한다.

- provider 식별·지원 여부
- endpoint 형식과 localhost/remote 구분
- credential 필요 여부
- runtime model 등록
- local validation
- 사용자가 요청한 연결 테스트
- readiness 상태와 오류 code

등록된 provider와 preflight가 서로 다른 기준으로 unknown 처리하지 않도록 `EffectiveConfigResolver` 결과만 사용한다.

## 2. Credential 계약

```js
{
  kind: "wincred" | "env" | "session",
  ref: "wincred:MindCraft/profile/<id>"
}
```

- 원문은 UI·argv·config·journal·transcript·diagnostic에 저장하지 않는다.
- Windows Credential Manager를 1차 후보로 둔다.
- native helper/binding 실패 시 평문 파일 fallback은 금지한다.
- 사용자가 선택하면 session-only로 메모리에서만 사용한다.
- 삭제·교체·저장 취소를 제공한다.
- credential 원문은 provider 호출 직전 제한된 resolver 경계에서만 해석한다.
- 로그 redaction은 key 이름뿐 아니라 token-like value와 오류 문자열에도 적용한다.

## 3. Onboarding 상태

```text
Welcome
→ WorkspaceSelection
→ ExecutionMode
→ ProviderSelection
→ ModelInput
→ CredentialInput
→ LocalValidation
→ SaveReview
→ OptionalConnectionTest
→ Ready/Home
```

각 단계는 `next`, `back`, `cancel`, `help`를 제공한다. 취소 시 부분 설정을 active registry로 commit하지 않는다.

저장 순서:

```text
임시 credential ref 생성
→ 보호 저장 시도 또는 session-only 선택
→ config temp-write
→ config replace
→ commit 성공
→ 임시 ref 정리
```

중간 실패 시 orphan credential을 정리하고 기존 config를 유지한다.

## 4. Readiness

```text
appReady
workspaceReady
configReady
credentialReady
mockReady
connectivity: not_checked | reachable | failed
liveReady
runReady
```

- mockReady는 liveReady가 아니다.
- localReady가 true여도 live provider 호출 성공을 의미하지 않는다.
- 연결 테스트 전 endpoint, 전송 대상, 비용 또는 비용 미확인을 표시한다.
- 연결 테스트를 생략하면 `configured / not_checked` 상태로 Home에 진입할 수 있다.
- live Run은 credential/provider readiness가 충족되지 않으면 fail-closed한다.

## 5. Model 정책

- 0 enabled Model: 실행 차단
- 1 Model: 모든 purpose에 사용
- 2 Model: 각 purpose 명시 요구
- duplicate purpose: 설정 거부
- 자동 fallback/switching: 금지
- Run 시작 시 model/provider/purpose/mode/configRevision snapshot 저장

## 6. 검증 계획

오프라인 설계 검증:

- credential 원문이 각 persistence/logging 경로에 나타나지 않음
- 저장 취소·config write 실패·helper 실패 시 active config가 바뀌지 않음
- mock/live 자동 전환 없음
- 0/1/2 Model과 purpose 오류가 기존 routing과 일치
- provider readiness와 local readiness가 분리 표시됨

실제 환경 검증은 별도 구현 승인 후 Windows에서 수행한다.
