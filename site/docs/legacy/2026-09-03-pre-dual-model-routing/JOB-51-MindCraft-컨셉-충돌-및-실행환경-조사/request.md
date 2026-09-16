# JOB-51: MindCraft 컨셉 충돌 및 실행환경 조사

## 목적
설치 장벽을 낮추는 Windows-first 제품 경험과 외부 CLI를 통한 Opus/local Model routing 요구의 충돌을 식별하고 지원 가능한 실행환경·adapter 경계를 정의한다.

## 반영 내용
- HACKATHON.md에 두 컨셉의 충돌, 제안 방향, 검증 가정을 기록
- README.md에 Windows-first onboarding 및 Linux/WSL2-capable execution 원칙 기록
- ENVIRONMENT.md에 OS/CLI 지원 matrix와 preflight 검증 범위 기록
- 현재 구현은 Airouter provider만 연결되어 있고 OpenCode/Claude Code adapter는 미구현임을 확인. Airouter/Codex는 제품 기본이 아닌 개발·테스트용으로 분류
- 공식 자료 대조 결과 OpenCode와 Claude Code에 대해 Linux/WSL2 필수라고 확정하지 않고, Windows native를 adapter별 조건부 검증 대상으로 조정
- CLI 외에 Vendor HTTP API, OpenAI-compatible endpoint, local server, OpenCode server/API, MCP 경로를 라우팅 후보로 추가

## 1차 조사 결과

- OpenCode 공식 README: Windows 설치 방식과 Windows desktop artifact가 확인됨
- Claude Code 공식 문서: Windows, Linux, WSL2 경로가 함께 안내됨
- Microsoft WSL 문서: WSL2는 Windows의 Linux 실행 경로이며 MindCraft의 공통 필수 조건으로 볼 근거는 부족함
- 미확정: subprocess/TTY, permission approval, stream/exit, Windows project path, local GPU/backend, usage/cost 수집
- 사용자 등록 provider API/local endpoint는 역할별로 추가한다. 고성능·고비용과 저성능·저비용 Model을 역할별로 혼용할 수 있어야 한다.
- 1차 권장: `ModelProviderAdapter`와 `CodingHarnessAdapter`를 분리하되, MVP의 기본 harness 계약은 OpenCode/Claude Code를 대상으로 설계한다.
- CLI 외 기본 harness 연결 후보: OpenCode headless HTTP/OpenAPI server, OpenCode ACP, Claude Agent SDK. Desktop/browser/IDE 연동은 직접 자동화가 아니라 별도 client integration으로 취급한다.

## 조사·검증 범위
- 공식 문서 기준 OS/설치/headless/권한/출력/비용·usage 계약 확인
- Linux native, WSL2, Windows native의 process/TTY/파일경로/credential/GPU 차이 실험
- OpenCode·Claude Code adapter 공통 interface 설계
- local Model의 하드웨어·용량·성능·privacy·fallback 조건
- routing policy, approval, audit, cancellation, timeout, secret redaction

## 제외
- 승인 전 외부 CLI 자동 설치 또는 credential 수집
- Windows 또는 WSL2 전면 지원 홍보
- 실제 유료 Model 호출을 통한 비용 발생

## 완료 조건
- CLI별 probe 결과와 지원 matrix 문서화
- 최소 한 개 Linux/WSL2 조합에서 deterministic mock adapter contract 검증
- Windows-first UX와 backend 지원 범위가 README에 반영
- 다음 구현 작업의 승인 범위와 미해결 위험 정리