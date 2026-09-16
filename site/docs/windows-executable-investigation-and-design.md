# MindCraft Windows 실행 파일·신규 사용자 경험 조사 및 상세 설계

- 작업: **JOB-68**
- 작업 방식: **DDT 기본 작업 워크플로우**
- 상태: **조사·설계 완료 — 리뷰 완료 — 구현 승인 대기**
- 실행 제한: 이 문서 단계에서는 Windows 실행·설치·live provider 호출을 수행하지 않는다.
- 입력: `windows-executable-comprehensive-design.md`

## 1. 목적과 범위

개발 도구가 없는 Windows 일반 사용자가 설치 파일을 실행해 MindCraft의 첫 Task/Run을 시작하고, 승인·결과·복구·다음 실행까지 이어갈 수 있는 제품 구조를 정의한다.

이번 설계의 1차 배포 형태는 다음으로 고정한다.

```text
사용자 단위 installer
→ 설치된 MindCraft.exe launcher
→ 설치 폴더에 포함된 node.exe와 MindCraft app
```

단일 portable `.exe`는 이번 구현 승인 범위에 포함하지 않으며, 실제 artifact spike 이후 별도 판단한다.

포함:

- launcher/bootstrap 책임 경계
- 설치 위치와 workspace/user-data 분리
- onboarding, model/provider, credential 처리 계약
- TUI 기본 진입과 CLI 호환
- Windows path/process/shutdown/lock 경계
- installer/update/remove/release evidence 설계
- 조사 결과와 구현 순서

제외:

- 실제 Windows/clean VM 실행
- 실제 installer 제작·서명
- 실제 Credential Manager 저장
- 실제 live provider 호출
- 외부 push·배포
- 자동 provider fallback/switching
- 동시 workspace writer

## 2. 조사 결과

### 2.1 현재 저장소 사실

| 영역 | 조사 결과 | 설계 영향 |
|---|---|---|
| Runtime | `package.json`의 Node engine은 `>=22.19.0` | 동봉 runtime 버전을 고정하고 PATH Node를 사용하지 않음 |
| 진입점 | `src/cli.mjs`는 기본 readline, `MINDCRAFT_TUI=1`에서 TUI | launcher 기본 모드를 TUI로 만들되 `--cli`를 명시적 호환 모드로 둠 |
| 설정 | `.mindcraft/config.json`, schemaVersion 1, model registry | 사용자 설정/workspace 설정과 v2 migration은 별도 설계 필요 |
| Workspace | CLI의 `process.cwd()`와 상대 `.mindcraft` 중심 | `--workspace`·최근 폴더·폴더 선택의 명시적 확정 필요 |
| Provider | Airouter/mock와 환경변수 기반 selection 경로가 공존 | EffectiveConfigResolver를 단일 진실 경로로 만들고 provider adapter로 감쌈 |
| Preflight | localReady와 liveReady를 일부 분리하지만 provider 상태는 제한적 | app/storage/config/credential/connectivity를 독립 상태로 표시 |
| Credential | 현재 reference/environment 중심 | Windows 보호 저장과 session-only fallback을 구현 경계로 분리 |
| Approval | write/command가 승인 매니저와 audit를 사용 | Windows UI는 immutable request/digest와 기존 gate를 재사용 |
| Path | 실행 root와 approval 경계가 존재 | Windows canonical path/reparse/ADS/UNC 정책 adapter 필요 |
| Process | `spawn(..., shell:false)`와 단일 child kill 중심 | Windows process tree/Job Object 동등 제어를 별도 adapter로 검증 |
| Lock | journal `.lock` directory와 PID 확인 | canonical workspace identity 및 stale lock 정책을 Windows에서 재검증 |
| TUI | `render(120)` 결과를 transcript 문자열에 다시 저장 | 원본 event/message 모델과 width-aware renderer로 교체 설계 |
| Release | npm pack dry-run과 install.sh 중심 | Windows artifact manifest/installer/license/SBOM/signing evidence 추가 |

### 2.2 기존 문서와의 차이

기존 `docs/demo-plan/phase-06-windows-release.md`는 Windows Terminal 안에서 WSL과 Node를 사용하는 검증 시나리오다. 이번 목표는 Windows native 설치 파일이므로 다음처럼 구분한다.

- WSL은 필수 설치 전제가 아니다.
- Windows Terminal은 우선 검증 대상이지만 Console Host도 대체 경로로 검증한다.
- Linux/mock 결과는 Windows native 완료 증거가 아니다.
- `install.sh`는 개발자/호환 경로로 유지할 수 있으나 일반 사용자 진입 경로가 아니다.

## 3. 목표 사용자 흐름

```text
MindCraft.exe
→ launcher health check
→ Welcome
→ workspace 선택 / mock 체험 / 최근 workspace
→ 실행 방식 선택
→ provider·model 입력
→ credential 저장 방식 선택
→ local validation
→ optional connection test
→ Home
→ 자연어 요청
→ Task/Episode/Run
→ 승인 panel
→ 결과·검증
→ Knowledge candidate review/promote
→ 정상 종료
→ 다음 실행에서 복원
```

원칙:

- workspace가 확정되기 전 `.mindcraft`를 생성하지 않는다.
- 사용자가 선택하지 않은 model/provider를 추정하지 않는다.
- mock은 live로 자동 전환하지 않는다.
- 승인 전 파일·명령·network side effect가 없다.
- 중단된 effect는 자동 재실행하지 않는다.

## 4. 아키텍처 설계

```text
MindCraft.exe
  └─ Launcher
      ├─ console attach/create
      ├─ manifest/runtime/resource check
      ├─ structured argv parsing
      └─ child lifecycle / exit code
          └─ Bootstrap
              ├─ LaunchContext
              ├─ UserSettings
              ├─ WorkspaceService
              ├─ OnboardingController
              ├─ CredentialStore
              ├─ EffectiveConfigResolver
              └─ MindCraftApp
                  ├─ TuiController / CliAdapter
                  ├─ WorkflowRepository / WorkspaceLock
                  ├─ ProviderAdapter / Pi AgentSession
                  ├─ Approval / GrantedScope
                  └─ Knowledge / ContextBuilder
```

### 4.1 Launcher

책임:

- 자신의 설치 위치에서 version manifest와 동봉 `node.exe`를 찾는다.
- PATH나 현재 directory의 Node를 사용하지 않는다.
- 인자를 배열/구조체로 전달하고 shell command 문자열을 만들지 않는다.
- 기존 console attach 또는 console 준비를 수행한다.
- bootstrap child가 끝날 때까지 기다리고 exit code를 전달한다.
- 초기 오류에 code, 다음 행동, 진단 경로를 표시한다.

금지:

- API key 해석
- model 선택
- workspace 파일 변경
- workflow 상태 변경

### 4.2 Bootstrap

`LaunchContext`:

```js
{
  appRoot,
  runtimePath,
  userDataRoot,
  requestedWorkspace,
  uiMode: "tui" | "cli",
  launchSource: "shortcut" | "terminal" | "explorer"
}
```

초기화 순서:

```text
parse args
→ locate manifest/runtime
→ load user settings
→ resolve workspace candidate
→ user confirms workspace
→ validate storage/lock
→ load workspace config
→ resolve effective model
→ local doctor
→ initialize MindCraftApp
→ start TUI/CLI
```

workspace 확정 이전에는 repository, lock, state, knowledge를 초기화하지 않는다.

### 4.3 설정과 EffectiveConfig

사용자 설정:

- language, UI preference
- recent workspaces
- onboarding version
- 마지막 선택 상태

workspace 설정:

- schemaVersion
- model profiles
- provider/endpoint
- purpose
- credential reference

Run 시작 시 다음 snapshot을 저장한다.

```js
{
  modelId,
  provider,
  model,
  purpose,
  mode: "mock" | "live",
  endpoint,
  credentialRef,
  configRevision
}
```

`preflight`, `doctor`, provider adapter, 실제 Run은 같은 resolver 결과를 사용한다. 환경변수는 명시적 고급 override로만 허용하고 출처를 표시한다.

### 4.4 CredentialStore

계약:

- UI에는 마스킹된 입력만 제공한다.
- 일반 JSON, argv, transcript, crash report, audit, Knowledge에 원문을 기록하지 않는다.
- 1차 저장 후보는 Windows Credential Manager다.
- 보호 저장 실패 시 평문 파일 fallback은 하지 않는다.
- 사용자가 허용하면 이번 실행만 메모리에서 사용한다.
- 삭제·교체·저장 취소를 지원한다.

CredentialStore는 원문을 UI나 App 일반 객체에 반환하지 않고, provider 호출 직전의 제한된 resolver 경계에서만 사용한다.

### 4.5 WorkspaceService와 path 정책

기본 scope는 사용자가 확정한 execution root 하위다.

- drive/UNC/case/separator를 canonical identity로 정규화한다.
- 문자열 prefix가 아닌 path containment로 판단한다.
- `..`, drive-relative, device path, ADS, junction/reparse escape는 지원 정책이 없으면 거부한다.
- `.mindcraft`, credential-like, secret, binary, generated, vendor 파일은 일반 context에서 제외한다.
- root 밖 접근은 구체적인 target/scope/impact/risk를 가진 별도 승인 없이는 거부한다.
- 새 파일은 부모 directory를 포함해 실행 직전에 재검증한다.

### 4.6 TUI/CLI

기본 모드:

- Explorer/shortcut/일반 terminal에서 `MindCraft.exe`를 실행하면 TUI
- `MindCraft.exe --cli`는 줄 단위 CLI
- `--workspace <path>`는 명시적 workspace 후보
- `--mock`는 명시적 mock 시작 요청이며 live 설정을 덮어쓰지 않음

TUI 책임:

- 입력·표시·승인 결정 전달
- business state를 직접 확정하지 않음
- 원본 event/message를 보관하고 resize 때 재렌더링
- transcript 상한 적용
- Escape는 뒤로/닫기, Ctrl-C는 활성 Run 취소 또는 idle 종료 확인

App 책임:

- Task/Episode/Run 상태
- model/mode snapshot
- approval/effect journal
- session lifecycle
- persistence와 recovery

### 4.7 Provider와 Doctor

Doctor 상태를 다음으로 분리한다.

```text
appReady
workspaceReady
configReady
credentialReady
mockReady
connectivity: not_checked | reachable | failed
liveReady
runReady
```

- localReady는 runtime/storage/config의 로컬 상태다.
- liveReady는 실제 provider 실행 조건이 충족되었음을 의미하지만 실제 유료 호출 성공과 동일하지 않다.
- 연결 테스트는 사용자 명시 동작이며 비용·전송 대상을 먼저 보여준다.
- provider adapter는 지원 여부, endpoint, credential 필요성, runtime 등록, 연결 테스트를 함께 소유한다.

### 4.8 Approval/Command

ApprovalRequest는 다음을 포함한다.

```js
{
  requestId,
  runId,
  kind,
  canonicalTarget,
  executable,
  args,
  cwd,
  payloadDigest,
  impact,
  risk,
  status
}
```

실행 순서:

```text
normalize
→ scope check
→ immutable request journal
→ user decision journal
→ execution_started journal
→ effect
→ result/failed/unknown journal
```

Windows command runner:

- `shell:false`
- 승인된 executable/args/cwd 배열
- 필요한 Windows 환경만 allowlist
- credential과 광범위한 사용자 환경을 child에 상속하지 않음
- timeout/cancel 시 process tree 종료
- effect 결과가 불명확하면 `unknown`

### 4.9 Shutdown/Recovery

모든 종료 경로는 하나의 coordinator로 합친다.

```text
new input 차단
→ active Run cancel 요청
→ pending approval 무효화
→ Pi session unsubscribe/dispose
→ child tree 정리
→ journal flush
→ session close
→ workspace lock release
→ terminal restore
→ exit code
```

강제 종료 후:

- 종료 기록이 없는 Run을 recoverable로 표시
- started 후 결과 없는 effect는 unknown
- 자동 재실행·자동 승인 금지
- resume은 기존 Run을 보존하고 새 Run을 연결

### 4.10 Packaging과 업데이트

설치 layout 제안:

```text
%LOCALAPPDATA%/Programs/MindCraft/
  MindCraft.exe
  versions/<version>/runtime/node.exe
  versions/<version>/app/
  versions/<version>/release-manifest.json
  versions/<version>/licenses/

%LOCALAPPDATA%/MindCraft/
  settings.json
  logs/
  diagnostics/

<workspace>/
  .mindcraft/
```

- 관리자 권한 없는 사용자 단위 설치
- 시작 메뉴 shortcut, desktop shortcut은 선택
- 앱 폴더와 user data/workspace 분리
- 업데이트는 새 version 준비·manifest 검증 후 활성화
- migration 전 config backup
- 상위 schema는 쓰지 않고 오류 안내
- 제거 시 기본은 binary/shortcut만 제거하며 workspace 원본은 유지
- 공개 전 manifest, SHA-256, license, SBOM, signing 상태를 함께 기록

## 5. 조사·설계 후속 작업 순서

| 순서 | 작업 | 산출물 |
|---:|---|---|
| 1 | Windows packaging/launcher 기술 비교 조사 | 선택 기준표, spike 계획 |
| 2 | LaunchContext/bootstrap 계약 | argument/context schema, lifecycle diagram |
| 3 | Workspace/path/lock 계약 | canonicalization 및 fail-closed policy |
| 4 | Config/provider/credential 계약 | schema v2, resolver, redaction policy |
| 5 | TUI/onboarding/shutdown 계약 | state machine, message/event model |
| 6 | command/process safety 계약 | runner interface, cancellation/unknown policy |
| 7 | installer/update/release 계약 | layout, manifest, rollback/evidence schema |
| 8 | 구현·검증 계획 통합 | unit breakdown, test matrix, acceptance traceability |

## 6. 반드시 유지할 제품 정책

- Model 0/1/2개와 purpose 정책
- 자동 fallback/switching 금지
- Knowledge candidate 자동 사용·자동 승격 금지
- 승인 전 side effect 금지
- execution root 기본 scope
- 단일 workspace writer
- 복구 시 unknown effect 자동 재실행 금지
- MindCraft runtime과 개발 방법론 문서의 분리

## 7. 구현 전 남은 결정

1. 1차 installer 기술과 launcher 구현 언어
2. Windows 11 x64 외 Windows 10/ARM64 승격 여부
3. Credential Manager binding/helper 방식
4. Console Host와 Windows Terminal의 지원 우선순위
5. UNC/OneDrive/reparse/ADS 정책의 지원·거부 범위
6. 연결 테스트의 비용·timeout·전송 preview 계약
7. TUI transcript/event 상한과 성능 목표
8. portable 단일 exe를 후속 목표로 둘지 여부

이 결정들은 실제 실행 전에 설계 승인으로 확정하고, 구현 중 임의로 변경하지 않는다.
