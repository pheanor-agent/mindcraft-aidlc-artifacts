# 사내 해커톤 기준 — MindCraft

> Historical note: 이 문서는 2026-09-03 이전의 개념 검토 기록이다. 당시의 `AI-DLC workspace` 표현은 현재 기준에서 폐기되었다. AI-DLC는 MindCraft 런타임이 아니라 MindCraft 개발·검증에 사용한 외부 방법론이다. 이 문서는 현재 SSOT가 아니다.

이 문서는 MindCraft의 제품 방향과 우선순위를 판단할 때 사용하는 기준 문서입니다.
기능을 추가하거나 범위를 조정할 때 아래 주제와 심사 기준을 우선적으로 확인합니다.

## 해커톤 주제

**AI 기반의 S/W 개발 혁신 서비스 만들기 (aka AI DLC)**

- 사내에서 AI를 이용해 개발할 때 사용할 수 있는 서비스를 만든다.
- 참고 가능한 문제 영역:
  - Token 효율화 솔루션
  - Prompt 품질 측정
  - Context 기반 Model routing
  - Release risk scoring
  - 그 밖의 반복 가능한 AI-DLC workflow 개선

## MindCraft의 문제 정의

AI를 이용한 개발 작업이 일회성 대화나 수동 실행에 머무르면 다음 문제가 발생합니다.

- 작업 맥락과 결과가 세션 종료 후 유실된다.
- 반복 작업을 표준화하고 재현하기 어렵다.
- AI가 사용할 수 있는 파일/명령/네트워크 범위를 통제하기 어렵다.
- 이전에 검증된 지식을 다음 작업에 안전하게 재사용하기 어렵다.
- 실행 결과의 품질과 릴리스 준비 상태를 객관적으로 확인하기 어렵다.

MindCraft는 이를 **Task → Episode → ExecutionRun** workflow, durable state, 제한된 Knowledge context, 안전한 tool boundary로 해결하는 것을 목표로 합니다.

## 현재 제품 가설

> 개발자가 AI Agent를 활용한 반복 작업을 안전하고 재현 가능하게 실행하고, 팀이 함께 검증한 지식을 축적·탐색·재사용하여 다음 작업의 품질과 효율을 높일 수 있다.

MindCraft는 개인을 위한 단순한 AI 실행 도구가 아니라, 팀의 개발 맥락과 의사결정을 연결하는 **협업형 AI-DLC workspace**를 지향합니다.

### 제품 컨셉 충돌 검토 결과 (2026-08-31)

현재 제품에는 다음 두 사용자 가치가 동시에 요구됩니다.

1. **설치·사용 장벽 최소화**: 기존 Agent/CLI와 하네스를 사용자가 각각 찾아 설치·연결하지 않아도, 한 번의 MindCraft 설치 후 필수 workflow를 자연스럽게 사용할 수 있어야 한다.
2. **예산 기반 Model routing**: 고성능 유료 Model은 판단·리뷰 등 꼭 필요한 단계에만 사용하고, 반복·초안·로컬 작업은 local Model로 보완해야 한다.

두 가치는 직접 충돌한다. Windows는 비개발자 onboarding과 배포에 유리하지만, 현재 검토 중인 외부 CLI 조합과 shell/process/권한 모델은 Linux 또는 WSL2를 요구할 수 있다. 반대로 Linux/WSL2를 필수 전제로 삼으면 첫 번째 가치의 설치 장벽을 훼손한다.

**제품 기본 방향(승인 전 제안)**

- 사용자 경험은 **Windows-first**로 설계한다. 설치 wizard, 사전 점검, CLI 상태, 실패 원인을 명확한 안내로 제공한다.
- 실행 substrate는 **Linux native + WSL2를 1차 지원**하고, Windows native는 adapter별 가능 여부를 검증해 단계적으로 지원한다. WSL2를 모든 사용자에게 필수라고 단정하지 않는다.
- MindCraft 본체와 외부 Agent/Model CLI를 분리한다. 본체는 orchestration, routing policy, approval, audit, Knowledge를 소유하고, CLI adapter는 감지·호출·취소·출력 redaction 계약을 구현한다.
- OpenCode/Claude Code는 자동 설치하거나 credential을 수집하지 않는다. 설치 여부·버전·로그인 상태를 preflight로 감지하고, 미설치 시 unavailable/fallback 상태를 표시한다.
- routing은 Model 이름이 아니라 **작업 단계와 정책**(예: planning/review는 유료, 반복 실행·초안은 local)을 기준으로 결정하며, 실행 전 대상 CLI/Model·예상 비용·데이터 경계를 승인한다.

**검증이 필요한 핵심 가정**

- Claude Code의 공식 지원 OS, 비대화형 호출·권한 승인·출력 수집 계약
- OpenCode의 설치 방식, local Model/backend 연결 방식, headless 호출 계약
- WSL2에서 Windows 프로젝트 경로 성능, file watcher, TTY/interactive process, credential 경계
- 두 CLI를 동일한 Task/Episode/Run 및 approval/audit 모델로 감쌀 수 있는지
- local Model 실행에 필요한 GPU/메모리/모델 파일 용량과 팀원의 하드웨어 편차

이 항목들은 구현 전에 CLI contract probe와 clean-install 실험으로 판정한다. 조사 결과가 부정적이면 “단일 설치로 모든 CLI를 숨김”을 약속하지 않고, 지원 조합을 명시한 제품 matrix로 전환한다.

**현재 조사에서 확인한 사실과 해석**

- OpenCode 공식 GitHub README에는 Windows 설치 방식(Scoop/Chocolatey 및 Windows desktop artifact)이 명시되어 있다. 따라서 OpenCode 자체에 Linux/WSL2가 필수라는 결론은 내릴 수 없다.
- Claude Code 공식 문서 페이지는 Windows, Linux, WSL2 경로를 함께 안내한다. 다만 문서상의 설치 가능성과 MindCraft가 subprocess로 안정적으로 감싸는 것은 별개의 문제다.
- Microsoft WSL 설치 문서는 WSL2를 Windows에서 Linux 도구를 사용하는 선택 가능한 실행 경로로 안내한다. WSL2는 호환성 fallback이 될 수 있지만, 제품 전체의 필수 prerequisite로 확정하지 않는다.
- 이 세 자료만으로 local Model의 GPU 접근, CLI permission prompt, stream/exit semantics, project path 성능, 비용·usage 수집까지 보장되지는 않는다. 해당 항목은 실행 probe의 미해결 위험으로 남긴다.

참고: [OpenCode README](https://github.com/anomalyco/opencode), [Claude Code Docs](https://docs.anthropic.com/en/docs/claude-code/overview), [Microsoft WSL 설치 문서](https://learn.microsoft.com/en-us/windows/wsl/install) (2026-08-31 확인).

### 라우팅 연결 방식 조사 결과

라우팅을 외부 CLI 호출로만 제한할 필요는 없다. 후보는 다음과 같다.

| 연결 방식 | 용도 | 장점 | 한계 |
|---|---|---|---|
| Vendor HTTP API | Opus 등 cloud Model 직접 호출 | OS·TTY와 무관, 비용·timeout 관리가 쉬움 | Claude Code의 coding harness·permission UX를 제공하지 않음 |
| OpenAI-compatible HTTP | Airouter 및 local server 공통 연결 | 기존 provider 구조 재사용, Windows 친화적 | 기능·tool calling·usage 호환성을 provider별 확인해야 함 |
| Local server | Ollama, LM Studio, llama.cpp 등 | local Model을 CLI 없이 연결, privacy 우수 | 사용자의 backend·GPU·모델 설치를 점검해야 함 |
| OpenCode HTTP server/API | OpenCode 기능을 server로 사용 | subprocess/TTY 의존을 줄일 가능성 | API 안정성·인증·scope·stream 계약 probe 필요 |
| CLI subprocess | Claude Code/OpenCode harness 사용 | 기존 CLI의 workflow와 도구 사용 가능 | OS·TTY·권한·process 수명 관리가 복잡함 |
| MCP | Model에 tool/context 제공 | 도구와 context를 표준 방식으로 노출 가능 | Model routing 자체가 아니라 tool integration 계층 |

**권장 구조**는 `ModelProviderAdapter`와 `CodingHarnessAdapter`를 분리하는 것이다. 실제 제품의 기본 coding harness는 OpenCode와 Claude Code이며, 사용자가 등록한 Vendor API·OpenAI-compatible API·local endpoint는 역할별 Model provider로 활용한다. Airouter와 Codex는 제품 기본값이 아니라 개발·테스트용 fixture/provider로 격리한다. 이 구조라면 Windows native에서도 API/local server 기반 역할을 먼저 실행하고, harness 역할은 native 또는 WSL2 지원 상태에 따라 선택할 수 있다.

### 기본 설정과 사용자 확장

설치 직후에는 OpenCode와 Claude Code가 기본 선택지로 보인다. 사용자는 별도 provider를 등록하고 다음과 같이 역할을 지정할 수 있다.

```text
planning       Claude Code / 고성능 cloud Model
implementation OpenCode / 저비용 local Model
review         Claude Code / 고성능 cloud Model
documentation  등록된 API / 저비용 Model
```

여기서 OpenCode·Claude Code는 단순 Model endpoint가 아니라 coding harness이고, 등록 API는 Model 호출 provider일 수 있다. “저비용”·“고성능”은 harness 이름에 고정하지 않고 `harness + provider + model` 조합에 사용자가 지정하는 profile이다. 한 역할에 둘 이상의 후보를 둘 수 있지만 자동 fallback은 승인 정책과 capability 확인 이후에만 허용한다.

공식 자료 조사에서 Anthropic Messages API, LM Studio의 OpenAI-compatible `/v1/responses`·`/v1/chat/completions`, llama.cpp의 OpenAI-compatible 및 Anthropic-compatible endpoint, OpenCode의 server 실행 경로를 확인했다. Ollama도 자체 API를 제공하지만, 요청/stream/usage 형식은 adapter probe로 고정해야 한다.

OpenCode는 headless HTTP server와 OpenAPI endpoint를 제공하고 SDK 생성 경로 및 ACP(Agent Client Protocol)를 문서화한다. Claude Code는 공식 Agent SDK와 desktop·browser·IDE 연동 경로를 제공한다. 다만 desktop/browser는 MindCraft가 안정적으로 제어할 자동화 계약으로 간주하지 않고, OpenCode server/ACP와 Claude Agent SDK를 우선 조사 대상으로 둔다.

### 핵심 제품 방향

#### 1. 팀 협업 중심

- Task, Episode, Run, Knowledge를 개인 세션이 아닌 팀의 공유 workflow로 다룬다.
- 누가 어떤 작업을 수행했고, 어떤 결과와 판단을 남겼는지 추적 가능해야 한다.
- 팀원이 이전 실행 결과를 이어받고, 검토·승인·수정하며 협업할 수 있어야 한다.
- 팀의 반복 작업을 표준화하고, 구성원 간 AI 활용 격차를 줄이는 것을 목표로 한다.

#### 2. 관련도 기반 LLM Wiki

- 실행 중 축적된 Knowledge를 단순한 시간순 로그가 아닌 관련도 중심의 구조로 정리한다.
- 주제, 프로젝트, Task, 기술 영역, provenance를 기준으로 탐색할 수 있어야 한다.
- 승인된 Knowledge와 검토 대기 candidate를 구분해 신뢰도를 표현한다.
- TUI에서 검색, 목록/상세 보기, 관련 Knowledge 이동, 승인·거절·수정 흐름을 제공한다.
- LLM이 작업에 참고한 Knowledge와 새로 생성한 Knowledge의 연결 관계를 보여준다.

#### 4. 바이브 코딩과 자연스러운 개입

- 사용자가 정해진 명령어나 workflow를 완벽하게 따르지 않고 자유로운 바이브 코딩 방식으로 작업해도 흐름을 방해하지 않는다.
- 현재 대화와 작업 맥락을 바탕으로 필요한 시점에만 Task, Knowledge, Provider/Model, 개발 CLI를 제안하거나 연결한다.
- 시스템이 모든 작업을 강제로 구조화하기보다, 반복 작업·컨텍스트 손실·릴리스 위험·도구 선택이 필요한 순간에 선택적으로 개입한다.
- 개입 시 현재 인식한 의도, 연결하려는 CLI/Model, 참고할 Knowledge, 예상 효과를 사용자에게 설명한다.
- 코드 변경, 파일 쓰기, command 실행 등 위험한 동작은 자동 실행하지 않고 승인을 요청한다.
- 사용자는 제안을 무시하거나 수동 workflow로 전환할 수 있어야 한다.

## 심사 기준 및 배점

| 기준 | 배점 | MindCraft 평가 질문 |
|---|---:|---|
| AI-DLC 사용 충실성 | 25 | 실제 개발 workflow에서 AI를 어떻게 활용하고, 반복 가능하게 만들었는가? |
| 문제 정의 및 해결 | 20 | 개발자가 겪는 구체적인 문제를 명확히 정의하고 해결하는가? |
| 창의성 | 15 | 단순한 Chat UI나 API wrapper를 넘어선 차별점이 있는가? |
| 완성도 | 15 | 핵심 시나리오가 처음부터 끝까지 실제로 동작하는가? |
| 사용성 | 15 | 개발자가 짧은 학습만으로 사용할 수 있고 결과를 이해할 수 있는가? |
| 유지보수성 및 보안 | 10 | 구조가 확장 가능하고, 권한/민감정보/실패 처리가 안전한가? |
| **합계** | **100** | |

## 구현 우선순위 원칙

1. 개인 실행보다 팀 협업 효율을 높이는 기능을 먼저 완성한다.
2. 데모 가능한 핵심 사용자 여정을 먼저 완성한다.
3. AI Agent 실행 결과가 실제 개발 산출물과 팀 Knowledge에 연결되도록 한다.
4. Knowledge는 관련도, 신뢰도, provenance를 기준으로 TUI에서 탐색 가능하게 만든다.
5. 사용자가 현재 상태와 다음 행동을 직관적으로 이해할 수 있게 한다.
6. 모든 기능은 위 심사 기준 중 어떤 점수를 높이는지 설명할 수 있어야 한다.
7. 자동화보다 승인 가능한 안전한 workflow를 우선한다.
8. 기능을 늘리기 전에 측정 가능한 성공 지표와 검증 방법을 마련한다.

## 자체 심사 피드백 루프

각 milestone 또는 데모 전에는 `TODO.md`의 자체 심사 checklist를 수행합니다.

1. 현재 구현된 기능과 데모 시나리오를 고정한다.
2. 심사 기준별로 0~배점 범위의 예상 점수와 근거를 작성한다.
3. 근거가 없는 점수는 인정하지 않는다.
4. 가장 큰 점수 손실이 예상되는 기준을 1~3개 선정한다.
5. 개선 ToDo를 작성하고, 각 ToDo에 검증 방법과 완료 조건을 붙인다.
6. 개선 후 동일한 시나리오로 재평가한다.

자체 심사 결과는 과장하지 않고, `evidence: 실행 로그/테스트/스크린샷/사용자 관찰` 형식으로 증거를 남깁니다.
