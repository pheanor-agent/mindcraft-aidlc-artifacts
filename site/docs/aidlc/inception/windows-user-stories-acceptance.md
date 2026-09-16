# MindCraft Windows 배포·신규 사용자 경험 User Stories 및 Acceptance Criteria

- 상태: **이전 참고 기록 — 기본 작업 워크플로우 문서로 대체됨**
- 입력: `windows-executable-review-approval-request.md`
- 주의: AI-DLC가 MindCraft 기본 작업 상태·승인 체계를 대체하지 않는다.
- 구현 상태: **미착수**
- 범위: Windows 11 x64, 일반 사용자, 사용자 단위 설치, mock/live 명시적 경계

## User stories

| ID | User story | Priority | Acceptance criteria |
|---|---|---:|---|
| WS-WIN-01 | 개발 도구가 없는 사용자가 설치 파일로 MindCraft를 설치하고 실행하고 싶다. | P0 | Node/npm/Git/WSL 없이 일반 계정에서 설치·시작되며 오류 시 창이 즉시 사라지지 않는다. |
| WS-WIN-02 | 사용자가 Explorer, 시작 메뉴, 기존 terminal에서 같은 앱을 안전하게 시작하고 싶다. | P0 | 콘솔 소유권이 중복되지 않고 launcher 재귀 실행·고아 child가 없다. |
| WS-WIN-03 | 처음 실행한 사용자가 안내만으로 workspace를 선택하고 싶다. | P0 | native folder picker 또는 구조화된 경로 입력을 사용하며 확정 전 workspace 파일을 만들지 않는다. |
| WS-WIN-04 | 사용자가 모델과 인증 방식을 화면에서 설정하고 싶다. | P0 | 모델 ID·provider·purpose가 검증되고 API key가 일반 설정·argv·로그에 남지 않는다. |
| WS-WIN-05 | 사용자가 mock으로 외부 연결 없이 첫 흐름을 체험하고 싶다. | P0 | 네트워크 없이 onboarding부터 Task/Run/승인/결과 확인까지 가능하며 live로 자동 전환하지 않는다. |
| WS-WIN-06 | 사용자가 실제 모델 실행 전에 무엇이 전송·변경되는지 확인하고 싶다. | P0 | provider/model/mode/workspace와 비용 미확인 상태가 표시되고 설정된 모델과 실제 호출 모델이 같다. |
| WS-WIN-07 | 사용자가 파일 변경·명령 실행을 직접 승인하거나 거부하고 싶다. | P0 | 승인 전 side effect가 없고, 대상·args·cwd·diff·risk가 표시되며 거부 시 무변경이다. |
| WS-WIN-08 | 사용자가 한글·공백이 있는 경로와 입력을 사용하고 싶다. | P0 | IME 조합·삭제·이동·붙여넣기·resize에서 입력 손실과 경로 분리가 없다. |
| WS-WIN-09 | 사용자가 중단된 작업을 안전하게 이어가고 싶다. | P0 | 기존 Run은 보존되고 새 Run으로 연결되며 unknown effect는 자동 반복되지 않는다. |
| WS-WIN-10 | 사용자가 다시 실행해 이전 workspace와 작업 기록을 이어가고 싶다. | P0 | 순차 session identity/start/close와 Task/Episode/Run이 복원되고 동시 writer는 차단된다. |
| WS-WIN-11 | 사용자가 문제 원인과 다음 조치를 알고 싶다. | P1 | doctor가 local storage/model/mock/live readiness를 분리하고 실행 가능한 조치를 표시한다. |
| WS-WIN-12 | 사용자가 앱을 업데이트·제거해도 작업 데이터를 보존하고 싶다. | P1 | versioned app 교체가 가능하고 기본 제거는 workspace 원본·사용자 기록을 삭제하지 않는다. |

## 공통 acceptance 규칙

1. 모든 P0 시나리오는 offline/mock 단위·통합 테스트와 Windows clean VM 수동 검증을 각각 갖는다.
2. Linux 테스트 통과는 Windows native 완료 증거로 승격하지 않는다.
3. 승인 request는 immutable ID·digest·Run ID에 연결하고 중복·늦은 승인을 무효화한다.
4. `..`, root 밖 경로, symlink/junction/reparse escape, secret-like 파일은 기본 fail-closed한다.
5. 설정 저장·journal flush 실패 시 성공으로 표시하거나 다음 side effect를 시작하지 않는다.
6. 자식 프로세스 취소는 단일 child가 아니라 process tree 전체 종료를 검증한다.
7. 모델 0/1/2개 정책과 자동 fallback 금지는 기존 routing acceptance를 그대로 유지한다.

## 추적 매핑

| User story 묶음 | 설계 구성요소 | 예정 unit | 검증 |
|---|---|---|---|
| WS-WIN-01~02 | launcher/bootstrap/packaging | WIN-01, WIN-07 | artifact smoke, clean VM |
| WS-WIN-03, 10 | WorkspaceService/lock/session | WIN-02, WIN-06 | path/session/restart test |
| WS-WIN-04, 06, 11 | onboarding/CredentialStore/EffectiveConfig/Doctor | WIN-03, WIN-04 | redaction/config/preflight test |
| WS-WIN-05, 07 | TUI/App/approval barrier | WIN-02, WIN-05 | offline flow and approval test |
| WS-WIN-08~09 | TUI/input/ShutdownCoordinator/recovery | WIN-05, WIN-06 | IME/manual, cancel/recovery test |
| WS-WIN-12 | versioned installer/migration | WIN-07 | update/remove/rollback test |
