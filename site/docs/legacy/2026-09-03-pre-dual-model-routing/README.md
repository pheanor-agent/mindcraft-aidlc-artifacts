# MindCraft

> Historical note: 이 문서는 2026-09-03 이전의 개념 검토 기록이다. 당시의 `AI-DLC workspace` 표현은 현재 기준에서 폐기되었다. AI-DLC는 MindCraft 런타임이 아니라 MindCraft 개발·검증에 사용한 외부 방법론이다. 이 문서는 현재 SSOT가 아니다.

MindCraft는 반복 가능한 Task/Episode 작업 루프, 영속 상태, 제한된 Knowledge context, 안전한 custom tool을 제공하는 Pi 기반 TUI workflow package입니다.

> MindCraft 0.1.0은 Node.js package/CLI입니다. Node.js runtime이 내장된 단독 실행파일은 아닙니다.

## 사전 요구사항

- Node.js `>=22.19.0`
- npm
- 기본 coding harness: OpenCode 또는 Claude Code
- 운영체제: Linux native 또는 WSL2 우선 지원; Windows native는 adapter별 검증 후 지원

OpenCode와 Claude Code는 MindCraft 제품의 기본 coding harness 대상입니다. 다만 MindCraft package에 실행 파일이나 credential을 포함하지 않으며, 설치 여부를 preflight로 확인합니다. 미설치 상태에서는 자동 설치하지 않고 설치 안내 또는 unavailable 상태를 표시합니다.

Airouter와 Codex는 현재 개발·테스트용 provider/fixture이며 제품의 기본 provider가 아닙니다. 사용자는 원하는 Vendor API, OpenAI-compatible API 또는 local endpoint를 별도로 등록하고 역할별로 지정할 수 있습니다.

MindCraft의 제품 방향은 **Windows-first onboarding, Linux/WSL2-capable execution**입니다. 설치 전 preflight에서 OS, Node.js, 외부 CLI, credential 상태와 지원 가능 범위를 확인합니다. Windows 사용자에게 WSL2가 항상 필수라고 가정하지 않으며, 각 CLI adapter의 검증 결과에 따라 native/WSL2 지원 여부를 표시합니다.

라우팅은 CLI에만 의존하지 않습니다. MindCraft는 `ModelProviderAdapter`(사용자 등록 API/local server)와 `CodingHarnessAdapter`(기본 OpenCode/Claude Code)를 분리합니다. 역할별로 `harness + provider + model` 조합에 고성능·고비용 또는 저성능·저비용 profile을 지정해 혼용할 수 있으며, 실행 전 선택된 harness/provider, Model profile, 예상 비용, 데이터 경계와 권한을 표시합니다.

## checkout 또는 package directory에서 설치

`package.json`이 있는 directory에서 실행합니다.

```sh
./install.sh
```

설치 script는 Node.js/npm을 확인하고 package를 global로 설치한 뒤 `mindcraft` 명령을 등록합니다. 다른 package source directory를 지정할 수도 있습니다.

```sh
./install.sh /path/to/mindcraft
```

설치 script를 사용하지 않을 때의 동일한 설치 방법은 다음과 같습니다.

```sh
npm install
npm install --global .
```

## 실행

```sh
mindcraft
```

현재 CLI 명령은 다음과 같습니다.

```text
task <title>       활성 Task 생성
run <prompt>       Episode 생성 및 실행
status             현재 Task와 Run 표시
knowledge          capture된 Knowledge 표시
promote <id>       Knowledge candidate 승격
quit               종료
```

예시:

```text
task release workflow 검토
run 현재 release 준비 상태를 확인해줘
status
quit
```

## 실행 구조

```text
Task
  -> Episode
      -> ExecutionRun
          -> Pi AgentSession
              -> Airouter model
```

Episode가 실행되기 전에 승인된 Knowledge를 제한된 context slice로 구성합니다. Pi session은 MindCraft custom tool boundary를 사용하며, 허용 범위를 벗어난 요청은 fail-closed로 차단됩니다. 실행 결과는 저장되고 redacted Knowledge candidate가 생성될 수 있습니다.

일반적인 실행 순서는 다음과 같습니다.

```text
Task 생성
-> Episode 생성
-> Task/Episode/Run 저장
-> 승인된 Knowledge 구성
-> Pi AgentSession에 prompt 전달
-> idle 대기
-> 완료 상태 저장
-> Knowledge candidate capture
```

## State와 Knowledge

project directory에서 CLI를 시작하면 다음 경로를 사용합니다.

```text
.mindcraft/state.jsonl
.mindcraft/knowledge.jsonl
```

State는 append-only 및 checksum-backed 방식으로 저장됩니다. 재시작하면 Task, Episode, Run을 replay합니다. 중단된 Run은 recoverable로 분류될 수 있으며, 기존 Run을 덮어쓰지 않고 연결된 새 Run으로 resume합니다.

Knowledge capture에는 provenance가 기록되며 민감정보처럼 보이는 값은 redaction됩니다. capture된 candidate는 자동으로 승인 context에 들어가지 않습니다.

## Safety boundary

- Pi builtin tool은 MindCraft session에서 비활성화하고 MindCraft custom tool만 등록합니다.
- Tool 실행 전에 GrantedScope를 검사합니다.
- 지원되지 않는 provider/harness는 unavailable 상태로 유지하며, 설치 script가 credential이나 provider CLI를 가져오지 않습니다.
- 오류 출력에서는 token/key/secret 형태의 값을 redaction합니다.
- 외부 CLI adapter는 executable allowlist, working directory, environment allowlist, timeout/cancel, stdout/stderr redaction, exit-code mapping을 가져야 합니다.
- routing 결정 전에는 선택된 CLI/Model, 실행 위치(local/cloud), 예상 비용, 필요한 권한을 표시하고 승인받습니다.

## 개발 및 검증

```sh
npm install
npm run build
npm test
npm run test:live
npm run release:check
npm audit --audit-level=high
```

`npm test`는 네트워크와 API key가 필요 없는 기본 테스트만 실행합니다. 실제 Airouter 호출은 별도 명령으로 실행합니다.

```sh
npm run test:live
```

`AIROUTER_API_KEY`가 없으면 live 테스트는 실행되지 않고 명확한 사유와 함께 skip됩니다.

## Release 정보

```text
name: mindcraft
version: 0.1.0
node: >=22.19.0
```

release source는 다음 private GitHub repository에서 관리합니다.

```text
https://github.com/ddt-mindcraft/mindcraft
```

현재 배포 branch는 `main`입니다. 이번 release는 cloud service가 아니라 설치 가능한 Node.js package와 문서를 repository에 배포한 것입니다.

## 사내 해커톤 기준 및 자체 심사

MindCraft는 사내 해커톤 주제인 **AI 기반의 S/W 개발 혁신 서비스(AI DLC)**를 기준으로 개발합니다. 심사 기준은 AI-DLC 사용 충실성(25), 문제 정의 및 해결(20), 창의성(15), 완성도(15), 사용성(15), 유지보수성 및 보안(10)입니다.

자세한 제품 가설, 문제 정의, 심사 기준 및 우선순위 원칙은 [`HACKATHON.md`](./HACKATHON.md)를 참고하세요. MindCraft는 개인용 실행기가 아니라 팀 협업형 AI-DLC workspace를 지향하며, Knowledge를 관련도 기반 LLM Wiki 형태로 TUI에서 탐색하는 방향을 핵심 UX로 삼습니다. 또한 사용자가 자유로운 바이브 코딩 방식으로 작업하더라도 필요한 순간에만 비침해적으로 개입해 적절한 CLI·Model·Knowledge를 연결하는 방향을 추구합니다. 데모 전 자체 심사와 피드백 ToDo는 [`TODO.md`](./TODO.md)에서 관리합니다.
