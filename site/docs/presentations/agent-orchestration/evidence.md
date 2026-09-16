# 슬라이드별 주장과 근거

2026-09-07 조사 기준. [조사 보고서](research-dossier.md)는 조사 범위, 작성자 확인, 출처의 성격과 한계를 설명한다. [source-manifest.json](source-manifest.json)은 사용한 원본의 SHA-256 식별자다. 해시는 원문 동일성을 확인하는 값이며 내용이 옳다는 증명은 아니다.

<a id="s1"></a>
## 01. 공용 에이전트에서 오케스트레이션까지

DDT에 실제로 두 차례 질의해 사전 개발 세션과 작업 이력을 조사했다. 행사 전 제품 이력과 본 행사 AI-DLC 이력을 분리했다. 두 흐름의 연결은 제품 지식·결정 근거 인계이며, 동일한 하나의 코드베이스에서 전체 개발이 자동 완료됐다는 주장이 아니다.

<a id="s2"></a>
## 02. MindCraft 제품 소개

[제품 README](../../../README.md), [DESIGN](../../../DESIGN.md), [SSOT](../../SSOT.md), [데모 단계 기록](../../demo-plan/README.md)을 대조했다. `task`, `run`, `approve`, `history`, `knowledge` 명령과 작업 기록·지식 재사용은 제품 기준선의 설명이다. 공용 DDT는 이 제품 개발에 사용한 별도 에이전트다.

<a id="s3"></a>
## 03. 서로 다른 팀원의 실제 요청

DDT의 2차 조사에서 원본 `user_id`를 내부 대조했다.

- A: `20260820_103041_01713bf4`, JOB-1 제품 구상.
- B: `20260826_111934_4b067d35`, JOB-38/40 협업·Knowledge 방향 보강.
- A: JOB-53 목적 기반 모델 선택으로 변경.

화면의 요청은 **원문 요약**이다. [JOB-38 요청](../../legacy/2026-09-03-pre-dual-model-routing/JOB-38-MindCraft-team-collaboration-and-LLM-Wiki-direction/request.md)에 협업·LLM Wiki 요구와 당시 문서 반영 범위가 보존돼 있다. [COMMIT-HISTORY](../../../COMMIT-HISTORY.md)에 JOB-53 변경 파일과 이전 자료의 legacy 보존이 기록돼 있다. A→B가 같은 스레드에서 직접 인계했다거나, 팀원 모두를 전수 확인했다는 주장은 아니다.

<a id="s4"></a>
## 04. DDT의 스레드별 맥락과 작업 기록

DDT가 읽은 `config.yaml`의 `discord.auto_thread: true`, `sessions/sessions.json`의 thread/session 키, `state.db`의 서로 다른 세션을 근거로 했다. Knowledge 정책은 `auto_promote=false`, `scope=chat_local`; 조회 코드에는 promoted 상태 필터가 있다. 정확한 locator와 제한은 [조사 보고서 2절](research-dossier.md)에 정리했다.

현재 설정이 과거 모든 시점에 동일했다고 입증한 것은 아니다. 관찰된 과거 세션 기록과 현재 설정을 대조했다. author별 완전 격리, 맥락 오염 0건을 주장하지 않는다. MindCraft 제품의 workspace lock을 DDT 대화 격리 근거로 사용하지 않는다.

<a id="s5"></a>
## 05. 컨셉에서 MVP까지

| 인터랙션 | 실제 근거 |
|---|---|
| 8/20–26 컨셉·협업 | DDT JOB-1 및 JOB-38, 관련 세션 |
| 9/3 TUI·라우팅 | `1f2eb36`, `a8f2f77`, `d66af14` |
| 9/5 실행 흐름 | `416c7e6`, `1e102cb`, `ac0f0cd` |
| 9/6 지식·복구 | `1feef1e`, `559da01`, `e47f6d6` |

커밋은 이 저장소의 Git 이력에서 조회할 수 있다. [Phase 4](../../demo-plan/phase-04-knowledge-reuse.md), [Phase 5 정본](../../demo-plan/README.md)에 목표와 수행 기록이 남아 있다. 계획 문서만으로 구현을 인정하지 않고 실제 커밋을 함께 대조했다. 제품의 지식 재사용 구현은 DDT 대화 공유 메커니즘과 구분한다.

<a id="s6"></a>
## 06. 기존 제품 지식을 새 개발 환경으로 인계

Astra 작업 `Control WSL ClaudeCode workflow`의 `01a07a51-4ba9-7650-82a4-94c0f10c040e` 턴에 실제 DDT plan review, 근거 문서 10개 수신·해시 대조, Claude 실행과 스토리 생성이 기록돼 있다. 로컬 원본 `ddt-story-plan-review.txt`, `interaction-001-claude-result.json` 산출물과 관련 세션을 대조했다.

초기 WSL 접근은 실패했고 이후 Windows Claude CLI로 전환했다. 작업 제목을 실제 실행 환경으로 오해하지 않는다. AI-DLC는 외부 개발 절차이며 [제품·프로세스 경계](../../mindcraft-ai-dlc-knowledge-audit.md)와 구분된다.

<a id="s7"></a>
## 07. 실제 작성·검토·수정 오케스트레이션

실행 경로는 Windows Claude CLI, Tailscale SSH를 통한 원격 DDT 호출, 파일·manifest 인계였다. UI 도식은 이 기록을 설명하는 로컬 인터랙션이며 실제 에이전트를 호출하지 않는다.

검토 요청에는 산출물·원본 요구사항·이전 지적·수정 대응·승인 범위를 담았다. DDT가 `REQUEST_CHANGES`를 반환하면 Claude가 수정하고 DDT가 재검토했다. Astra는 원문·범위·동일성을 확인하고 위임 범위에서 다음 단계로 이어갔다. 관련 원본: `ddt-stories-review.txt`, `ddt-stories-rereview.txt`, `ddt-workflow-review.txt`, `ddt-workflow-rereview.txt`, `ddt-workflow-final-review.txt`.

<a id="s8"></a>
## 08. User Stories의 11개 지적

스토리 27개(P0 24/P1 보류 3), 페르소나 2개. DDT 최초 검토는 차단 B1~B6와 비차단 N1~N5를 남겼다. Claude 수정 대응표와 DDT 재검토를 대조했다.

재검토 결론의 짧은 발췌:

> 이전 REQUEST_CHANGES의 B1~B6, N1~N5는 stories와 승인 Requirements 본문을 직접 대조한 결과 모두 acceptance 수준에서 해소됨

복구 항목은 intact store, interrupted write, corruption fallback, redacted audit/error, original Run immutability의 독립 시나리오로 보완됐다. **이는 수용 기준의 검토 승인**이며 11개 제품 버그 수정이나 실행 테스트 11개 통과를 의미하지 않는다. 원본: `ddt-stories-rereview.txt`, `inception/user-stories/review-response.md`.

<a id="s9"></a>
## 09. Astra의 독립 확인

`inception/application-design/plan-approval.md`, 2026-09-07T11:19:34.258Z:

> DDT가 재검토에서 N 항목 번호를 처음과 다르게 요약한 부분은 최초 지적과 대응표의 내용으로 대조했다.

같은 기록은 수정본 21개 파일의 로컬 해시가 제출 manifest와 일치했음을 명시한다. 원격 수신 바이트 검증은 Python RECEIPT이고, DDT의 본문 검토와 별개다. 승인 대상은 계획 rev.2와 Q1~Q8 답변이다. 아직 작성하지 않은 설계 산출물·Construction·제품 코드/테스트·live provider는 승인하지 않았다.

Workflow Planning rev.1–3에서도 P1 보류 기능과 P0 context 경계를 구분한 수정 기록이 있다. 이 사례는 부가 근거이며 본편을 이 한 사례만으로 구성하지 않았다.

<a id="s10"></a>
## 10. 컴퓨터 사용과 TUI 수정

Astra 작업 `Mindcraft Windows 빌드 테스트`, 턴 `01a07c10-1929-7ab0-8908-8d2f83e24643`의 CUA 입력·클릭·키·캡처 호출을 확인했다. `setup mock deterministic`, `doctor`, 한글 `task`, `tasks`, `quit` 조작이 기록됐다.

- [실제 수정 전 캡처](assets/windows-tui-before.png)
- [실제 수정 후 캡처](assets/windows-tui-fixed.png)
- 제품 수정 커밋: `1e3c5317069bb1614e473f6690a35f574bafd710`
- DDT 접수: `docs/ddt-handoff/windows-tui-20260907/DDT-REVIEW.md` (Windows 작업 브랜치 및 DDT 원격 자료에서 직접 확인)

DDT 접수 문서는 출력 누적·설정 안내·quit 종료 수정과 관련 patch, PTY 로그를 명시한다. 신규 회귀 3/3, 해당 전체 회귀 141/155·기존 실패 14건. 기존 MVP의 Windows 검증이며 AI-DLC 신규 구현과 분리한다. DDT가 Windows에서 독립 재실행한 것은 아니다. 화면은 실제 Windows ConPTY에 연결된 브라우저 터미널이며 네이티브 Windows Terminal이나 한글 IME 검증을 대신하지 않는다.

<a id="s11"></a>
## 11. 자동 기록과 도달점

직접 읽은 실행 파일은 `tools/Invoke-AiDlc.ps1`, `claude-hook.mjs`, `checkpoint.mjs`, `review.mjs`다. Claude 실행 전후와 도구 이벤트에 Git checkpoint와 검토 HTML을 연결했다. 실패 표시와 동시 Git 변경 방지 코드가 있다. 래퍼 외부의 모든 저장 이벤트를 포괄하는 기능은 아니다.

조사 시점 `aidlc-state.md`는 Application Design Part 1 계획·답변 승인, Part 2 문서 작성 미시작(Claude/Bedrock 인증 403)을 명시한다. 새 제품 전체 구현 완료를 주장하지 않는다. 별도 Windows 후속 안정성 자료에는 F1~F4 미해결 결함과 JOB-69 정식 gate 전이 미완료도 남아 있다.

<a id="s12"></a>
## 12. 두 실험의 의미

관찰한 요청과 결과를 바탕으로 한 발표자의 해석이다. 공용 에이전트의 팀 활용, 축적된 제품 지식의 재사용, 다른 에이전트 사이의 판단·작업 연결, 실제 화면 검증을 함께 시도했다. 새로운 활용 방식이라는 의미이며 보편적 최초나 벤치마크 우위를 주장하지 않는다.

<a id="s13"></a>
## 부록

[조사 보고서](research-dossier.md)와 [원본 식별 목록](source-manifest.json)에 원천·관찰 범위·확인 한계를 보존했다. 사용자 ID와 전체 대화·접속·인증 정보는 싣지 않았다.

[슬라이드](index.html) · [발표 대본](speaker-script.md) · [발표 자료 목록](../README.md)
