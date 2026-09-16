# MindCraft Windows AI-DLC Stage·Unit Plan

- 상태: **이전 참고 기록 — 기본 작업 워크플로우 문서로 대체됨**
- 주의: AI-DLC가 MindCraft 기본 작업 상태·승인 체계를 대체하지 않는다.
- Construction unit: `windows-distribution-and-first-run`
- 원칙: 기존 MindCraft runtime 정책을 유지하고, Windows 특화 책임은 adapter/native boundary 뒤에 둔다.

## Stage plan

| Stage | 산출물 | Gate |
|---|---|---|
| Inception | requirements, constraints, user stories, acceptance, open decisions, evidence schema | 사람 승인 |
| Design | launcher/bootstrap, workspace, credential, provider, TUI, path/process, packaging 설계 | 설계 승인 |
| Construction | WIN-01~WIN-07 구현 및 offline 회귀 | 구현 검증 gate |
| Verification | WIN-08 clean VM/live/user validation, artifact hash, known limits | 출시 판정 gate |
| Release | installer, runtime ZIP, manifest, licenses, SBOM, signing status, guide | 별도 배포 승인 |

## Construction unit work packages

| ID | 목표 | 완료 조건 |
|---|---|---|
| WIN-00 | Windows 기준선과 환경 실패 분류 | Windows 11 x64 일반 계정 기준선·지원/비지원 목록·재현 기록 |
| WIN-01 | 동봉 runtime과 native launcher spike | 개발 도구 없는 PC에서 Pi 모듈·리소스·mock TUI 시작; 실패 시 기술 재선정 |
| WIN-02 | bootstrap/workspace/기본 TUI | cwd 독립, workspace 확정 후 초기화, 기본 onboarding/home 진입 |
| WIN-03 | effective config/provider readiness | preflight와 runtime이 같은 config snapshot을 사용하고 local/live 상태 분리 |
| WIN-04 | credential broker/onboarding | 보호 저장 또는 session-only, 평문 fallback 없음, 취소·저장 실패 복구 |
| WIN-05 | home/approval/Knowledge UX | 명령 암기 없이 mock Task/Run/승인/Knowledge review 흐름 완료 |
| WIN-06 | Windows path/command/shutdown/lock | containment, process tree cancel, 종료 flush, single writer, recovery 검증 |
| WIN-07 | installer/update/remove/release metadata | 사용자 단위 설치, versioned update/rollback, 데이터 보존, manifest/license/SBOM |
| WIN-08 | clean VM/live/user verification | 필수 시나리오 결과와 artifact hash를 별도 기록 |
| WIN-09 | release decision | 미검증 항목·제한·서명 상태를 포함한 출시 판정서와 별도 승인요청 |

## Gate 규칙

- WIN-00~01은 기술 feasibility를 확인하는 spike이며 결과에 따라 설계를 수정할 수 있다.
- Design 승인 전에는 Construction 코드·native helper·installer를 만들지 않는다.
- Construction 중에도 live provider와 credential 변경은 별도 승인 없이는 수행하지 않는다.
- Windows native 결과, Linux 회귀 결과, mock 결과, live 결과를 하나의 PASS로 합치지 않는다.
- 각 unit은 변경 파일, 테스트 명령, 수동 절차, 산출물 hash, rollback, 알려진 제한을 남긴다.

## Open decisions

1. resume은 같은 Episode의 새 Run으로 확정할지.
2. live provider의 top-level readiness와 credential failure 계약.
3. mock/live를 process와 workspace 중 어느 수준까지 분리할지.
4. workspace context를 명시적 read만 허용할지, 제한된 자동 수집을 허용할지.
5. TUI latency·복구·비용·지원 terminal의 정량 목표.
6. Windows 10/ARM64/UNC/OneDrive의 지원 승격 조건.
