# Phase 0 — 데모 기준선과 Sample Fixture

## 목표

개발자마다 다른 환경이나 입력 때문에 데모가 흔들리지 않도록, 대표 시나리오와 sample workspace를 고정한다.

## 작업

1. `examples/release-demo/` sample workspace를 만든다.
2. 릴리스 점검에 사용할 작은 코드·문서·테스트 fixture를 추가한다.
3. 성공 결과, 위험 작업 요청, Knowledge candidate의 기대값을 정의한다.
4. 5분 데모 script와 관객에게 설명할 순서를 문서화한다.
5. 실제 provider와 deterministic mock provider의 데모 사용 조건을 구분한다.
6. 데모 데이터에 secret, 개인 정보, 실제 운영 credential을 넣지 않는다.

## 수정 후보

- `examples/release-demo/**`
- `docs/demo-plan/README.md`
- `test/demo-fixture.test.mjs`
- 필요 시 `src/demo-fixture.mjs`

## 완료 조건

- 빈 checkout에서 sample workspace를 생성할 수 있다.
- 동일한 입력으로 기대 결과를 재현할 수 있다.
- 성공·승인·거부·Knowledge 재사용 장면의 기대 상태가 문서화되어 있다.
- 데모용 fixture에 실제 credential이 없다.

## 검증

```sh
npm run build
npm test
```

## 다음 페이즈 진입 조건

sample workspace와 최종 데모 순서가 팀에서 승인되어야 한다.

## 작업 시작 프롬프트

아래 요청을 그대로 사용한다.

```text
MindCraft 저장소를 분석하고 Windows Terminal + WSL 데모용 Phase 0를 구현해줘.

목표:
- examples/release-demo에 안전한 sample workspace를 만든다.
- 릴리스 준비 상태 점검이라는 하나의 데모 시나리오를 고정한다.
- 성공, 승인 요청, 거부, Knowledge candidate에 대한 기대 결과를 테스트로 정의한다.
- 실제 credential이나 개인 정보는 fixture에 넣지 않는다.

제약:
- 기존 Pi adapter와 model routing 정책을 변경하지 않는다.
- 자동 Model fallback을 추가하지 않는다.
- 구현 전에 관련 테스트를 추가한다.

완료 조건:
- sample workspace 생성/검증 테스트 통과
- 데모 시나리오 문서화
- npm run build 통과
- npm test 통과

수정한 파일과 검증 결과를 요약해줘.
```