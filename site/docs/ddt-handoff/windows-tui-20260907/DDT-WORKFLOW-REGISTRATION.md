# DDT 로컬 작업 워크플로우 등록 결과 — JOB-69

- 등록 시각: 2026-09-07 현재 세션
- 프로젝트: `ddt-mindcraft/mindcraft`, `master`
- 성격: 기존 AI-DLC 재개발과 분리된 Windows 검증 작업의 외부 사후 접수
- 사용자 요청: `작업 워크플로우 방식으로 이력 남겨야 돼. 에이전트에게 직접 요청해봐`

## 실제 사용한 시스템

- 워크플로우 방식: DDT 표준 JOB workflow-agentic 9단계
- 등록 스크립트: `/opt/data/scripts/create-job.sh` v3
- 상태 파일: `/opt/data/workspace/jobs/JOB-69-MindCraft-Windows-빌드·TUI-검증-수정-작업-외부-사후-접수/.workflow-state`
- 작업대장: `/opt/data/workspace/JOB-QUEUE.md`, `/opt/data/workspace/JOB-INDEX.md`
- 감사 기록: 같은 JOB 폴더의 `.workflow-audit.log`
- 공식 gate wrapper: `/opt/data/scripts/workflow-gate.sh`

## 등록 결과

- 작업 ID: `JOB-69`
- 실행 ID: 없음. 외부 과거 실행을 추정하지 않음.
- 현재 상태: `running`, `currentStep=request`, `request=in_progress`
- 등록 결과: 실제 create-job.sh 생성 성공
- 이벤트/단계 기록: JOB 폴더의 `.workflow-audit.log`, `phase-record.md`
- 산출물 연결: JOB 폴더의 `artifacts-manifest.json`에서 커밋·릴리즈·보고서·로컬 증거 디렉터리를 연결
- 후속 작업 ID: 없음. 번호 충돌 및 gate 장애 중 임의 ID 생성하지 않음

## Gate 차단

`HERMES_ROOT=/opt/data /opt/data/scripts/workflow-gate.sh --help` 실행 결과:

```text
⛔ BLOCKED: canonical workflow gate unavailable
```

따라서 `request → investigation` 전이만 차단됐다. `.workflow-state`를 직접 전이하거나 PASS/완료를 위조하지 않았다. investigation 이후의 정식 전이는 모두 이 선행 차단 때문에 수행하지 않았다.

## 작업대장 번호 충돌

스크립트는 실제 JOB 디렉터리 스캔 기준으로 JOB-69를 배정했지만, 기존 `JOB-QUEUE.md`와 `JOB-INDEX.md`에는 다른 Windows launcher 작업의 JOB-69 행이 이미 존재했다. 기존 행이나 AI-DLC 원본을 덮지 않았으며 충돌을 `intake-investigation.md`와 감사 로그에 남겼다. 이 충돌은 작업대장 정리 후 gate 복구 시 운영 후속으로 처리해야 한다.

## 연결된 외부 결과

- 기준 제품 소스: `9de0f2c52f8294ba71f9072b719ae46e13ce9058`
- Windows 빌드/CLI 검증 문서 커밋: `307885183b1ad09870450b30de7cac97da9f9f8b`
- 수정 커밋: `1e3c5317069bb1614e473f6690a35f574bafd710`
- 증거 문서/스크린샷/DDT 접수 커밋: `0ed48db2c85231b20fc9b4cba95ea6f9a37fe931`
- 보존 릴리즈: https://github.com/ddt-mindcraft/mindcraft/releases/tag/v0.1.0-windows-preview.20260907.1
- 수정 테스트 프리릴리즈: https://github.com/ddt-mindcraft/mindcraft/releases/tag/v0.1.0-windows-preview.20260907.2
- 보고서: https://github.com/ddt-mindcraft/mindcraft/blob/master/docs/windows-tui-validation-2026-09-07.md
- 로컬 증거: `/opt/data/workspace/mindcraft/artifacts/windows-tui-20260907`

## 상태 구분

- 완료된 외부 수정 3건: transcript 렌더 누적, setup 후 Model/초기 안내, quit 프로세스 종료.
- 검증: 신규 회귀 0/3 → 3/3, `npm run build` 통과, ConPTY `--tui --mock`, 한국어 붙여넣기, task/tasks, 상태줄, 수정 후 quit exit 0.
- 기존 실패: 전체 회귀 155건 중 141 통과, 기존 실패 14건 유지. 해결로 기록하지 않음.
- 미검증: Windows Terminal 앱, IME, resize, LLM, 강제종료 process tree, 승인·취소·LLM Run 전체 흐름.
- 구현 담당: Windows 검증 작업의 Codex/Astra. DDT 구현으로 기록하지 않음.
- 정식 릴리즈 승인: 아님.
- AI-DLC 단계/승인 변경: 없음.

## 조회 확인 근거

재조회 결과는 다음과 같다.

1. JOB 폴더가 실제 존재한다.
2. `.workflow-state`를 다시 읽어 `JOB-69`, `running`, `request/in_progress`, 후속 단계 pending을 확인했다.
3. `.workflow-audit.log`, `artifacts-manifest.json`, `phase-record.md`가 실제 존재한다.
4. 원격 산출물 디렉터리의 기존 파일은 덮어쓰지 않고 경로로 연결했다.
5. gate 실행은 위 차단 문구로 재현됐다.

이 문서는 보조 요약이며, 실제 workflow 등록은 JOB 폴더와 `.workflow-state`/감사 기록에 있다.

