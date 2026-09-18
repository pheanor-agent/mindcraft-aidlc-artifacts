# MindCraft

## 문서와 발표 자료

- [해커톤 HTML 발표: DDT 개발 협업과 Astra의 AI-DLC 오케스트레이션](docs/presentations/README.md)

발표 자료는 MindCraft를 개발하는 외부 협업 프로세스를 설명하며 제품 런타임 SSOT를 대체하지 않습니다.

> **제품 문서 기준:** [`ROUTING.md`](./ROUTING.md)에서 현재 Model 정책을 확인합니다. 과거 컨셉과 검토 이력은 [`docs/legacy/2026-09-03-pre-dual-model-routing/`](./docs/legacy/2026-09-03-pre-dual-model-routing/)에 보존합니다.

> 이 저장소의 제품 문서는 현재 구현과 승인된 제품 범위만 다룹니다. 개발 프로세스와 시뮬레이션 자료는 제품 SSOT가 아닙니다.

MindCraft는 반복 가능한 Task/Episode 작업 루프, 영속 상태, 제한된 Knowledge context, 안전한 custom tool을 제공하는 **Pi 기반 terminal TUI workflow package**입니다.

> MindCraft 0.1.0은 Node.js package/CLI와 Windows x64 bundled-runtime package를 제공하며, Pi의 AgentSession과 `pi-tui`를 활용합니다.

## Windows 배포

> **TUI 후속 검증:** 실제 Windows ConPTY에서 Pi TUI를 실행해 출력 누적·설정 안내·quit 종료 문제를 수정했습니다. 수정 후 회귀는 **141/155 통과, 기존 14개 실패 유지**입니다. Native Windows Terminal 및 IME 검증과는 구분합니다.

> **2026-09-07 Windows 실기기 검증:** portable 실행파일의 기본 스모크와 27,602개 파일 무결성 검사는 통과했습니다. 동봉 Node.js 22.19.0의 회귀 테스트는 **138/152 통과, 14개 실패**로 기록되어 있으며, 해당 결과는 당시 검증 시점의 evidence입니다. 해당 프리릴리즈에는 NSIS installer가 포함되지 않았습니다.

Windows x64 배포 구조는 PATH의 Node.js를 사용하지 않습니다. native `MindCraft.exe`가 설치 위치의 `current/runtime/node.exe`와 `current/app/src/cli.mjs`를 구조화된 인자로 실행하고, Win32 Job Object로 child process tree를 관리합니다.

빌드 가능한 artifact와 실제 공개 release에 포함된 artifact는 구분합니다. 실제 release 구성은 release manifest와 해당 validation evidence를 기준으로 확인합니다.

| 구분 | Portable ZIP | NSIS installer | 기준 |
|---|---:|---:|---|
| Windows build output | 생성 가능 | 생성 가능 | build/installer evidence |
| 2026-09-07 검증 prerelease | 포함 | 미포함 | 당시 실기기 검증 기록 (git history 참조) |
| 공개 release | release manifest 기준 | release manifest 기준 | release evidence |


installer는 기본적으로 `%LOCALAPPDATA%\Programs\MindCraft`에 설치합니다. 제거 시 `%LOCALAPPDATA%\MindCraft`의 사용자 설정과 사용자가 선택한 workspace는 삭제하지 않습니다. Credential Manager 연동은 `wincred-helper.exe`를 사용하며 credential 값은 command-line argument나 config 파일에 기록하지 않습니다.

release package에는 Node.js 22.19.0 Windows x64 runtime, CycloneDX SBOM, 파일별 SHA-256 manifest가 포함됩니다. 현재 Linux cross-build에서 PE x64 형식, manifest 무결성, 전체 회귀를 검증했습니다. code signing과 clean Windows VM의 설치·한글 IME·Credential Manager 실동작은 Windows native release gate로 별도 수행해야 합니다.

## 사전 요구사항

### Windows bundled package 사용자

- 외부 Node.js/npm 불필요
- Windows Terminal 또는 호환 terminal
- 선택한 provider의 credential/endpoint

### source checkout/npm 개발자

- Node.js `>=22.19.0`
- npm
- Git
- Bash 또는 POSIX shell (`install.sh` 사용 시)
- 등록된 provider/model

MindCraft는 Pi를 뼈대로 사용하며, 사용자가 지정한 Model을 모든 작업에 사용하거나 용도별로 하나씩 사용합니다. 모델 0개 또는 동일 용도 복수 모델은 설정 오류로 처리합니다.

Knowledge는 작업 산출물의 raw data와 metadata를 포함한 artifact로 관리합니다. 관련 자료가 부족하면 Knowledge와 허용된 실행 폴더까지 **검색 후보 범위**를 넓힐 수 있지만, 실제 prompt에는 relevance/scope/redaction/dedup/budget을 통과한 자료만 선택해 넣습니다. 실행 폴더 외부 파일과 shell command는 사용자 승인이 필요합니다.

MindCraft의 제품 방향은 **Pi 기반 terminal TUI, 개인용 session workflow**입니다. Pi AgentSession의 streaming/event/session 기능과 `pi-tui` interface를 우선 재사용합니다. Windows Terminal을 1차 검증 대상으로 하며, Linux/WSL/macOS는 제품 우선 범위가 아니라 compatibility 검토 대상으로 둡니다.

등록된 Model이 없으면 실행을 차단합니다. 하나만 지정하면 모든 용도에 사용하고, 두 개를 지정하면 서로 다른 용도에 하나씩 매핑합니다. 동일 용도에 2개 이상은 허용하지 않으며 자동으로 다른 Model로 fallback하지 않습니다. 실행 전 선택 Model과 용도를 표시합니다.

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

첫 실행에서 Model이 아직 없으면 프로그램은 종료하지 않고 TUI에서 setup을 안내합니다. 오프라인 리허설은 `setup mock deterministic`, 실제 provider는 `setup airouter <model>`로 등록한 뒤 `doctor`로 확인합니다. setup은 credential 자체를 저장하지 않으며, 기존 approval/workflow/Knowledge 경계를 그대로 사용합니다.

현재 전역 launch 옵션은 command 앞에 배치합니다. `config add-model`의 `--id`, `--provider`, `--model`이나 `init --force` 같은 하위 명령 옵션은 command 뒤에 배치하며 전역 parser가 해석하지 않습니다. `--help`와 `--version`은 설정·workspace를 변경하지 않고 즉시 종료합니다.

현재 CLI 명령은 다음과 같습니다.

```text
setup <provider> <model> [purpose]  첫 실행 Model 설정
doctor             실행 전 환경·Model·storage 진단
model              현재 선택된 provider/model 표시
task <title>       활성 Task 생성
tasks              저장된 Task 목록
use <task-id>      현재 Task 선택
run <prompt>       Episode 생성 및 실행
status             현재 Task와 Run 표시
runs               선택 Task의 Run 목록
resume <run-id>    recoverable Run 재개
cancel <run-id>    실행 중 Run 중단 및 aborted 저장
knowledge [query] Knowledge 목록·검색 (captured/promoted/rejected, source/Run/길이)
knowledge-detail <id> Knowledge 상세와 provenance
promote <id>       Knowledge candidate 승격
reject-knowledge <id> Knowledge candidate 거부
preview <prompt>   다음 Run context와 manifest/제외 사유 미리보기
mode <name>        실행 모드 조회/변경
quit               종료
```

예시:

```text
task release workflow 검토
use <task-id>
run 현재 release 준비 상태를 확인해줘
status
runs
quit
```

CLI와 Windows Terminal TUI는 동일한 application command dispatcher와
`CommandQueue`를 사용합니다. 따라서 빠른 연속 입력도 순서대로 처리되며,
실행 중에는 streaming event가 표시됩니다. 상단 상태 표시에는 현재
Task/Episode/Run이 노출되고, `cancel` 또는 Ctrl-C는 Run을 `aborted`로
영속화합니다.

## Model 선택

MindCraft는 환경변수로 기본 Airouter Model, OpenAI 호환 endpoint, Ollama·LM Studio·vLLM·llama.cpp 같은 로컬 LLM, 또는 Pi에 등록된 provider를 선택할 수 있습니다. 환경변수는 credential 값을 설정 파일에 저장하지 않고 실행 시에만 전달합니다.

| 변수 | 설명 |
|---|---|
| `MINDCRAFT_PROVIDER` | `airouter`, `openai-compatible`, `ollama`, `lmstudio`, `vllm`, `llamacpp`, 또는 Pi provider ID |
| `MINDCRAFT_MODEL` | Model ID. Airouter를 제외한 provider에서 필요 |
| `MINDCRAFT_OPENAI_BASE_URL` | OpenAI 호환 endpoint 주소. 지정하면 provider 기본값은 `openai-compatible` |
| `MINDCRAFT_OPENAI_MODEL` | OpenAI 호환 endpoint의 Model ID |
| `MINDCRAFT_LOCAL_BASE_URL` | 로컬 preset 주소 override |
| `MINDCRAFT_OPENAI_API_KEY` / `OPENAI_API_KEY` | OpenAI 호환 endpoint credential |
| `OLLAMA_API_KEY` / `LMSTUDIO_API_KEY` / `VLLM_API_KEY` / `LLAMACPP_API_KEY` | 해당 로컬 provider credential. 없으면 keyless local로 연결 |
| `MINDCRAFT_OPENAI_CONTEXT_WINDOW` | context window, 기본 `131072` |
| `MINDCRAFT_OPENAI_MAX_TOKENS` | max tokens, 기본 `16384` |
| `MINDCRAFT_OPENAI_REASONING` | `1` 또는 `true`면 reasoning 활성화 |

로컬 preset 기본 주소는 Ollama `http://localhost:11434/v1`, LM Studio `http://localhost:1234/v1`, vLLM `http://localhost:8000/v1`, llama.cpp `http://localhost:8080/v1`입니다.

```sh
MINDCRAFT_PROVIDER=ollama MINDCRAFT_MODEL=qwen2.5:7b mindcraft
MINDCRAFT_PROVIDER=openai-compatible MINDCRAFT_OPENAI_BASE_URL=https://api.example.com/v1 MINDCRAFT_OPENAI_MODEL=my-model mindcraft
MINDCRAFT_PROVIDER=my-proxy MINDCRAFT_MODEL=my-model mindcraft
```

`~/.pi/agent/models.json`에 등록된 provider도 `MINDCRAFT_PROVIDER=<id>`로 선택할 수 있습니다. 시작 배너 또는 `model` 명령으로 현재 선택을 확인할 수 있습니다.

## Workflow context handoff

MindCraft는 작업 단계와 subagent 사이에 원본 근거가 연결된 bounded context contract를 제공합니다. 현재 `src/context-handoff.mjs`의 envelope/validator는 독립 API로 구현·검증되어 있으며, 모든 실제 runtime phase/subagent 전이에 자동 연결된 상태는 아닙니다. 요약만 전달하지 않고 source artifact의 경로와 SHA-256, handoff 상태, 제약·미해결 문제·검증 결과, 포함·제외된 claim과 제외 사유를 ContextManifest에 기록합니다.

```text
phase handoff
 -> source digest/stale 검증
 -> scope/redaction/conflict 검사
 -> budget projection
 -> ContextManifest
 -> main agent 또는 subagent
```

원본 artifact는 보존되며 요약은 원본의 대체물이 아닙니다. 일부 완료 또는 차단된 subagent 결과는 자동으로 완료/승인 상태가 되지 않습니다. context budget을 넘는 내용은 조용히 버리지 않고 omission 사유를 남깁니다. 구현 contract와 validator는 `src/context-handoff.mjs`에 있으며, 제품 SSOT와 기존 Run/Knowledge 경계를 유지합니다.

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

State는 append-only 및 checksum-backed 방식으로 저장됩니다. 재시작하면 Task, Episode, Run을 replay합니다. Session마다 별도 `sessionId`와 시작·종료 journal record를 남기며, 여러 번의 순차 실행에서 이전 상태를 이어갈 수 있습니다. journal 손상이 감지되면 새 쓰기는 차단되고 시작 화면에 손상 위치와 `mindcraft repair` 안내가 표시됩니다. 명시적 repair는 원본 backup과 audit 기록을 보존한 뒤에만 쓰기를 재개합니다. 동일 workspace의 process-level writer는 lock으로 하나만 허용하고, stale lock은 소유 process가 종료된 경우에만 복구합니다. 중단된 Run은 recoverable로 분류될 수 있으며, 기존 Run을 덮어쓰지 않고 연결된 새 Run으로 resume합니다.

`doctor`는 local readiness와 live provider readiness를 분리합니다. local/mock 진단은 가능해도 provider가 준비되지 않은 live Run은 fail-closed합니다. Mock과 live mode는 첫 Run 이후 자동 전환하지 않으며, mode 변경은 별도 process/workspace에서 수행합니다.

Knowledge capture에는 provenance가 기록되며 민감정보처럼 보이는 값은 redaction됩니다. capture된 candidate는 자동으로 승인 context에 들어가지 않습니다.

## Safety boundary

- Pi custom tool만 등록합니다.
- Tool 실행 전에 GrantedScope를 검사합니다.
- 오류 출력에서는 token/key/secret 형태의 값을 redaction합니다.
- 파일·명령·네트워크처럼 위험한 동작은 사용자 승인 후 실행합니다.

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

### 오프라인 mock 리허설

credential 없이 실제 application·approval·tool·Knowledge 흐름을 재현하려면
사용자가 명시적으로 `MINDCRAFT_MODE=mock`을 선택하고 mock Model을 등록합니다.
mock은 network를 호출하지 않으며 live provider로 자동 전환하지 않습니다.

```sh
mindcraft init
mindcraft config add-model --id release-mock --provider mock --model deterministic
MINDCRAFT_MODE=mock mindcraft
```

demo workspace에서 mock이 요청하는 고정 검사는 `npm test`로 실행됩니다 (release-readiness 데모 fixture: 승인 게이트된 write 요청과 네트워크 없는 검증 확인).

write 승인 후 command 요청은 별도로 거부해야 하며, `release-report.md`는 승인
이후에만 생성됩니다. `mock`은 Windows Terminal의 native 검증이나 실제
provider 호출의 증거가 아닙니다.

## Release 정보

```text
name: mindcraft
version: 0.1.0
node: >=22.19.0
```
