# JOB-51 상세 설계

## 1. 작업 목적

Windows 사용자의 설치 장벽을 낮추면서, OpenCode·Claude Code 등 외부 CLI와 local/cloud Model을 작업 상황에 따라 안전하게 조합하는 실행 기반을 설계한다.

이번 단계의 산출물은 구현 코드가 아니라 다음 실행 단계에서 그대로 사용할 수 있는 계약, test matrix, acceptance 기준이다.

## 2. 확정 범위

### 포함

- Windows-first onboarding 원칙
- Linux native/WSL2/Windows native 지원 matrix
- 외부 CLI preflight 계약
- 공통 CLI adapter 계약
- routing proposal과 사용자 승인 경계
- process, TTY, timeout, cancel, exit code, stream 처리 요구사항
- local/cloud 데이터 경계와 비용 표시 요구사항
- Windows/WSL2 실험 절차와 증적 형식
- deterministic mock adapter 및 no-credential 테스트 계획

### 제외

- 외부 CLI 자동 설치
- API key, OAuth, 로그인 credential 수집·저장
- 실제 유료 Model 호출
- Windows 환경을 이 세션에서 대신 실행하는 것
- OpenCode/Claude Code adapter의 실제 코드 구현
- 최종 OS 지원 선언 또는 배포 홍보

## 3. 제품 구조

```text
MindCraft UI/CLI
  -> PreflightService
  -> RoutingPolicy (proposal only)
  -> ApprovalGate
  -> AgentCliAdapter
       |- OpenCodeAdapter
       |- ClaudeCodeAdapter
       `- MockAdapter
  -> ExecutionRun / Audit / Knowledge
```

MindCraft 본체가 소유하는 것:

- Task/Episode/Run lifecycle
- routing proposal
- approval decision
- scope와 working directory
- audit 및 redaction
- timeout/cancel 정책
- 결과의 provenance와 Knowledge capture

## 3-A. 연결 계층 분리

Model routing과 coding harness 연결은 서로 다른 문제이므로 adapter 계층을 분리한다.

```text
RoutingPolicy
  -> ModelProviderAdapter
       |- Vendor HTTP API
       |- OpenAI-compatible API
       `- Local server (Ollama/LM Studio/llama.cpp 등)

Task requiring repository tools
  -> CodingHarnessAdapter
       |- CLI subprocess
       `- OpenCode server/API (계약 확인 후)
```

### ModelProviderAdapter

- `listModels`, `health`, `countTokens`(지원 시), `complete/stream`, `usage`, `cancel`
- base URL, credential source, model ID, data boundary, cost classification을 명시
- API가 usage/cost를 제공하지 않으면 `unknown` 또는 `estimate`로 저장
- local endpoint는 credential 없이도 동작할 수 있으나 loopback bind와 접근 범위를 확인

### CodingHarnessAdapter

- repository-aware tools, permission workflow, file/command scope, patch/test 실행을 제공
- CLI와 server 방식은 별도 adapter로 두고 공통 Run/audit/approval 계약만 공유
- 단순 요약·분류 작업을 coding harness로 보내지 않아 불필요한 OS 의존성을 만들지 않음

### 연결 방식별 1차 판단

| 방식 | 1차 판단 |
|---|---|
| Vendor HTTP API | Opus 직접 Model 호출 후보. harness 기능은 별도 제공 필요 |
| OpenAI-compatible API | 현재 Airouter 구조 및 local server 재사용 후보 |
| Ollama/LM Studio/llama.cpp local server | Windows-first local routing 후보 |
| OpenCode server/API | CLI subprocess 대체 후보. 인증·scope·stream probe 필요 |
| OpenCode ACP | CLI 외 harness 연결 후보. editor/client 독립성 및 permission probe 필요 |
| Claude Agent SDK | CLI 외 Claude Code agent 연결 후보. SDK가 제공하는 실제 tool/session 범위 probe 필요 |
| CLI subprocess | harness가 꼭 필요한 작업에 한정 |
| MCP | routing이 아니라 tool/context integration으로 분리 |

외부 CLI adapter가 소유하는 것:

- executable 탐색 및 버전 확인
- CLI별 command line 구성
- subprocess 시작·종료·취소
- CLI별 stdout/stderr 및 exit code 변환
- CLI별 permission/interactive 제약 보고

## 4. 공통 adapter 계약 초안

## 4-A. CLI 외 인터페이스 설계

연결 방식은 사용자의 인터페이스가 아니라 MindCraft가 호출하는 **execution backend**로 추상화한다.

```text
ExecutionBackend
  |- Model API backend
  |    |- Vendor HTTP API
  |    |- OpenAI-compatible HTTP
  |    `- Local HTTP server
  |- Harness backend
  |    |- OpenCode server/API
  |    `- CLI subprocess (OpenCode/Claude Code)
  `- Tool/context backend
       `- MCP
```

### 지원 후보

| 인터페이스 | 역할 | 제품 우선순위 | 판단 기준 |
|---|---|---:|---|
| Vendor HTTP API | cloud Model completion | 1 | 인증·stream·usage·timeout |
| OpenAI-compatible HTTP | 사용자 등록 API 및 local server | 1 | `/v1` 호환성·tool calling·health |
| Local HTTP server | local Model 실행 | 1 | loopback·model discovery·GPU·privacy |
| OpenCode server/API | coding harness | 2 | session·scope·approval·stream·cancel |
| OpenCode ACP | editor/client와 agent 연결 | 2 | protocol capability·session·permission |
| Claude Agent SDK | Claude Code agent programmatic embedding | 2 | SDK capability·tool permission·session·version |
| SDK/library | provider 또는 harness 직접 embedding | 3 | runtime 의존성·license·upgrade 비용 |
| CLI subprocess | harness fallback | 3 | TTY·process tree·OS별 동작 |
| Desktop GUI/automation | 시각적 프로그램 제어 | 제외 | 비결정적이고 audit·재현성이 낮음 |
| MCP | tool/context 제공 | 별도 계층 | Model routing이 아닌 capability 확장 |

### 공통 ExecutionBackend 계약

```js
{
  id,
  kind: "model_api" | "harness" | "tool_context",
  detect(): Promise<CapabilityReport>,
  plan(input): Promise<ExecutionPlan>,
  execute(plan, hooks): Promise<ExecutionResult>,
  cancel?(executionId): Promise<void>
}
```

`CapabilityReport`에는 `streaming`, `toolUse`, `repositoryAccess`, `approval`, `usage`, `cost`, `cancellation`, `locality`, `os`를 포함한다. 공통 계약은 기능을 강제하지 않고, routing policy가 capability를 보고 역할에 맞는 backend만 선택하게 한다.

### 인터페이스 선택 규칙

1. 단순 completion과 비용·latency 중심 작업은 Model API backend를 우선한다.
2. local Model은 local HTTP server를 우선하고, backend별 CLI는 직접 호출하지 않는다.
3. repository read/write, test, permission workflow가 필요하면 Harness backend를 사용한다.
4. OpenCode server/API가 CLI와 동등한 scope·approval·cancel을 제공하지 못하면 CLI fallback을 검토한다.
5. MCP는 Model을 고르는 경로가 아니라 선택된 backend에 도구와 context를 추가하는 계층으로 둔다.
6. Desktop GUI 자동화는 MVP와 정식 제품 경로에서 제외한다.

### MVP에 반영할 최소 범위

- `Model API backend`의 health/plan/execute/timeout 계약
- `Harness backend`의 OpenCode/Claude Code preflight capability schema
- `Tool/context backend`는 MCP 실행 없이 capability 필드만 예약
- SDK embedding과 GUI automation은 설계 문서의 후속 후보로만 유지

이렇게 하면 CLI를 제품의 유일한 연결 방법으로 고정하지 않으면서도, 초기 구현이 모든 인터페이스를 동시에 떠안는 문제를 피할 수 있다.

```js
{
  id,
  displayName,
  detect(): Promise<{installed, version, path, reason}>,
  capabilities(): {
    os, nonInteractive, streaming, cancellation,
    permissionMode, localModel, usageReporting
  },
  propose(input): Promise<{argv, cwd, dataBoundary, estimatedCost, warnings}>,
  execute(plan, hooks): Promise<{
    status, exitCode, stdout, stderr, usage, warnings
  }>,
  cancel(runId): Promise<void>
}
```

필수 안전 규칙:

- executable은 allowlist로 제한
- `cwd`는 승인된 project root 내부로 제한
- environment는 allowlist 방식으로 전달
- secret은 argv와 로그에 넣지 않음
- stdout/stderr는 저장 전 redaction
- timeout·cancel 후 process tree를 정리
- 지원하지 않는 capability는 자동 fallback하지 않고 사용자에게 표시

## 5. Routing 설계

routing은 Model 이름만이 아니라 `harness + provider + model + profile` 조합과 작업 단계·정책을 기준으로 proposal을 만든다. OpenCode가 항상 저성능이거나 Claude Code가 항상 고성능이라고 코드에 고정하지 않는다. 사용자가 등록한 조합에 성능·비용 profile을 지정한다.

```json
{
  "profiles": {
    "low_cost": {
      "harness": "opencode",
      "provider": "local-ollama",
      "model": "registered-local-model",
      "costClass": "low",
      "performanceClass": "low"
    },
    "high_quality": {
      "harness": "claude-code",
      "provider": "registered-cloud-api",
      "model": "registered-high-quality-model",
      "costClass": "high",
      "performanceClass": "high"
    }
  }
}
```

OpenCode/Claude Code를 harness로 사용하면서 provider/model을 별도로 지정할 수 있는지는 각 제품의 실제 capability와 설정 계약을 probe한 뒤 확정한다. 연결이 불가능한 조합은 profile을 저장하되 `unavailable`로 표시하고 실행하지 않는다.

| 작업 유형 | 기본 후보 | 승인 필요 |
|---|---|---|
| 단순 초안·반복 변환 | local Model | 있음 |
| 일반 coding/review | local 우선, 필요 시 cloud | 있음 |
| 중요한 설계 판단·최종 리뷰 | 고성능 cloud Model | 항상 있음 |
| local 실패·품질 부족 fallback | cloud Model | 재승인 필요 |

실행 전 화면/출력에는 다음을 포함한다.

- 선택된 adapter와 Model
- local/cloud 실행 위치
- project 파일이 전달되는 범위
- 예상 비용 또는 비용 미확인 표시
- 필요한 filesystem/command/network 권한
- fallback 조건
- 사용자가 변경·거절할 수 있는 선택지

## 6. OS 검증 설계

### 자동 검증

GitHub Windows runner에서 다음을 실행한다.

```powershell
node --version
npm --version
npm ci
npm run build
npm test
npm run release:check
```

검증 대상은 package 설치, 경로 처리, CLI smoke, artifact boundary이며 credential과 외부 Model은 사용하지 않는다.

### 수동 환경 검증

실제 Windows PC 또는 VM에서 다음 조합을 검증한다.

1. Windows native + OpenCode
2. Windows native + Claude Code
3. Windows + WSL2 + OpenCode
4. Windows + WSL2 + Claude Code
5. Linux native 기준 환경

각 조합에서 설치 감지, 간단한 실행, stream 수집, 정상/비정상 exit, timeout, cancel, project path, permission, redaction을 동일한 시나리오로 실행한다.

### WSL2 전용 비교

- `/mnt/c/...` Windows 경로
- WSL 내부 파일시스템 경로
- 한글·공백이 포함된 경로
- file watcher와 대용량 repository 접근
- local backend/GPU 접근
- Windows와 WSL 사이 credential 노출 여부

## 7. 결과 판정

| 판정 | 의미 |
|---|---|
| Supported | 기본 실행·안전성·결과 저장 기준 모두 통과 |
| Conditional | 기능 또는 경로 제한을 문서화하면 사용 가능 |
| Unavailable | 안전한 실행·결과 수집 계약을 만족하지 못함 |
| Not tested | 환경 또는 CLI를 아직 검증하지 않음 |

## 8. 증적 형식

각 테스트는 다음 정보를 남긴다.

- 환경: OS build, shell, Node/npm version
- adapter와 CLI version
- 테스트 ID와 실행 시각
- 입력은 secret 없는 fixture 사용
- exit status, timeout/cancel 결과
- redacted stdout/stderr 요약
- 파일 경로와 권한 결과
- 판정 및 재현 방법

## 9. 단계별 실행 계획

### Phase A — contract probe

CLI 감지·버전·help·non-interactive·exit/stream 계약을 확인한다.

### Phase B — mock adapter

외부 CLI 없이 공통 adapter와 Run/audit/approval 연결을 검증한다.

### Phase C — Windows native

OpenCode와 Claude Code를 각각 독립적으로 검증한다.

### Phase D — WSL2/Linux

동일 시나리오와 WSL2 경로·권한·성능 비교를 수행한다.

### Phase E — routing pilot

local → cloud fallback과 실행 전 승인만 구현하고, 자동 fallback은 금지한다.

각 Phase 종료 후 결과에 따라 다음 Phase 진행 여부를 다시 리뷰한다.

## 10. MVP 범위 제한

초기 구현은 제품 기본값인 OpenCode/Claude Code harness를 우선 대상으로 하되, 실제 외부 CLI를 즉시 자동 설치하거나 유료 실행하지 않는다.

```text
OpenCode/Claude Code harness preflight
  + capability report
  + deterministic harness mock test
  + 사용자 등록 ModelProvider 최소 schema
```

다음 항목은 후속 backlog로 둔다.

- Ollama, LM Studio, llama.cpp 개별 adapter
- OpenCode server/API의 추가 방식
- 실제 OpenCode CLI와 Claude Code CLI 실행 adapter
- MCP tool integration
- 자동 local→cloud fallback
- provider별 정밀 cost/usage 정규화

이 제한은 연결 가능성을 부정하는 것이 아니라, 하나의 검증 가능한 경로를 먼저 완성해 adapter abstraction이 실제로 필요한지 확인하기 위한 것이다.

## 11. SSOT 및 상태 표기

모든 연결 대상은 다음 상태 중 하나로만 기록한다.

- `implemented`: `src/`에서 동작하고 테스트가 있음
- `designed`: 설계 문서에 계약이 있으나 코드 없음
- `probed`: 실제 환경에서 계약 일부를 확인함
- `supported`: acceptance 전체를 통과하고 README에 지원 선언 가능
- `conditional`: 제한 조건과 미지원 기능을 함께 표시
- `unavailable`: preflight 또는 안전성 조건을 만족하지 못함
- `not_tested`: 아직 실행 증적 없음

현재 상태:

| 대상 | 상태 |
|---|---|
| OpenCode/Claude Code 기본 harness | designed, not_tested |
| 사용자 등록 ModelProvider schema | designed |
| Airouter direct provider | implemented as test fixture |
| OpenAI-compatible generic provider | designed as extension |
| local server 개별 backend | not_tested |
| OpenCode server/CLI | designed, not_tested |
| Claude Code CLI | designed, not_tested |
| MCP | designed as tool layer, not routing |

README에는 `implemented`와 승인된 `supported`만 현재 기능으로 표현하고, 나머지는 검토·검증 대기로 표시한다.
