# JOB-69 — MindCraft Windows launcher/runtime 기술 spike 설계

- 작업 방식: **DDT 기본 작업 워크플로우**
- 상태: **Win32 x64 launcher/runtime/installer cross-build 완료**
- 실제 Windows 실행: **검증 대기**
- installer: **unsigned NSIS artifact 생성 완료**, 서명 대기

## 1. 목표

개발 도구가 없는 Windows 일반 사용자가 설치된 `MindCraft.exe`를 실행했을 때, 설치 폴더의 고정 runtime과 app을 사용해 bootstrap을 시작하도록 하는 기술 spike의 실행 계약과 판정 기준을 정한다.

이번 단계에서 기술 후보의 실제 성공을 주장하지 않는다. 후보는 실제 Windows 환경에서 별도 spike를 수행한 뒤 선택한다.

## 2. 후보 비교

| 영역 | 후보 | 장점 | 위험/확인 필요 |
|---|---|---|---|
| launcher | C# self-contained native launcher | Windows API·console·process 관리 접근성이 좋고 별도 Node 설치 불필요 | publish 크기, runtime 포함 방식, 백신/서명, stdout/console 동작 |
| launcher | Win32 native launcher | 의존성 최소화와 정밀한 console/process 제어 | 구현·유지보수 비용, 문자열/경로/인자 처리 위험 |
| launcher | Node SEA/bundler | 단일 파일 목표에 가까움 | Pi lazy import, resource discovery, native module, child 실행 호환성 |
| installer | 사용자 단위 installer | 관리자 권한 없이 설치 가능 | shortcut, uninstall, update/rollback, 백신·서명 동작 |
| distribution | runtime 동봉 ZIP | 내부 검증·수동 배포가 단순 | 설치/shortcut/update는 별도 필요 |

### 1차 설계 결론

- 1차 배포는 **runtime 동봉 + native launcher + 사용자 단위 installer**를 우선한다.
- 기존 ESM/Pi app 구조는 spike에서 bundling하지 않고 원형으로 로드한다.
- 단일 portable `.exe`와 Node SEA/bundler는 1차 필수 조건이 아닌 후속 대안이다.
- 후보·버전·라이선스·크기·실제 호환성은 Windows spike 결과 후 확정한다.

## 3. 설치 layout 계약

```text
%LOCALAPPDATA%/Programs/MindCraft/
  MindCraft.exe
  current/
    runtime/node.exe
    app/package.json
    app/src/
    app/node_modules/
    bin/wincred-helper.exe
    release-manifest.json

%LOCALAPPDATA%/MindCraft/
  settings.json
  logs/
  diagnostics/

<사용자 workspace>/
  .mindcraft/
```

규칙:

- launcher 위치와 workspace는 서로 다른 개념이다.
- PATH의 Node를 사용하지 않는다.
- user data와 workspace 원본 파일을 설치 제거 대상에 포함하지 않는다.
- 활성 version은 manifest 검증 후 선택한다.
- 업데이트 실패 시 이전 version과 user data를 보존한다.

## 4. Launcher contract

입력:

```text
MindCraft.exe [--cli] [--workspace <path>] [--mock] [--diagnostics]
```

구현 규칙:

1. 인자를 배열로 파싱하며 shell command 문자열로 재조립하지 않는다.
2. 실행 파일 위치를 기준으로 manifest와 `runtime/node.exe`를 찾는다.
3. manifest version·파일 존재·필수 resource를 확인한다.
4. `node.exe <appRoot>/src/bootstrap.mjs` 형태의 child를 구조화된 인자로 시작한다.
5. key/credential을 command line에 넣지 않는다.
6. 기존 console에 연결할지 새 console을 준비할지 실행 source와 console 상태로 결정한다.
7. child 종료를 기다리고 exit code를 전달한다.
8. bootstrap 실패 시 오류 code·다음 행동·diagnostics 경로를 표시한다.
9. launcher 자체는 model selection, provider 호출, workspace journal 변경을 담당하지 않는다.

금지:

- PATH의 임의 `node.exe` 사용
- 현재 working directory를 무조건 workspace로 확정
- Explorer 실행을 process 이름만으로 추측
- launcher 종료 후 child를 방치
- API key를 argv·환경 전체 상속·launcher log에 기록

## 5. Bootstrap contract

`LaunchContext`:

```js
{
  appRoot,
  runtimePath,
  userDataRoot,
  requestedWorkspace: string | undefined,
  uiMode: "tui" | "cli",
  launchSource: "shortcut" | "terminal" | "explorer",
  requestedMode: "mock" | "live" | undefined
}
```

순서:

```text
launcher validation
→ bootstrap context
→ user settings load
→ workspace candidate presentation
→ explicit workspace confirmation
→ canonical path/storage/lock check
→ workspace config load
→ effective config resolve
→ doctor
→ MindCraftApp init
→ TUI/CLI
```

workspace 확정 전 금지:

- `.mindcraft` 생성
- lock 생성
- state/Knowledge journal 생성
- App writer 초기화

## 6. Manifest contract

초안:

```json
{
  "app": "mindcraft",
  "version": "<version>",
  "runtime": {
    "name": "node",
    "version": "<pinned-version>",
    "relativePath": "runtime/node.exe"
  },
  "entry": "app/src/bootstrap.mjs",
  "files": [
    { "path": "runtime/node.exe", "sha256": "<digest>" },
    { "path": "app/package.json", "sha256": "<digest>" }
  ],
  "platform": "win32-x64",
  "createdAt": "<timestamp>"
}
```

Manifest는 실행 전 integrity 확인에 사용한다. hash는 무결성 검출용이며 서명이나 sandbox를 대신하지 않는다.

## 7. Spike 판정 기준

실제 Windows spike에서 다음을 독립적으로 확인한다.

### 필수 통과

- Node/npm/Git/WSL가 없는 일반 계정에서 launcher가 시작됨
- PATH에 다른 Node가 있어도 동봉 Node를 사용함
- Explorer와 기존 terminal 양쪽에서 child가 정상 종료됨
- 한글·공백이 있는 설치 경로와 workspace 인자가 보존됨
- Pi ESM/resource loading이 개발 checkout 없이 동작함
- TUI/CLI exit code가 launcher까지 전달됨
- manifest/resource 누락 오류가 창이 사라지지 않고 안내됨
- child 실패·취소 후 고아 process가 남지 않음

### 차단 조건

- 동봉 Node 대신 PATH Node를 사용함
- argv나 log에 credential 원문이 남음
- workspace를 임의 선택하거나 설치 폴더에 기록함
- Pi dynamic import/resource가 artifact에서 누락됨
- launcher가 child보다 먼저 종료됨
- Console Host/Windows Terminal 중 지원 대상으로 정한 환경에서 입력이 불가함
- 단일 child 종료 후 process tree가 잔존함

## 8. 산출물

실제 spike 수행 시 다음을 남긴다.

- launcher source와 build configuration
- runtime/app staging directory
- release manifest
- dependency/license inventory
- artifact SHA-256
- Windows 환경·터미널·사용자 계정 조건
- 성공/실패 로그와 화면 증거
- known limitations
- rollback 절차

Linux aarch64 환경에서 LLVM-MinGW로 x64 launcher/helper PE를 cross-build하고 Node.js 22.19.0 runtime bundle, SHA-256 manifest, CycloneDX SBOM, portable ZIP, NSIS installer를 생성했다. PE 형식과 packaged file 25,231개의 manifest는 검증했으며, 실제 Windows 실행 증거와 signing은 별도 release gate로 남긴다.

## 9. 다음 작업 연결

JOB-70에서 다음을 상세화한다.

- `bootstrap.mjs` 책임과 lifecycle
- `WorkspaceService` 경로 정규화·최근 목록·폴더 선택 fallback
- user settings와 workspace config schema
- lock 획득 시점과 실패 UI
- `--workspace`/recent/interactive 우선순위
- 기존 `MindCraftApp`에 resolved context를 주입하는 방식
