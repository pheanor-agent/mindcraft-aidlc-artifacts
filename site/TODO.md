# MindCraft TODO

## 등록된 작업 레지스트리

작업은 Work Item → Task → Episode → Run 순서로 관리한다. 각 Task는 독립 acceptance, 검증 명령, 산출물, 커밋을 가져야 한다.

### MC-ARCH-01 — 실행·저장·복구 계약 정리

- status: `done`
- priority: P0
- dependencies: none
- scope: `DESIGN.md`, `TODO.md`, `docs/SSOT.md`, `docs/demo-plan/README.md`
- acceptance: persistence, side-effect uncertainty, context, cleanup, MVP performance envelope 계약을 명시하고 구현/미구현/보류 항목을 재분류
- verification: 문서 정합성 검토, `npm run build`, `npm test`
- deliverables: 설계 계약, 후속 Task dependency, 메타 기록
- commit: `0f8a3d9354e1a6118cccbe5a01e475c34697be13`

### MC-PER-01 — WorkflowRepository single-writer 적용

- status: `done`
- priority: P1
- dependencies: `MC-ARCH-01`
- scope: `src/workflow-repository.mjs`, `src/safety-recovery.mjs`, recovery tests
- acceptance: append 순서 보장, 저장 실패 전파, repair 후 append 유지, concurrent append 회귀 테스트
- verification: targeted recovery tests, `npm run build`, `npm test`
- deliverables: single-writer persistence, failure/concurrency tests, phase record
- commit: `3ca662609b83282766d6d2e7ec03a8e5f99e3599`

### MC-SAFE-01 — 실행 직전 side-effect 재검증

- status: `done`
- priority: P1
- dependencies: `MC-ARCH-01`
- scope: `src/safety-recovery.mjs`, `src/pi-tools.mjs`, approval/path tests
- acceptance: approval snapshot, decision/start 저장 후 실행, 실행 직전 path 재검증, effect 후 기록 실패 `unknown`
- verification: approval/path/unknown-effect tests, `npm run build`, `npm test`
- deliverables: execution barrier, TOCTOU limitation, regression tests, phase record
- commit: `0694fc20521fbf17e1de5c1015f234112069a76f`

## P0 — 현재 Model routing 정합성

- [ ] Model registry와 purpose validation 보강
- [ ] Model 0개·1개·purpose별 2개 정책의 사용자 안내 보강
- [ ] routing reason, selected model, purpose, availability audit 저장
- [ ] 현재 Episode 시작 시 1회 선택 동작을 검증하는 테스트 유지
- [ ] build/test/release-check 재검증

## P0 — 제품 실행 흐름

- [ ] Pi AgentSession과 terminal TUI의 실제 interactive smoke 검증
- [ ] session 생성·prompt·idle·abort·dispose 흐름 검증
- [ ] Task/Episode/Run 상태 전이와 recovery acceptance 보강
- [ ] execution root·scope·approval·redaction 경계 검증

## P1 — Knowledge 품질과 안전성

- [ ] Knowledge candidate와 promoted artifact의 상태 표시 보강
- [ ] provenance와 raw data reference 검증
- [ ] 관련 Knowledge → 전체 promoted Knowledge → 실행 폴더 파일 fallback 검증
- [ ] oversized item·검색 경계·redaction 테스트 유지
- [ ] 기존 Knowledge 데이터의 분류·migration 필요성은 별도 승인 후 검토

## P1 — 사용성·배포

- [ ] task/run/status/knowledge/promote/resume 흐름 onboarding 개선
- [ ] Windows Terminal compatibility smoke
- [ ] clean checkout 설치 검증
- [ ] package artifact와 문서 목록 검증

## P2 — 후속 제안

- [ ] Token Switching 설계 검토
  - 현재 기능이 아님
  - context 크기, prompt 복잡도, 작업 목적, 위험도, token budget, 검증 결과를 신호로 사용
  - 초기에는 자동 전환이 아니라 사용자 승인 기반 제안
  - actual usage와 estimate를 명확히 구분
- [ ] verification feedback loop 설계
- [ ] history graph/curator 필요성 검토

후속 제안은 source·schema·test·승인 근거가 생기기 전까지 현재 기능으로 문서화하지 않는다.

## 승인 대기 작업 등록 — AI-DLC 재개발 결정 반영

> 상태: `done`
> 원칙: 사람 승인 후 구현·검증 완료. 병렬 멀티 세션은 별도 범위로 남긴다.

### MC-SESSION-01 — 순차 멀티 세션 및 재실행 연속성

- status: `done`
- priority: P0
- scope: 여러 번의 MindCraft 프로세스 실행에서 Session/Task/Episode/Run 상태를 복원·분리·연결하는 설계와 검증
- decision: 우선 순차 멀티 세션을 지원한다. workspace당 active Run 하나를 유지하고, 동시 writer/병렬 session은 별도 lock 설계 전까지 차단한다.
- acceptance:
  - 첫 session이 저장한 Task/Run/Knowledge를 두 번째 session이 정확히 복원
  - session identity와 Run/Task 관계가 history에 남음
  - 종료·재시작·recoverable Run·resume 시 상태가 중복되거나 되돌아가지 않음
  - 같은 workspace의 동시 writer는 명확한 차단 오류를 표시
  - 서로 다른 workspace의 session은 서로의 state를 읽거나 쓰지 않음
  - 늦은 event가 종료된 session/Run 상태를 변경하지 않음
- dependencies: `MC-ARCH-01`, `MC-PER-01`, `MC-SAFE-01`
- verification: multi-session restart/reload, recoverable Run, writer exclusion, late-event tests

### MC-DIAG-01 — Doctor 상태 분리

- status: `done`
- priority: P0
- scope: 로컬 환경 진단과 실제 provider 실행 가능성 진단 분리
- decision: `doctor`는 local readiness, storage, model registry, provider readiness를 별도 결과로 표시한다. provider credential/availability가 없으면 실제 live Run은 fail-closed한다. offline/mock 진단은 별도로 가능하다.
- acceptance:
  - provider credential 누락이 전체 `ok`에 가려지지 않음
  - local/mock 가능 여부와 live provider 가능 여부를 각각 표시
  - live Run이 provider readiness를 통과하기 전 session/effect를 시작하지 않음
  - 진단 결과가 실행 전 snapshot/history에 남음
- dependencies: `MC-SESSION-01`
- verification: missing provider, mock-only, live-ready, no-side-effect preflight tests

### MC-MODE-01 — Mock/Live 프로세스 경계

- status: `done`
- priority: P0
- scope: mock과 실제 provider의 process/workspace 분리 및 setup 정책
- decision: mock과 live provider는 기본적으로 별도 process/workspace로 운영한다. 실행 중 provider 전환은 허용하지 않으며 재시작 후 다음 Run에 적용한다.
- acceptance:
  - mock session에서 live provider로 암묵적 전환하지 않음
  - live session에서 mock으로 암묵적 전환하지 않음
  - mock 재시작은 명시적인 mock mode 설정을 요구
  - provider/model/mode snapshot이 Run에 저장
  - credential 원문을 config·history·log에 저장하지 않음
- dependencies: `MC-DIAG-01`
- verification: mode separation, restart, provider mismatch, redaction tests

### MC-SCOPE-01 — 실행 폴더 하위 파일 접근 기본 정책

- status: `done`
- priority: P0
- scope: agent custom tool의 read/write/create/delete 기본 범위
- decision: 실행된 folder(execution root) 하위만 기본 scope로 제공한다. root 밖 접근은 기본 거부하며, 필요한 경우 구체적 대상과 범위를 표시한 사용자 승인을 요구한다.
- acceptance:
  - root 하위의 허용 파일 접근은 기본 허용 정책에 따라 동작
  - `..`, absolute path, symlink/junction/reparse escape, root 밖 경로는 fail-closed
  - `.mindcraft` control files, credential/secret 의심 파일은 일반 agent 대상에서 제외
  - root 밖 접근은 ApprovalRequest와 audit event를 남김
  - 승인 전 side effect가 발생하지 않음
  - context manifest에 사용·제외 파일과 이유가 기록됨
- dependencies: `MC-SAFE-01`, `MC-DIAG-01`
- verification: contained path, traversal, symlink, control-file, approval, manifest tests

### 등록된 작업의 진행 순서

```text
MC-SESSION-01 설계
→ MC-DIAG-01 doctor 계약
→ MC-MODE-01 mock/live 경계
→ MC-SCOPE-01 execution-root scope
→ 통합 acceptance 및 release rehearsal
```

네 작업 모두 이번 승인요청의 승인 범위에 포함되며, 승인 전에는 `proposed` 상태를 유지한다.
