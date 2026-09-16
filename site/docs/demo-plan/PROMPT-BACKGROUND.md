# MindCraft 데모 보강 작업 — 종합 프롬프트 배경 자료

## 1. 문서 목적

이 문서는 MindCraft 데모 보강 작업을 수행하는 개발 Agent가 모든 페이즈에서 공통으로 참조해야 하는 배경 자료다. 페이즈별 작업 프롬프트를 실행하기 전에 이 문서를 함께 제공한다.

이 문서의 목표는 다음과 같다.

- 제품 목적과 데모 목적을 동일하게 유지한다.
- 기존 구현을 정확히 파악한 뒤 필요한 부분만 수정한다.
- Pi, Model routing, Knowledge, safety, persistence 경계를 침범하지 않는다.
- 실제 검증되지 않은 결과를 성공했다고 보고하지 않는다.
- Windows Terminal + WSL 환경에서 재현 가능한 데모를 만든다.

---

## 2. 제품 정의

MindCraft는 Pi를 기반으로 한 개인용 terminal TUI workflow package다. 사용자가 별도의 coding-agent/harness를 복잡하게 설치하고 연결하지 않아도, 지정한 Model로 코드·문서 분석과 반복 작업을 수행할 수 있게 하는 것이 목적이다.

핵심 workflow는 다음과 같다.

```text
session 생성
→ 목적/범위 입력
→ Pi AgentSession 실행
→ 승인 필요한 작업 확인
→ 결과 검증·저장
→ Knowledge artifact 생성
→ 다음 작업에서 승인된 Knowledge 재사용
```

핵심 차별점은 단순한 AI chat이 아니라 다음 세 가지를 하나의 workflow로 제공하는 것이다.

1. 반복 가능한 Task/Episode/Run 상태 관리
2. 파일·명령 실행에 대한 fail-closed safety와 사용자 승인
3. 검토된 결과를 Knowledge로 축적하고 다음 작업에 재사용

---

## 3. 데모 목표

이번 작업의 목표는 제품 전체를 완성하는 것이 아니다. Windows Terminal + WSL에서 5분 내에 MindCraft의 핵심 가치를 보여주는 안정적인 vertical slice를 완성하는 것이다.

최종 데모 흐름은 다음과 같다.

```text
Windows Terminal
→ WSL/Linux에서 MindCraft TUI 실행
→ 환경 진단
→ 데모 workspace 준비
→ 릴리스 점검 Task 생성
→ AI 분석 실행
→ 파일/명령 승인 요청 확인
→ 사용자 승인 또는 거부
→ 결과 저장
→ Knowledge candidate 검토 및 promote
→ 다음 Run에서 승인된 Knowledge 재사용
→ status/history 확인
```

관객에게 전달할 핵심 메시지:

> 사용자가 지정한 Model로 작업을 수행하고, 위험한 작업은 사용자 승인을 거치며, 검토된 결과를 다음 작업에서 재사용한다.

---

## 4. 현재 저장소와 확인된 기준선

작업 저장소는 `/opt/data/workspace/mindcraft`이며 Node.js package/CLI 구조다.

주요 파일:

```text
src/cli.mjs                 CLI 진입점
src/tui-runner.mjs          interactive Pi TUI
src/tui-adapter.mjs         상태/event 표시 adapter
src/mindcraft-app.mjs       Task/Episode/Run orchestrator
src/model-routing.mjs       Model registry validation/selection
src/config-store.mjs        Model registry load/save
src/knowledge.mjs           Knowledge capture/search/promotion
src/pi-tools.mjs            MindCraft custom tool
src/safety-recovery.mjs     scope, decision, checkpoint/recovery
src/workflow-repository.mjs append-only workflow persistence
src/execution-backend.mjs   provider/backend/profile 관련 adapter
src/token-doctor.mjs        opt-in prompt analysis
```

현재 package 기준:

- package: `mindcraft`
- version: `0.1.0`
- Node.js: `>=22.19.0`
- Pi packages baseline: `0.84.2`
- 제품 interface 목표: Windows Terminal 또는 호환 terminal
- 우선 데모 환경: Windows Terminal + WSL

현재 확인된 검증 결과:

- `npm test`: 99개 테스트 전체 통과
- `npm run build`: 통과
- `npm run release:check`: 통과
- `npm audit --audit-level=high`: high 이상 취약점 0개
- Airouter 기반 live vertical slice 테스트 통과
- `MINDCRAFT_TUI=1` 실행 시 TUI 초기 화면 진입 확인

단, 현재 개발 실행 환경 자체는 실제 Windows가 아니다. Linux kernel 위의 Debian userspace 환경에서 검증되었으므로 Windows Terminal 자체의 rendering, resize, Ctrl-C, Windows path 동작은 Phase 6에서 별도 검증해야 한다.

---

## 5. 현재 구현의 중요한 한계

### 5.1 초기 설정 경로 부족

CLI는 `.mindcraft/config.json`에서 Model registry를 읽지만, 신규 사용자가 TUI 안에서 쉽게 Model을 설정하는 setup wizard/doctor/config command가 부족하다.

따라서 새 환경에서는 다음 문제가 발생할 수 있다.

```text
Model 0개
→ 정책상 실행 차단
→ 사용자는 무엇을 고쳐야 하는지 알기 어려움
```

데모 보강에서는 `init`, `doctor`, Model 설정 안내 또는 동등한 흐름을 제공해야 한다.

### 5.2 TUI 기능이 CLI보다 적음

현재 TUI는 기본적인 `task`, `run`, `tasks`, `status`, `quit` 중심이다. CLI에 있는 `use`, `runs`, `resume`, `cancel`, `knowledge`, `promote`, `mode` 등이 TUI에서 동일한 수준으로 연결되어야 한다.

### 5.3 Approval workflow — 구현 완료

read/write/command custom tool과 approval manager가 연결되어 있다. write와 command는
`pending → approved/rejected → executed` lifecycle을 따르며, 승인 전 side effect를
실행하지 않는다. TUI/CLI에서 approval 대기 목록을 확인하고 명시적으로 승인·거부한다.

```text
tool request
→ 대상/위험/영향 표시
→ 사용자 승인 또는 거부
→ 실행 또는 차단
→ audit/history 기록
```

### 5.4 Path safety — 구현 완료

- 검증 완료: canonical/realpath 기반 `..`, absolute external path, symlink escape 차단

### 5.5 Knowledge UI 부족

Knowledge backend와 검색·fallback·redaction 테스트는 존재하지만, TUI에서는 목록/검색/관련도/provenance/promote/reject/context preview가 충분히 노출되지 않는다.

### 5.6 비동기 입력 직렬화 필요

readline/TUI에서 빠른 입력이 들어오면 비동기 command가 겹칠 수 있다. command queue 또는 동일한 직렬화 메커니즘을 도입해야 한다.

---

## 6. 반드시 유지해야 하는 제품 정책

### Model 정책

- 사용자가 Model을 지정한다.
- Model 0개는 설정 오류이며 실행하지 않는다.
- Model 1개는 모든 purpose에 사용한다.
- Model 2개는 서로 다른 purpose에 하나씩만 매핑한다.
- 동일 purpose에 2개 이상 Model을 지정하지 않는다.
- 자동 Model 추가 금지
- 임의 Model 선택 금지
- unavailable Model에 대한 자동 fallback 금지
- 실행 전 선택 Model, purpose, availability, 비용 estimate/unknown을 표시한다.

### 파일·명령 정책

- execution root 내부 read는 허용 범위다.
- execution root 외부 파일은 승인 없이 제어하지 않는다.
- write는 승인 전 실행하지 않는다.
- shell command는 승인 전 실행하지 않는다.
- network request는 기본 차단 또는 명시적 승인 대상이다.
- 승인·거부·실행 결과를 Run history에 기록한다.

### Knowledge 정책

- raw data와 metadata/provenance를 함께 보존한다.
- candidate는 자동으로 승인하지 않는다.
- `promoted` 상태만 다음 prompt context에 포함한다.
- relevance/similarity 검색을 우선한다.
- 결과가 부족하면 Knowledge 전체, 이후 실행 폴더 파일 전체로 fallback한다.
- secret처럼 보이는 값은 capture/output/log에서 redaction한다.

### Persistence/recovery 정책

- state는 append-only/checksum-backed 방식이다.
- 손상된 마지막 tail 이후의 기록은 replay하지 않는다.
- 중단된 running Run은 recoverable로 표시한다.
- resume은 기존 Run을 덮어쓰지 않고 새 Run을 만든다.
- 새 Run에는 `resumedFrom` 연결을 기록한다.
- completed/failed/aborted Run을 recoverable로 잘못 분류하지 않는다.

---

## 7. 기술 경계

### MindCraft가 소유하는 것

- Model configuration
- purpose mapping
- Task/Episode/Run workflow
- approval policy
- Knowledge lifecycle
- persistence/recovery
- TUI/CLI user workflow
- audit/summary

### Pi가 소유하는 것

- Agent inner loop
- provider/model invocation
- Pi AgentSession
- Pi의 기존 agent interface
- Pi TUI primitive

Pi API는 adapter 경계 뒤에 둔다. 데모 편의를 위해 Pi 내부 API를 직접 여러 곳에서 호출하거나 business rule을 UI에 복사하지 않는다.

---

## 8. 데모 fixture 권장 내용

sample workspace는 작고 안전해야 한다. 예시는 다음과 같다.

```text
examples/release-demo/
├─ src/
│  └─ release-check.mjs
├─ docs/
│  └─ release-checklist.md
├─ test/
│  └─ release-check.test.mjs
└─ README.md
```

fixture에는 다음을 넣지 않는다.

- 실제 API key
- 실제 token/secret
- 개인 정보
- 사내 운영 데이터
- 외부 서비스에 의존하는 필수 단계

데모는 실제 provider가 가능한 경우 live mode로 수행하되, 리허설과 CI에는 deterministic mock provider를 사용할 수 있어야 한다.

---

## 9. 권장 데모 화면

### 첫 화면

```text
MindCraft Demo

Workspace: release-demo
Model: configured
Provider: available
Knowledge: 3 approved items

Next action:
[1] Start release readiness check
[2] View Knowledge
[3] Run doctor
```

### 실행 중

```text
[RUNNING] release readiness 분석 중...
[EVENT] project files inspected
[EVENT] approved knowledge attached
[WAITING] user approval required
```

### 승인 요청

```text
Approval required

Operation: filesystem.write
Path: ./release-report.md
Reason: 분석 결과 저장
Risk: workspace file modification

[y] Approve  [n] Reject
```

### 결과

```text
Run completed

Model: user-selected-model
Knowledge used: 2 items
Files changed: 1
Commands approved: 1
Commands rejected: 1

Next action: review and promote Knowledge candidate
```

### Knowledge

```text
Knowledge

[1] Release checklist
    status: promoted
    relevance: 0.92
    source: run-001

[2] Temporary analysis
    status: captured
    relevance: 0.66
    source: run-002
```

---

## 10. 공통 구현 규칙

모든 페이즈 작업에서 다음 규칙을 따른다.

1. 먼저 저장소와 기존 테스트를 읽는다.
2. 기존 동작을 깨뜨리지 않는 최소 변경을 우선한다.
3. 구현 전에 acceptance test 또는 deterministic test를 추가한다.
4. 외부 API가 없어도 핵심 workflow를 검증할 수 있어야 한다.
5. side effect는 approval boundary 뒤에 둔다.
6. secret/credential 원문을 테스트 출력이나 로그에 남기지 않는다.
7. Model 자동 fallback을 추가하지 않는다.
8. token-aware dynamic switching은 이번 데모 범위에서 구현하지 않는다.
9. Windows에서 실제로 확인하지 않은 사항은 성공으로 보고하지 않는다.
10. 완료 후 실제 명령을 실행하고 출력에 근거해 보고한다.

---

## 11. 공통 검증 명령

각 페이즈 종료 시 최소한 다음을 실행한다.

```sh
npm run build
npm test
```

Phase 6에서는 다음도 실행한다.

```sh
npm run release:check
npm audit --audit-level=high
npm run test:live
```

실제 Windows Terminal + WSL에서는 다음을 반복한다.

```text
doctor
→ task
→ run
→ approval
→ result
→ knowledge
→ promote
→ second run
→ status
→ quit
```

실패한 검증은 숨기지 말고 다음 형식으로 기록한다.

```text
검증 항목:
실행 명령:
실제 결과:
영향:
다음 조치:
```

---

## 12. 완료 판정

데모 보강 작업은 다음 조건을 모두 만족할 때 완료로 판정한다.

- 처음 보는 사용자가 setup 문서만 보고 시작할 수 있다.
- 첫 화면에서 환경 상태와 다음 행동을 확인할 수 있다.
- TUI에서 Task → Run → 결과 확인이 가능하다.
- write/command 요청이 승인 전 실행되지 않는다.
- 승인/거부 결과가 history에 남는다.
- 첫 Run의 Knowledge를 사용자가 promote할 수 있다.
- promoted Knowledge가 두 번째 Run에서 재사용된다.
- 중단된 Run을 recoverable로 확인하고 resume할 수 있다.
- clean checkout 설치와 기본 검증 명령이 통과한다.
- Windows Terminal + WSL에서 3회 연속 데모가 재현된다.

---

## 13. Agent 작업 결과 보고 형식

각 페이즈 작업이 끝나면 다음 형식으로 보고한다.

```text
## 구현 요약
- 변경한 기능
- 변경한 파일
- 유지한 정책

## 검증
- 실행한 명령
- 실제 결과
- 통과/실패 테스트 수

## 남은 문제
- 미완료 항목
- 알려진 제한
- 다음 페이즈에 필요한 전제

## 데모 영향
- 이번 변경으로 데모에서 새로 보여줄 수 있는 장면
- 아직 수동으로 준비해야 하는 항목
```
