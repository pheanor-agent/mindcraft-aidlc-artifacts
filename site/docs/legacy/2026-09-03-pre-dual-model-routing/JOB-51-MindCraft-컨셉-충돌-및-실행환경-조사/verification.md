# JOB-51 검증 계획

## 설계 산출물 확인

- [x] manifest 존재
- [x] request 존재
- [x] design 존재
- [x] review 존재
- [x] execution-review 존재
- [x] workflow state 존재
- [x] HACKATHON.md에 컨셉 충돌과 조사 결과 반영
- [x] README.md에 Windows-first 방향 반영
- [x] ENVIRONMENT.md에 OS/CLI matrix 반영

## 실행 전 acceptance

- [x] MVP 범위가 OpenCode/Claude Code 기본 harness preflight와 사용자 등록 provider schema로 제한됨
- [x] 공통 backend registry, role profile, provider registration, deterministic mock 구현
- [x] OpenCode/Claude Code CLI preflight가 executable을 자동 설치하지 않고 감지 결과만 반환
- [x] Windows runner용 build/test/release-check workflow 작성
- [ ] Windows runner에서 build/test/release-check 통과 (workflow 작성 완료, 원격 실행 대기)
- [x] 각 CLI preflight가 installed/unavailable을 정확히 표시하는 단위 테스트 통과
- [x] mock adapter가 승인 전 실행을 차단하는 단위 테스트 통과
- [ ] 승인 전에는 subprocess가 실행되지 않음
- [ ] timeout/cancel이 process tree를 정리함
- [ ] cwd escape와 environment 전달이 차단됨
- [ ] stdout/stderr와 Run 결과에 secret이 없음
- [ ] 지원 조합별 Supported/Conditional/Unavailable 판정이 재현됨

## 오버엔지니어링·SSOT acceptance

- [x] CLI/server/MCP를 이번 구현 범위에서 분리함
- [x] optional capability와 필수 capability를 구분함
- [x] 현재 구현과 설계 후보의 상태 표기를 정의함
- [x] 문서 충돌 시 `src/` 및 JOB-51 acceptance를 우선하는 계층을 정의함
- [x] README의 현재 지원 문구가 실제 구현 상태와 일치하는지 최종 read-back
- [x] Airouter/Codex가 제품 기본 provider가 아닌 개발·테스트 fixture로 구분됨
- [x] OpenCode/Claude Code가 제품 기본 harness 요구사항으로 구분됨
- [x] CLI 외 HTTP API/local server/SDK/GUI/MCP의 역할과 우선순위를 구분함
- [x] Model API, coding harness, tool/context 계층을 분리함

## 현재 판정

설계·문서화 단계: PASS
로컬 구현·검증 단계: PASS (87 tests)
Windows runner 단계: 원격 실행 대기
실제 OpenCode/Claude Code 실행 adapter: 후속 범위
