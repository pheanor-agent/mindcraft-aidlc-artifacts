# JOB-73 — Windows installer/update/release evidence 계획

- 작업 방식: **DDT 기본 작업 워크플로우**
- 상태: **Linux cross-build 구현 및 unsigned artifact 생성 완료**
- 실제 Windows 실행/서명/clean VM: **검증 대기**

## 1. 1차 배포 형태

```text
사용자 단위 installer
→ %LOCALAPPDATA%/Programs/MindCraft/
→ MindCraft.exe + versioned runtime/app
```

관리자 권한 없이 설치한다. 시작 메뉴 shortcut을 만들고 desktop shortcut은 선택 사항으로 둔다. PATH 등록은 필수가 아니다.

단일 portable `.exe`는 1차 필수 조건이 아니며 후속 대안으로 분리한다.

## 2. Version layout

```text
Programs/MindCraft/
  MindCraft.exe
  current/runtime/node.exe
  current/app/
  current/bin/wincred-helper.exe
  current/release-manifest.json

LocalAppData/MindCraft/
  settings.json
  logs/
  diagnostics/
```

작업 폴더와 user data는 설치 version 디렉터리와 분리한다.

생성 산출물은 `dist/MindCraft-0.1.0-win-x64-setup.exe`와 `dist/MindCraft-0.1.0-win-x64.zip`이다. `dist/`는 생성물이므로 Git에서 제외하고 native source, NSIS 정의, manifest generator를 version control한다.

## 3. Update/rollback

```text
새 version staging
→ manifest/file integrity 확인
→ app close 확인
→ active version 전환
→ migration backup
→ 첫 시작 검증
```

실패 시 이전 version, 원본 config, workspace journal을 보존한다. 상위 schema는 덮어쓰지 않는다. 실행 중 업데이트는 종료 후 재시도한다.

## 4. Remove

기본 제거 대상:

- launcher binary
- installed version files
- shortcuts

기본 보존 대상:

- workspace 원본 파일
- workspace `.mindcraft` 기록
- 사용자 설정과 diagnostics는 별도 삭제 선택

## 5. Release manifest/evidence

manifest 필수 항목:

- app/version
- target platform/architecture
- bundled Node version
- Pi/dependency version
- file list와 SHA-256
- license inventory 위치
- SBOM 위치
- signing status
- build source revision

E2E evidence 필수 항목:

- OS build와 architecture
- terminal 종류/버전
- 일반 사용자 조건
- artifact hash
- 설치·시작·업데이트·제거 결과
- 시나리오별 PASS/FAIL
- 실행 시간과 known limitation
- 비밀값 제거 확인

## 6. Release gate

차단 조건:

- 개발 도구 설치가 필수
- 동봉 runtime/resource 누락
- 설치 폴더와 workspace 혼동
- credential 원문 노출
- 승인 전 side effect
- process tree 잔존
- config/journal 데이터 손상
- 한글 경로/입력 실패
- manifest/hash 불일치
- Windows native 증거 없이 지원 완료 주장

## 7. 검증 분리

다음 결과는 서로 대체하지 않는다.

- source unit/regression test
- package dry-run
- runtime artifact smoke
- Windows clean VM
- mock/offline rehearsal
- live provider smoke
- signing/installer verification

## 8. 2026-09-07 구현·검증 결과

완료:

- Win32 x64 launcher와 Credential Manager helper cross-build
- Node.js 22.19.0 Windows x64 runtime 및 production dependencies 패키징
- CycloneDX SBOM 생성
- 25,231개 packaged file SHA-256 manifest 검증
- portable ZIP 및 NSIS installer PE artifact 생성
- `npm run build` 통과
- `npm test` 152/152 통과
- `npm run release:check` 통과

Windows native 검증 대기:

- Authenticode code signing
- clean Windows VM 설치·시작·업데이트·제거
- Credential Manager와 Job Object 실동작
- 한글 IME 및 공백·한글·장경로 workspace
