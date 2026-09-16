# Windows 실행 흐름 개선 및 재검증

수정 커밋: `57c859f6ea6f229fe3260dbd5f5a1a18ca530fb6`.
대상: [전날 실행 환경 검증](windows-runtime-stability-2026-09-07.md)의 F1–F4.

## 변경

| 문제 | 개선 |
|---|---|
| F1: mock 설정 후 Airouter를 찾아 Run 실패 | Run은 레지스트리 routing 결과의 provider/model을 실제 런타임에 전달한다. 명시적 모델 선택만 있는 경우 기본 레지스트리도 해당 선택에서 구성한다. 단일 모델 표시도 저장된 설정을 반영한다. |
| F2: 실행 중 approvals 조회 대기 | CLI와 TUI 모두 approvals를 실행 대기열 밖에서 처리한다. CLI 승인 이벤트에 ID와 요청 종류를 표시한다. Promise를 이벤트로 전달하던 중복 callback도 제거했다. |
| F3: 개발용 Node가 없으면 ENOENT | allowlist·승인 검사를 통과한 논리 명령 `node`를 현재 실행 중인 `process.execPath`로 실행한다. shell은 사용하지 않으며 자격증명 환경변수는 전달하지 않는다. |
| F4: 명령 실패인데 completed | command 결과의 종료 코드·spawn 오류·timeout·출력 제한을 기록하고, 실패가 있는 Run과 Episode는 failed로 저장한다. history의 toolFailures에 원인을 보존한다. |

F4는 보수적 정책이다. 한 Run 안에서 명령 실패가 있었다면 이후 세션 종료만으로 성공 처리하지 않는다. 거부된 승인 자체는 실행 실패로 분류하지 않는다.

## 검증 결과

- 전체 Node 22.19.0 회귀: **158개 중 144개 통과, 기존 14개 실패 유지**. 실패 테스트 이름을 이전 결과와 비교했으며 새 실패는 없다.
- 신규 회귀 3개: CLI 성공·명령 실패의 종단 흐름 2개, 실행 대기 중 TUI 승인 목록 조회 1개. 모두 통과.
- 기존 OpenAI-compatible 로컬 SSE 시험도 통과했다. 실제 외부 모델 API 시험은 아니다.
- `npm run build` 통과.
- 별도 Windows 패키지의 실제 `MindCraft.exe`로 동일 CLI 회귀 **2/2 통과**. 기본 mock 설정, 승인 ID 화면 조회, 거부/승인, 성공/실패 Run의 journal 저장을 확인했다.
- 실행 환경: 번들 Node 22.19.0, PATH=Windows System32, 모델 지정 환경변수 및 외부 자격증명 제거. journal에서 승인 ID를 우회 추출하지 않고 CLI 출력으로 진행했다.
- 실제 ConPTY TUI: 시작·설정, 50×15 / 180×50 / 80×24 / 120×35 크기 변경 후 입력 처리 유지, quit 종료 코드 0.
- 패키지 manifest 재생성: 27,602개 파일, 위 sourceRevision 반영. JS 소스 갱신으로 패키지를 재구성했으며 네이티브 launcher와 번들 런타임은 기존 검증본을 재사용했다.

새 패키지 경로에서 제한된 실행 환경의 초기 시험은 시작 출력 timeout으로 실패했다. 일반 실행 권한에서 같은 CLI 시험 2개와 ConPTY 시험을 다시 수행해 통과했다. 초기 실패 로그도 보존하며 이를 제품 정상 동작의 증거로 합산하지 않는다.

## 범위 및 이력

기존 14개 실패, 외부 LLM·장시간 soak·메모리 누수·Windows Terminal 시각 품질 및 IME는 이번에 해결/검증한 것으로 주장하지 않는다. 이전 릴리즈 바이너리는 변경하지 않았으며 이번 작업은 코드 푸시와 검증 패키지 구성이다.

[원시 로그·패치·재현 시험](validation/2026-09-08-runtime-fixes/)을 보존한다. DDT의 기존 정확한 JOB 폴더에 F1–F4 개선 및 검증 결과를 후속 산출물로 접수하도록 직접 요청한다. 기존 JOB 번호 충돌과 canonical gate 문제는 별도 미해결 사항이며 워크플로우 완료를 의미하지 않는다.

## DDT 작업 시스템 반영 확인

DDT에게 직접 요청한 뒤 기존 JOB의 단계·후속·외부 결과·manifest·audit를 재조회했다. F1–F4가 이번 범위에서 수정·재검증됨으로 기록돼 있다. [접수 결과](validation/2026-09-08-runtime-fixes/DDT-WORKFLOW-RECEIPT.md)와 [실제 JOB 파일 확인본](validation/2026-09-08-runtime-fixes/DDT-JOB-VERIFIED.json)을 보존한다. 기존 14개 실패·gate 누락·번호 충돌은 열린 사항이며 상태는 request/in_progress다. [패키지 해시 확인](validation/2026-09-08-runtime-fixes/package-verification.json)에서 변경된 네 소스의 원본·패키지·manifest 일치를 확인했다.
