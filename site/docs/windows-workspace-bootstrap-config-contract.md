# JOB-70 — MindCraft Windows workspace/bootstrap/config 계약

- 작업 방식: **DDT 기본 작업 워크플로우**
- 상태: **설계 완료 — 다음 작업 대기**
- 실제 Windows 실행/설치: **미수행**
- 선행: JOB-69 launcher/runtime 설계
- 후속: JOB-71 credential/provider/onboarding

## 1. Workspace 선택 계약

workspace 후보 우선순위:

```text
--workspace <path>
→ 사용자 설정의 최근 workspace
→ 현재 directory를 후보로 표시
→ native folder picker
→ 실패 시 전체 경로 TUI 입력
```

현재 directory는 사용자 확인 전까지 workspace로 확정하지 않는다. 폴더 확정 전에는 `.mindcraft`, lock, state, knowledge를 생성하지 않는다.

확정 시 다음을 순서대로 수행한다.

```text
입력 수신
→ Windows path canonicalization
→ 존재·directory·쓰기 가능성 read-only 확인
→ system/install directory 여부 확인
→ 사용자 확인
→ workspace identity 생성
→ lock 획득
→ user/workspace config 로드
→ App 초기화
```

지원하지 않는 path 형식이나 containment를 판정할 수 없는 경로는 fail-closed한다.

## 2. 저장 위치 계약

```text
%LOCALAPPDATA%/MindCraft/
  settings.json
  logs/
  diagnostics/

<workspace>/
  .mindcraft/
    config.json
    state.jsonl
    knowledge.jsonl
    agent/
```

설치 폴더에는 사용자 workspace 상태를 기록하지 않는다. 사용자 설정에는 API key 원문이나 작업 본문을 넣지 않는다.

## 3. LaunchContext 계약

```js
{
  appRoot: absolutePath,
  runtimePath: absolutePath,
  userDataRoot: absolutePath,
  requestedWorkspace: string | undefined,
  workspaceRoot: absolutePath | undefined,
  uiMode: "tui" | "cli",
  launchSource: "shortcut" | "terminal" | "explorer",
  requestedMode: "mock" | "live" | undefined
}
```

`workspaceRoot`는 사용자 확정 뒤에만 존재한다. launcher는 `requestedWorkspace`를 전달할 뿐 path policy를 우회하지 않는다.

## 4. Config 계약

사용자 설정과 workspace 설정을 분리한다.

### user settings

```json
{
  "schemaVersion": 1,
  "language": "ko",
  "uiMode": "tui",
  "recentWorkspaces": [],
  "onboardingVersion": 1
}
```

### workspace config

```json
{
  "schemaVersion": 2,
  "models": [
    {
      "id": "primary",
      "provider": "airouter",
      "model": "<selected-model>",
      "enabled": true,
      "purpose": "general",
      "credentialRef": "wincred:MindCraft/profile/primary"
    }
  ],
  "providerDefaults": {}
}
```

규칙:

- credential 원문은 저장하지 않고 reference만 저장한다.
- v1은 읽기 호환하고 migration 전 원본을 backup한다.
- 임시 파일 write 후 replace한다.
- 상위 schemaVersion은 쓰지 않고 복구 안내를 표시한다.
- 모델 0/1/2개와 purpose 정책은 기존 routing 계약을 따른다.
- Run 시작 시 resolved config snapshot과 revision을 기록한다.

## 5. Bootstrap lifecycle

```text
parse launcher context
→ runtime/resource check
→ user settings load or defaults
→ workspace candidate selection
→ explicit confirmation
→ WorkspaceService validate
→ WorkspaceLock acquire
→ config migration/load
→ EffectiveConfigResolver
→ local doctor
→ MindCraftApp.init({ cwd, paths, resolvedConfig })
→ TUI 또는 CLI start
```

초기화 중 오류가 나면 이미 획득한 lock을 해제하고, 부분 config는 active 설정으로 승격하지 않는다. App 초기화 전에 외부 provider 호출을 하지 않는다.

## 6. Lock 계약

- lock identity는 canonical workspace와 state journal에 연결한다.
- 동일 workspace의 두 번째 writer는 `WORKSPACE_LOCKED`로 차단한다.
- owner metadata가 불완전하거나 stale 여부가 불명확하면 자동 삭제하지 않는다.
- process 종료 후 확실히 stale인 경우에만 복구 후보로 표시한다.
- 서로 다른 workspace는 상태를 공유하지 않는다.
- 정상 종료에서 session close와 lock release를 기록한다.

## 7. EffectiveConfigResolver 계약

입력:

```text
user settings
+ workspace config
+ explicit launch flags
+ approved environment override policy
```

출력:

```js
{
  model: { id, provider, model, purpose },
  mode: "mock" | "live",
  endpoint,
  credentialRef,
  configRevision,
  source: { model, endpoint, credential, mode }
}
```

동일 출력 객체를 doctor, preflight, provider adapter, Run에 전달한다. resolver는 credential 원문을 반환하지 않는다.

## 8. 실패·복구 계약

| 상황 | 동작 |
|---|---|
| workspace 없음 | 선택 화면 유지, 파일 생성 없음 |
| 권한 없음 | 원인·대체 경로 안내, 재선택 |
| lock 충돌 | 기존 writer 정보의 비밀 제거 표시, 자동 삭제 금지 |
| config 손상 | backup·repair 안내, 새 side effect 금지 |
| 상위 schema | read-only 안내, 덮어쓰기 금지 |
| provider 미준비 | local 상태와 live 상태 분리, live Run 차단 |
| 초기화 실패 | lock release 시도, diagnostic code 표시 |

## 9. 구현 단위와 검증 계획

구현 시 다음 단위로 분리한다.

1. `WorkspaceService`: path candidate/정규화/최근 목록
2. `UserSettings`: schema/default/atomic save
3. `ConfigStore`: v1 read/v2 write/migration/backup
4. `EffectiveConfigResolver`: 단일 config snapshot
5. `Bootstrap`: LaunchContext와 서비스 조립
6. `WorkspaceLock`: canonical identity와 stale policy

검증은 실제 Windows 실행 전 offline 테스트로 먼저 만들고, Windows native 검증은 별도 실행 단계에서 수행한다.

## 10. 다음 연결

JOB-71에서 CredentialStore, provider adapter, onboarding wizard의 저장·취소·연결 테스트 계약을 작성한다.
