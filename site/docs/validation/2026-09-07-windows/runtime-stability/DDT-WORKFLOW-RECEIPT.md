# DDT Workflow Receipt — JOB-69 후속 Windows 실행 환경 검증

접수일: 2026-09-07
접수 주체: DDT agent (RimboDDT)
수행 주체: Codex (구현 및 Windows 실행)
접수 유형: 기존 JOB-69에 대한 외부 후속 산출물 접수·검토

## 대상 JOB

정확한 JOB 경로:

`/opt/data/workspace/jobs/JOB-69-MindCraft-Windows-빌드·TUI-검증-수정-작업-외부-사후-접수`

JOB 번호 충돌이 있으므로 번호만으로 다른 작업을 갱신하지 않았고, 새 후속 JOB도 만들지 않았다.

## 접수 산출물

- 보고서: `WORK-RESULT.md`
- 원시 결과 및 로그: `runtime-stability-diagnostic/`, `runtime-stability-extended/`, `runtime-stability-final/`, `runtime-stability-recovery/`, `runtime-stability-force/`
- 접수 메타데이터: `RECEIPT.json`
- 이번 접수 기록: `DDT-WORKFLOW-RECEIPT.md`
- JOB manifest 연결: `/opt/data/workspace/jobs/JOB-69-MindCraft-Windows-빌드·TUI-검증-수정-작업-외부-사후-접수/artifacts-manifest.json`

## 검토 판정

기본 저장·종료·복구, 반복 실행, workspace lock 충돌, 취소 후 복귀, ConPTY resize, 강제 종료 및 stale lock 복구 등 안정성 보조 시나리오의 증거를 기존 JOB-69에 연결했다.

정상 설정에서 Run/승인/명령 실행으로 이어지는 기능 흐름은 출시 차단 결함 때문에 통과로 판정하지 않는다. DDT는 구현·제품 수정·릴리즈를 수행하지 않았으며, 정식 릴리즈 승인도 부여하지 않았다.

시험 harness의 timeout, 시작 완료 전 판정, 제한 환경의 권한 오류, 비동기 종료 관측 시점 오류에 대한 정정이 `WORK-RESULT.md`에 포함되어 있다. 따라서 raw `results.json`의 pass 수를 합산하거나 통과율로 해석하지 않았다.

## 미해결 결함 / gate

- F1: 설정한 Model과 실제 실행 Model 불일치로 기본 환경 Run 실패
- F2: Run 중 `approvals` 조회가 CommandQueue에 막혀 일반 승인 흐름 불가
- F3: 번들 Node가 하위 명령 탐색에 사용되지 않아 `spawn node ENOENT`
- F4: 명령 실패(code=null/error)가 있어도 Run/history가 `completed`로 표현됨

위 F1–F4 해결 및 기본 환경 재검증은 미해결 gate다. 기존 전체 회귀 실패 14건과 실제 LLM/네트워크, Windows Terminal·IME·설치/업데이트 범위도 별도 후속 확인 대상이다.

## Workflow 상태

현재 실제 state 파일:

`/opt/data/workspace/jobs/JOB-69-MindCraft-Windows-빌드·TUI-검증-수정-작업-외부-사후-접수/.workflow-state`

상태는 `running`, `currentStep=request`, `request=in_progress`로 보존했다. canonical workflow gate가 unavailable인 상태에서 investigation/test/execution_review/done으로 정식 전이하지 않았으며, 완료 상태로 변경하지 않았다.

## 변경 파일

JOB-69:

- `phase-record.md` — 후속 시험 이력, 산출물 경로, harness 정정, F1–F4 추가
- `follow-up.md` — 기존 JOB에 연결한 후속 범위와 번호 충돌 방침 추가
- `external-result.md` — 후속 안정성 검증 접수 및 미해결 결함 추가
- `artifacts-manifest.json` — 후속 artifact root·원시 결과·결함 목록 연결
- `.workflow-audit.log` — 후속 접수 및 state 보존 이벤트 추가

Artifact:

- `DDT-WORKFLOW-RECEIPT.md` — 본 접수 검토 기록 신규 작성

## 다음 조치

1. F1–F4 수정 결과가 별도 산출물로 제공되면 동일한 정확한 JOB-69 경로에 추가 접수한다.
2. 기본 설정에서 setup→task→run→approval→command 결과를 재검증하고, 실패 상태 표현을 확인한다.
3. canonical workflow gate가 복구된 뒤에만 정식 단계 전이 여부를 gate로 판단한다.
4. 그 전까지는 JOB-69를 완료 처리하지 않고, 번호 충돌을 이유로 다른 JOB을 갱신하거나 새 JOB을 만들지 않는다.
