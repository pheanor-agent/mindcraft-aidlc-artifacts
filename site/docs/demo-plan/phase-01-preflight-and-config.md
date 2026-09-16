# Phase 1 — 초기화·Preflight·Model 설정

## 목표

새 사용자가 설정 파일을 직접 편집하지 않고도 데모를 시작할 수 있게 한다.

## 작업

1. `mindcraft init` 명령을 추가한다.
2. `mindcraft doctor` 명령을 추가한다.
3. Model registry 설정 상태를 TUI 첫 화면에 표시한다.
4. Model 0개, 1개, 2개 및 purpose 오류를 읽기 쉬운 메시지로 안내한다.
5. provider/credential은 값 자체를 출력하지 않고 상태만 표시한다.
6. workspace root와 state/knowledge 저장 가능 여부를 진단한다.
7. 데모용 설정을 초기화하는 경로를 제공한다.
8. preflight 실패 시 AgentSession 또는 외부 Model 호출을 만들지 않는다.

## 수정 후보

- `src/cli.mjs`
- `src/config-store.mjs`
- `src/mindcraft-app.mjs`
- `src/tui-runner.mjs`
- `src/model-routing.mjs`
- `test/preflight.test.mjs`
- `test/config-flow.test.mjs`

## 완료 조건

```text
mindcraft doctor
```

실행 결과에 다음이 표시된다.

- Node.js
- Pi runtime
- workspace
- Model registry
- provider availability
- credential 상태
- storage 상태

Model이 없으면 실행을 차단하고 다음 명령을 안내한다.

```text
mindcraft config add-model
```

## 검증

```sh
npm run build
npm test
```

추가로 다음 시나리오를 검증한다.

- 빈 config
- 잘못된 config
- Model 1개
- purpose가 다른 Model 2개
- unavailable Model
- credential 값 redaction

## 작업 시작 프롬프트

```text
MindCraft 저장소에서 Phase 1인 초기화·Preflight·Model 설정을 구현해줘.

목표:
- 사용자가 config JSON을 직접 편집하지 않고 데모를 시작할 수 있게 한다.
- mindcraft init과 mindcraft doctor를 제공한다.
- 첫 실행 화면에서 workspace, Model, provider, storage 상태를 보여준다.
- preflight 실패 시 AgentSession과 외부 Model 호출을 만들지 않는다.

반드시 지킬 정책:
- Model 0개는 fail-closed
- Model 1개는 모든 용도에 사용
- Model 2개는 서로 다른 purpose에 명시적으로 매핑
- 자동 Model 추가와 자동 fallback 금지
- credential 원문을 출력하지 않음

완료 조건:
- 빈/잘못된/정상 config 테스트 추가 및 통과
- doctor 출력과 actionable error 구현
- npm run build 통과
- npm test 통과

변경 파일, 정책 영향, 테스트 결과를 보고해줘.
```