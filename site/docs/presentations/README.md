# MindCraft 해커톤 발표

## 팀이 함께 쓰는 AI, 팀을 연결하는 AI

[HTML 슬라이드](agent-orchestration/index.html) · [7분 발표 대본](agent-orchestration/speaker-script.md) · [광범위 이력 조사 보고서](agent-orchestration/research-dossier.md) · [슬라이드별 근거](agent-orchestration/evidence.md)

공용 DDT를 통한 컨셉·MVP 공동개발과, 본 행사에서 Astra가 Claude Code·DDT를 연결한 경험을 실제 이력으로 소개한다. DDT에 두 차례 직접 질의해 세션·작업대장·작성자·운영 구조를 조사하고, 로컬 Git·AI-DLC 원문·Astra 도구 호출·Windows 실행 결과와 대조했다.

본편 12장, 7분(420초), 질의응답용 부록 1장이다. 청중은 AI 활용에 익숙하지만 DDT와 이 프로젝트의 구조는 처음 접한다고 가정했다.

| 순서 | 흐름 | 시간 |
|---|---|---|
| 1–2 | 두 실험과 만들던 제품 소개 | 50초 |
| 3–5 | 팀원 요청, 스레드별 맥락과 공통 기록, 컨셉에서 MVP까지 | 115초 |
| 6–7 | 축적한 지식을 두 에이전트 사이에 연결 | 65초 |
| 8–10 | 11개 지적의 수정, Astra 독립 확인, 실제 TUI 조작 | 130초 |
| 11–12 | 자동화 범위와 두 실험의 의미 | 60초 |

네이비·코발트·흰색, 동일한 16:9 비율과 Noto Sans KR 서체를 사용한다. 한글 제목은 600 굵기와 기본 자간을 유지하고 `transform: scale()`을 쓰지 않는다. 폰트·이미지·스크립트를 모두 포함해 오프라인으로 열 수 있다.

### 열기와 조작

GitHub 파일 보기에서는 HTML이 실행되지 않는다. 저장소를 내려받아 `agent-orchestration/index.html`을 브라우저로 열거나, 저장소 루트에서 `python -m http.server 8765 --bind 127.0.0.1`로 미리 볼 수 있다.

| 기능 | 조작 |
|---|---|
| 이전·다음 | 방향키, PageUp/PageDown, Space, 하단 버튼 |
| 처음·부록 | Home / End |
| 발표 노트 | N 또는 상단 버튼 |
| 목차 | O 또는 상단 버튼 |
| 전체 화면 | F 또는 상단 버튼 |
| 직접 이동 | `#slide-1` ~ `#slide-13` |
| 모바일 이동 | 좌우 스와이프 또는 버튼 |

5장의 연대기, 7장의 오케스트레이션, 10장의 실제 수정 전후 화면에 인터랙션이 있다. 설명용 로컬 전환이며 외부 에이전트·서비스를 호출하지 않는다. 인터랙션 버튼에 포커스가 있을 때는 하단 이동 버튼을 사용한다. 정적 인쇄 시 모든 상태의 상세 근거는 대본과 근거 문서를 함께 본다.

### 근거와 관찰 범위

행사 전 제품 MVP와 행사 당일 AI-DLC 신규 개발은 별도 이력이다. 계획 승인·구현·실행 검증을 구분한다. 공용 DDT의 대화 분리는 스레드/세션을 기준으로 설명하고, 모든 사용자의 맥락 오염이 0건이었다는 주장은 하지 않는다. 실제 Windows 캡처는 ConPTY의 Pi TUI이며 Windows Terminal·한글 IME 검증을 대신하지 않는다.

- [출처 파일 SHA-256](agent-orchestration/source-manifest.json)
- [구성·레이아웃 설계](agent-orchestration/redesign-plan.md)
- [초기 대표 디자인 시안](agent-orchestration/design-review.html) — 디자인 참고용, 최신 발표 내용은 본편 기준
- [이미지 출처](agent-orchestration/assets/README.md)

[전체 문서 목록](../README.md) · [제품 README](../../README.md)
