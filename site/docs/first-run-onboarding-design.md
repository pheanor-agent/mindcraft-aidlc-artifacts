# MindCraft First-Run Onboarding — Approval Draft

## 목적
실행 파일 하나(`mindcraft`)를 시작한 사용자가 별도 설치·설정 문서를 오가지 않고 TUI 안에서 첫 설정을 완료한 뒤, 일반 실행과 같은 Task → Episode → Run → Knowledge 흐름으로 진입하도록 한다.

## 현재 구현된 vertical slice
- Model registry가 비어도 TUI가 시작되고, 첫 화면에 setup 안내가 표시된다.
- `setup <provider> <model> [purpose]`를 TUI/CLI 공통 dispatcher에서 실행한다.
- credential 값은 받지 않고 reference만 지원하는 기존 경계를 유지한다.
- 설정은 `.mindcraft/config.json`에 저장된다.
- setup 완료 후 동일 프로세스의 preflight/runtime을 갱신한다.
- `setup mock deterministic`은 네트워크 없이 deterministic rehearsal에 진입한다.
- 기존 approval, workflow persistence, Knowledge capture 경로를 우회하지 않는다.

## 사용자 인터페이스 언어 요구사항

기본 사용자 인터페이스는 가능한 한 한국어로 제공한다. 영어는 기술 고유명사, provider/model 이름, 파일 경로, 명령어, 오류 코드처럼 번역하면 식별성이 떨어지는 항목에 한해 유지한다.

### 한국어 우선 대상

- 첫 실행 안내와 setup 설명
- preflight/doctor 결과와 조치 안내
- Task/Episode/Run 상태
- 승인 요청·승인·거부·취소 메시지
- 실행 결과·검증 결과·Knowledge 안내
- 오류 메시지와 다음 행동
- TUI 도움말과 기본 명령 설명

### 영어 유지 대상

- `mindcraft`, `setup`, `doctor`, `task`, `run` 등 CLI 명령어
- provider/model 이름
- 파일 경로와 기술 식별자
- 로그 분석에 필요한 error code

### 추가 구현 설계가 필요한 항목

- 메시지 catalog와 message key 정의
- 상태별 한국어 문구와 다음 행동 문구
- 긴 한국어 문장의 terminal wrapping/resize 규칙
- 한글 입력·삭제·커서 이동·붙여넣기 처리
- 한국어와 영어가 섞인 경로·Model·오류 코드 표시 규칙
- 번역되지 않은 문구를 탐지하는 UI 테스트

## 사용자 흐름
```text
mindcraft
→ First run 안내
→ setup mock deterministic 또는 setup airouter <model>
→ doctor
→ task <목표>
→ run <요청>
→ approval / verify / 저장
→ knowledge / promote
→ 다음 run에서 context 재사용
```

## 정책 및 제한
- Model 0개는 실행 차단한다.
- 자동 Model 탐색·임의 fallback은 하지 않는다.
- 두 Model 운영은 기존 purpose validation을 따른다.
- command/file/network side effect는 기존 approval gate를 따른다.
- mock 결과는 live provider 또는 Windows Terminal 검증 증거로 간주하지 않는다.

## 검증
- 신규 regression: `test/first-run-onboarding.test.mjs`
- 필수: `npm run build`, `npm test`, `npm run release:check`, `npm audit --audit-level=high`
- Windows Terminal native 입력/resize/Ctrl-C는 Windows 환경에서 별도 검증해야 한다.

## 승인 범위
이번 변경은 로컬 제품 코드·문서·회귀 테스트에 한정한다. GitHub push, 배포, credential 변경, 외부 환경 변경은 포함하지 않는다.
