# MindCraft 개발 협업 조사 보고서

자료 기준일: 2026-09-07. 발표를 위해 DDT에 두 차례 읽기 전용 조사를 요청하고, 응답을 로컬 Git·AI-DLC 산출물·Astra 작업 기록과 대조했다. 날짜는 각 원문과 Git에 기록된 날짜를 따르며, 명시한 승인 시각에는 UTC와 한국 시각을 함께 적었다. 이 문서는 제품 요구사항이나 현재 개발 상태를 갱신하지 않는다.

DDT 조사 호출 세션: `20260907_143253_bd52ac`(광범위 이력), `20260907_143851_3d4daf`(작성자·맥락 분리와 실제 요청 추가 대조). CLI가 반환한 세션 식별자를 사용했다.

## 무엇을 확인했는가

행사 전에는 공용 Discord DDT 에이전트를 통해 여러 팀원이 같은 제품의 개발에 기여했다. DDT가 원본 author ID를 내부 대조한 결과, 초기 제품을 요청한 참여자 A와 협업·Knowledge 방향을 보강한 참여자 B는 서로 다른 사람이었다. 대화는 Discord 스레드별 세션으로 나뉘었고, JOB·문서·Git 이력이 후속 작업의 기준으로 남았다.

본 행사에는 Astra가 기존 제품 지식을 가진 DDT와 Windows의 Claude Code를 연결했다. 실제 기록에서 계획·스토리 작성, 검토 요청, 수정, 재검토, 위임 승인, 변경 기록과 HTML 보고서 생성이 확인된다. 별도 Windows MVP 검증에서는 실제 ConPTY TUI를 브라우저에서 조작하고 문제를 수정했다.

이 자료의 핵심은 **공용 에이전트와 팀의 작업을 이어간 경험이, 다른 에이전트를 조율할 수 있는 제품 지식으로 연결됐다는 것**이다. 모델 순위나 시간 절감률 대신, 실제 행동과 산출물로 그 확장을 보여준다.

## 조사 범위와 출처의 성격

| 원천 | 확인 범위 | 검증 방식 |
|---|---|---|
| DDT 1차 조사 | 8/20–9/7 세션, JOB 목록, Git, 관련 설계와 실행 자료 | 실제 Hermes 호출, 파일 읽기·session search·읽기 전용 terminal |
| DDT 2차 조사 | 8/20–9/6 인간 작성자·thread/session 구조·과거 요청의 후속 반영 | 원본 author ID 내부 대조, SQLite schema/세션 조회, 설정·스크립트 읽기 |
| 제품 Git | 현재 발표 기준선에서 조회 가능한 8/24 이후 커밋 | 로컬 `git log`, 관련 문서·소스 파일과 대조 |
| AI-DLC 워크스페이스 | 실제 검토 원문, 수정 대응표, 승인 파일, 현재 상태, 실행 래퍼 | 직접 파일 읽기, SHA-256 식별 |
| Astra 작업 이력 | `Control WSL ClaudeCode workflow` 전체 페이지, `mindcraft ai-dlc 개발 계속`, `Mindcraft Windows 빌드 테스트`의 조사 시점 이력 | 사용자 요청·실제 도구 호출·결과 대조 |
| Windows 결과 | 수정 전후 실제 TUI 캡처, 회귀 결과, DDT 접수 문서 | 로컬 원본 및 DDT 조사 결과 대조 |

DDT 1차 보고 기준 JOB 디렉터리는 70개, 이름에 MindCraft·AI-DLC·DDT가 포함된 후보는 32개였다. 이는 **검색 후보 수**이며 모두 정독하거나 모두 완료했다는 수치가 아니다. 주요 정독 JOB은 1, 38, 40, 51, 53, 57, 58, 59, 60, 61, 62, 65, 66, 67, 68, 69다. Git의 49건이라는 집계는 `--all`과 조사 기간을 적용한 DDT 저장소 기준으로, 사람별 기여량이나 생산성 지표로 사용하지 않았다.

원격 원문은 DDT가 읽고 보고한 근거다. 이 발표 작성자가 원격 DB의 모든 행을 다시 열람한 것은 아니다. 로컬에서 직접 대조한 자료와 구분한다. 전체 원시 대화, 사용자 ID, 접속 정보, 인증 설정은 저장소에 싣지 않았다. 재확인용 파일 식별자는 [source-manifest.json](source-manifest.json)에 기록했다. 원시 출력에 포함된 내부 추론 텍스트는 인용하거나 발표 근거로 사용하지 않았다.

## 1. 팀의 실제 요청이 제품에 남은 과정

아래 A/B/C는 실명이 아닌 익명 표기다. 별명 차이를 다른 사람으로 세지 않고 DDT가 원본 `user_id` 동일성을 확인했다. 이 확인은 관찰된 세션의 작성자를 구분하며 팀 전체의 인원수를 증명하지 않는다.

| 날짜 | 요청·참여자 | DDT가 남긴 결과 | 근거 |
|---|---|---|---|
| 8/20 | A: “작업 워크플로우와 지식 시스템을 내장한 tui 기반 프로그램” | Pi/OpenCode 검토, loop·Knowledge·checkpoint 설계 | session `20260820_103041_01713bf4`, JOB-1 |
| 8/26–27 | B: “현재 프로젝트 진행 상황, 구조, 동작 설명해줘”; 협업과 지식 활용 보강 | JOB-38 팀 협업·LLM Wiki, JOB-40 개입·Routing 방향 | session `20260826_111934_4b067d35`, [JOB-38 요청](../../legacy/2026-09-03-pre-dual-model-routing/JOB-38-MindCraft-team-collaboration-and-LLM-Wiki-direction/request.md) |
| 8/31 | C: 최종 제품 개념 질문 | 같은 제품을 별도 thread/session에서 조회한 기록 | session `20260831_144551_9f01550c`; 특정 구현 기여까지 연결하지 않음 |
| 8/31 | A: 컨셉 충돌·설치 부담·Windows 실행환경 조사 요청 | JOB-51에서 OS·TTY·권한·외부 CLI 경계 검토 | session `20260831_212533_881a8ea3`, JOB-51 |
| 9/3 | A: “기존에 opencode, claudecode 에이전트를 활용해서 라우팅 하던 방식을 폐기” | JOB-53, 등록 모델과 목적 기반 선택 정책 | [COMMIT-HISTORY](../../../COMMIT-HISTORY.md), `d66af14` |
| 9/3 | A: HTML-first에서 Pi terminal TUI-first로 전환 요청 | JOB-57, Pi AgentSession/pi-tui 재사용 | `1f2eb36`, `a8f2f77` |

8/20 최초 설계가 이후 작업의 배경으로 이어졌고, JOB-38/40/51의 제안은 JOB-53 시점에 legacy로 보존됐다. 그 결과, 새 결정을 반영하면서 이전 제안을 현재 기능으로 혼동하지 않게 했다. B의 요구가 현재 특정 코드 줄을 직접 만들었다고 단정하지 않는다. 확인된 것은 **다른 참여자가 같은 프로젝트의 방향을 보강했고, 그 결과가 후속 설계의 참고 이력으로 남았다는 것**이다.

초기 제품 가설에는 팀 협업·LLM Wiki·외부 coding agent 라우팅이 포함됐다. 최종 로컬 MVP에 팀 계정·공유 backend나 외부 CLI adapter가 모두 구현됐다는 뜻은 아니다. 당시 가설과 현재 범위는 [SSOT](../../SSOT.md)와 [ROUTING](../../../ROUTING.md)을 기준으로 구분한다.

## 2. 공용 DDT의 맥락 분리와 공유

DDT 2차 조사는 첫 답변의 모호한 부분을 다음처럼 정정했다.

| 계층 | 실제 관찰 | 근거 위치 |
|---|---|---|
| 공용 접점 | 같은 Discord gateway/profile와 허용 채널 | DDT `config.yaml` 15–26행 |
| 대화 경계 | `auto_thread: true`, thread별 session ID | `config.yaml` 16–19행; `sessions/sessions.json` 3–43행 |
| 라우팅 키 | `agent:main:discord:thread:<thread_id>:<thread_id>` 형태 | 세션 인덱스와 `state.db` sessions/gateway_routing |
| 작성자 추적 | `user_id`, `origin_json` 보존 | `state.db` sessions |
| 작업 연결 | 공통 JOB 경로, 요청·설계·검토·검증·산출물 | JOB별 문서와 audit |
| Knowledge 정책 | `auto_promote: false`, `scope: chat_local` | `config.yaml` 60–62행 |
| Knowledge 조회 코드 | promoted/chat_local/미대체 자료만 조회, source_ref에 JOB·파일·해시 | `core/scripts/knowledge/knowledge_runtime.py` 55–67행 |
| 그룹 JOB 경로 | participant 입력 → resolver → group_tag로 경로 선택 | `scripts/create-job.sh` 183–224, 258–267행 |

주된 대화 분리 단위는 **author ID가 아니라 스레드/세션**이다. `history_backfill`도 켜져 있어 관련 채널 이력을 가져올 수 있다. 따라서 사용자별 완전한 접근 격리라는 표현은 맞지 않는다. 또한 조사 시점 설정이 과거 모든 시점에 동일했다는 보장은 없으며, 과거 세션 기록과 현재 설정을 함께 대조한 결과다.

`create-job.sh`의 resolver 호출과 반환값 사용은 확인됐지만 resolver 내부 구현은 접근 가능한 tree에서 찾지 못했다. Knowledge 정책을 모든 runtime 경로가 일관되게 적용하는지까지 입증하지 않았다.

**분리해야 하는 다른 기능:** MindCraft 제품의 `workspace-lock.mjs`는 로컬 journal writer 충돌 방지다. DDT Discord 대화 격리의 증거가 아니다. 제품의 Knowledge 재사용 기능도 DDT 공통 Knowledge와 별도다. 첫 DDT 응답의 이 혼동을 추가 질의로 바로잡았다. 제품 구현 결함을 “DDT 사용자간 컨텍스트 오염”의 반증으로 사용하지 않는다. 오염 0건이라는 전수 통계도 확보하지 않았다.

## 3. 행사 전 MVP의 구현 경로

| 시기 | 구상에서 실제로 추가된 것 | 직접 확인 가능한 커밋 |
|---|---|---|
| 8/30 | 작업 저장·목록 선택·실행 목록과 재개 | `e479181`, `5dae633`, `c58bd93` |
| 9/3 | 목적 기반 모델 선택, Pi TUI runner | `d66af14`, `a8f2f77` |
| 9/5 | deterministic fixture, preflight·설정, TUI 명령 workflow | `416c7e6`, `1e102cb`, `ac0f0cd` |
| 9/6 | 승인과 도구 안전성, 실행 제어 응답성 | `328e1aa`, `50a6722`, `768dc4d` |
| 9/6 | Knowledge 재사용과 상태·복구 | `1feef1e`, `559da01` |
| 9/6 | journal 직렬화, 실행 직전 승인 재검증 | `3ca6626`, `0694fc2` |
| 9/6 | 첫 실행 안내·한국어 UI·session/readiness 경계 | `4be9b9f`, `e47f6d6`, `e5caff2` |

[데모 개발 단계 기록](../../demo-plan/README.md)은 phase별 검증 범위를 남긴다. 여기서 MVP는 구현된 로컬 제품 기준선이며, Windows의 모든 배포 시나리오나 live provider 검증이 끝났다는 의미가 아니다. 현재 모델 선택은 Episode 시작 시 한 번 수행하며, token 기반 동적 전환은 완료 기능으로 소개하지 않는다.

## 4. 본 행사: 제품 지식을 두 에이전트 사이에 연결

로컬 작업 이력의 초기 제목은 WSL이지만, 실제 연결 후 **Windows Claude Code CLI**로 전환했다. 발표에서 WSL의 Claude를 GUI로 조작했다고 표현하지 않는다.

| 역할 | 실제 행동 | 확인 결과 |
|---|---|---|
| DDT | 기존 제품 파일을 지정·제공하고 산출물을 요구사항과 대조 | 최초 story plan 검토 APPROVE; 근거 문서 10개 인계 및 로컬 해시 대조 기록 |
| Claude | 계획 승인 후 스토리 27개·페르소나 2개 작성 | P0 24개, P1 보류 3개 유지 |
| DDT | 스토리의 차단 6개/비차단 5개 지적 | 복구·진단 유효기간·모드 격리·resume·context·검토 근거 보강 |
| Astra | 지적과 근거를 전달하고 수정 결과 확인 | Claude 대응표 작성, 원본 요구사항 유지 확인 |
| DDT | 수정본 재검토 | 11개 지적이 acceptance 수준에서 해소, APPROVE |
| Claude/DDT/Astra | Workflow Planning rev.1–3 수정·재검토 | 보류 기능과 필수 context 경계를 구분, rev.3 승인 |
| Astra | Application Design 계획 원문·답변·지적·대응표 대조 | 번호가 바뀐 지적을 내용으로 대조, 제출 파일 21개 로컬 해시 확인 |

Application Design 승인 시각은 **2026-09-07T11:19:34.258Z (한국 시각 20:19)**. 승인 대상은 계획 rev.2와 Q1~Q8 답변이다. 설계 문서 5개 작성이 다음 작업이며, 조사 시점 상태 파일은 개발용 Claude/Bedrock 인증 403 때문에 미시작이라고 기록한다. 새 AI-DLC workspace에서 제품 전체 구현·테스트가 완료됐다고 말하지 않는다.

자동 기록은 `Invoke-AiDlc.ps1`, `claude-hook.mjs`, `checkpoint.mjs`, `review.mjs`에 연결됐다. 실행 전후 checkpoint와 도구 이벤트 훅, Git 변경 기록, 검토 HTML 생성 코드와 실행 기록을 확인했다. 일반 편집기 저장이나 래퍼 밖 실행까지 자동 기록한다는 뜻은 아니다. AI-DLC 하네스 본체와 분리한 외부 실행 방식이다.

## 5. 컴퓨터 사용: 실제 화면에서 문제를 찾은 사례

`Mindcraft Windows 빌드 테스트` 작업의 실제 CUA 호출에는 브라우저 탭 열기, TUI 입력창 클릭, `setup mock deterministic` 붙여넣기, Return, `doctor`, 한글 작업 생성, BackSpace 편집, `quit`, 재시작, 화면 캡처가 남아 있다. 화면은 브라우저 xterm.js를 통해 **실제 Windows ConPTY의 MindCraft.exe Pi TUI**와 연결됐다.

| 발견 | 수정 | 결과의 범위 |
|---|---|---|
| 패딩·개행이 누적되는 출력 | 원문 줄을 현재 폭에서 한 번만 렌더링 | 신규 회귀 중 1건 |
| setup 이후 모델 수·초기 안내 잔존 | 출력 시 현재 preflight 반영 | 신규 회귀 중 1건 |
| quit 이후 프로세스 잔존 | 우선 처리 경로에서도 stop/종료 콜백 호출 | 신규 회귀 중 1건 |

수정 기준 커밋 `1e3c5317069bb1614e473f6690a35f574bafd710`. 신규 회귀 3/3, 해당 전체 회귀는 Node 22.19.0 기준 141/155로 기존 실패 14건이 남았다. 원본 [수정 전](assets/windows-tui-before.png) / [수정 후](assets/windows-tui-fixed.png) 캡처를 포함했다. 슬라이드는 빈 하단을 제외한 상단 실행 영역을 CSS로 표시하며 원본 파일을 변형하지 않았다.

이 작업은 **기존 MVP의 Windows 확장·검증**이며 AI-DLC 신규 개발의 Construction 완료로 합산하지 않는다. DDT는 결과를 접수·문서 검토했으며 Windows를 독립 재실행하지 않았다. 네이티브 Windows Terminal, 한국어 IME, clean VM, live provider 검증은 이 캡처가 증명하지 않는다.

후속 조사에서 Windows runtime의 모델 불일치, 실행 중 approvals 조회 정체, bundled Node 하위 명령 탐색 실패, 실패한 명령의 완료 상태 표기(F1~F4)가 보고됐다. 출시 완전 통과로 표시하지 않았다. JOB-69는 번호 충돌과 canonical gate 부재가 기록돼 있으며, 외부 결과 접수와 정식 workflow 완료를 구분한다.

## 6. 발표에서 강조할 새로운 시도

1. **공용 에이전트를 팀의 개발 접점으로 사용:** 서로 다른 사람이 같은 제품의 요구를 보강하고, 별도 세션과 공통 작업 기록으로 누적했다.
2. **축적한 제품 지식을 다른 개발 에이전트의 검토 기준으로 사용:** DDT가 Claude 산출물을 실제 요구사항과 대조해 수정시켰다.
3. **Astra가 에이전트 사이의 판단 차이와 다음 행동까지 관리:** 원문 대조·파일 인계·수정·위임 승인·기록을 연결했다.
4. **컴퓨터 사용을 실제 검증에 연결:** 화면 조작으로 재현한 문제를 수정하고 실행 근거를 다시 DDT에 인계했다.

“세계 최초”, “성능 우위 입증”, “시간 X% 절감”, “맥락 오염 0건”, “모든 개발·배포 완전 자동화”는 주장하지 않는다. 이는 의미를 축소하기 위한 제한이 아니라, 실제 시도의 어느 부분이 확인됐는지 청중이 정확하게 이해하도록 하는 기준이다.

[본편 슬라이드](index.html) · [주장별 근거](evidence.md) · [발표 대본](speaker-script.md)
