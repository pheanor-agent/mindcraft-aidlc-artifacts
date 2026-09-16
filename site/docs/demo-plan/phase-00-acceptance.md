# Phase 0 — 데모 기준선과 fixture

## 목적

`examples/release-demo/`를 모든 데모의 고정 입력으로 사용합니다. fixture는 작은
release checklist 코드·문서·테스트로 구성되며 network, credential, 개인 정보,
production data를 포함하지 않습니다.

## 생성과 검증

빈 checkout에서 다음 명령으로 생성합니다.

```sh
node --input-type=module -e "import { createReleaseDemoWorkspace } from './src/demo-fixture.mjs'; await createReleaseDemoWorkspace('examples/release-demo')"
```

검증기는 expected file set, 파일 내용 변경, 누락·추가 파일 및 위험 문자열을
검사합니다.

```sh
node --input-type=module -e "import { validateReleaseDemoWorkspace } from './src/demo-fixture.mjs'; const result = await validateReleaseDemoWorkspace('examples/release-demo'); console.log(JSON.stringify(result, null, 2)); if (!result.valid) process.exitCode = 1"
```

## 고정 기대 상태

| 장면 | 기대 상태 |
|---|---|
| 릴리스 점검 성공 | `completed` |
| 위험한 write/command 요청 | `pending_approval` |
| 사용자 거부 | `denied` — side effect 없음 |
| Knowledge candidate 승인 후 다음 Run | `promoted_then_reused` |

## Provider 사용 조건

- deterministic mock provider: 기본 테스트와 리허설에 사용하며 network와 credential이
  필요 없습니다.
- real provider: 명시적인 provider 검증에서만 사용하며 사용자가 설정한 credential이
  필요할 수 있습니다. unavailable일 때 자동 fallback하지 않습니다.

## 5분 데모 순서

1. Windows Terminal + WSL에서 fixture를 생성하고 검증합니다.
2. `doctor`와 release-readiness Task를 실행하고 Model/provider 상태를 확인합니다.
3. 고정 prompt로 성공 Run을 실행합니다.
4. 위험 작업 승인 화면에서 승인과 거부 결과를 각각 보여줍니다.
5. Knowledge candidate를 검토·promote하고 같은 prompt를 다시 실행해 재사용을 보여줍니다.
6. `status`/history로 결과가 저장된 것을 확인합니다.
