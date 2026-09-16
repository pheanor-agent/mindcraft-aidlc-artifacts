# MindCraft Windows 실행 파일·신규 사용자 경험 설계 검토 및 승인요청

- 검토 대상: `windows-executable-comprehensive-design.md`
- 원문 보관 위치: `/opt/data/cache/documents/doc_b458fe1df08d_windows-executable-comprehensive-design.md`
- 원문 SHA-256: `727f864f37ce2389456089ff9857ff9a9bd59265504d6143417f3d02d931f833`
- 현재 제품 저장소: `/opt/data/workspace/mindcraft`
- 검토 상태: **이전 기록 — 기본 작업 워크플로우 문서로 대체됨**
- 구현 상태: **미적용**
- 프로세스 위치: **AI-DLC 방식 적용 기록 아님; 본문은 참고 기록으로 보존**

> 이 문서는 설계를 제품에 적용하기 전에 수행한 검토 결과와 다음 단계 승인을 요청하기 위한 기록이다. 승인 전에는 소스 수정, patch 적용, native helper/installer 구현, credential 변경, live provider 호출, 외부 push·배포를 수행하지 않는다.

## 1. 수행한 절차

1. 첨부 문서 전체를 검토하고 목표·범위·수락 기준·아키텍처·보안 경계·테스트 매트릭스·구현 순서를 확인했다.
2. 현재 AI-DLC Inception 요구사항·제약 및 기존 MindCraft SSOT와 대조했다.
3. 현재 저장소의 package, CLI, preflight, config 저장 경로를 확인했다.
4. 현재 저장소에서 재현 가능한 기준선 명령을 실행했다.
5. 구현 갭, 승인 전 결정사항, Windows 미검증 항목을 분리해 기록했다.
6. 소스 적용 없이 본 승인요청 문서와 작업 항목만 등록한다.

## 2. 현재 기준선 실행 결과

실행 위치: `/opt/data/workspace/mindcraft`

| 명령 | 결과 | 의미 |
|---|---|---|
| `npm run build` | **PASS** | 현재 지정 파일 syntax check 통과 |
| `npm test` | **PASS — 130/130** | 현재 Linux/Node 환경의 회귀 기준선 |
| `npm run release:check` | **PASS** | npm package dry-run, 24 files / 35.4 kB package |
| 첨부 원문 SHA-256 | `727f864f...d931f833` | 검토 입력 identity |
| 기준 ZIP SHA-256 | `d4b8aa8f...9d0c27` | `mindcraft-code-current.zip` identity |

위 결과는 Windows native 실행, 설치 성공, 서명, 실제 provider 호출, Credential Manager, 한글 IME, clean VM 성공을 의미하지 않는다.

## 3. 설계와 현재 상태의 정합성

### 유지 가능한 방향

- 기존 Task → Episode → Run, approval barrier, Knowledge candidate/promote, fail-closed, 자동 fallback 금지 정책과 정합하다.
- 설치 위치와 사용자 작업 폴더를 분리하고, 실행 파일 위치를 workspace로 암묵 선택하지 않는 방향이 현재 workspace/context 경계와 정합하다.
- mock/live 및 local/live readiness를 분리하고, Run 시작 시 model/mode snapshot을 고정하는 방향이 기존 결정과 정합하다.
- 순차 세션·단일 writer·복구 시 자동 재실행 금지·승인 전 side effect 금지 원칙을 유지한다.
- AI-DLC 문서/감사 상태와 MindCraft runtime 상태를 분리한다.

### 현재 코드와의 주요 갭

1. `src/cli.mjs`는 기본 readline CLI이고 `MINDCRAFT_TUI=1`일 때만 TUI다. 설계의 “기본 실행에서 TUI 진입”은 미구현이다.
2. 현재 설정 경로는 상대 `.mindcraft`와 `process.cwd()` 중심이며, launcher/bootstrap/workspace picker/user-data 분리가 없다.
3. 현재 config schema는 v1 모델 registry다. 설계가 제안한 v2 migration, effective config 단일 경로, Windows credential reference는 미구현이다.
4. `src/preflight.mjs`는 `airouter`/`mock` 기준의 현재 진단이며, 설계가 요구하는 provider adapter 소유 readiness·credential broker·연결 테스트 계약은 확장 필요하다.
5. 현재 package에는 Windows native launcher, 동봉 Node runtime, installer, manifest/SBOM/license/signing pipeline이 없다.
6. 현재 명령 fixture와 child process 처리는 Windows 절대 runtime·process tree/Job Object 검증 전이다.
7. 현재 TUI는 설계가 요구하는 onboarding wizard, 원본 event transcript, 승인 panel, IME/resize 및 종료 coordinator 전체를 충족한다고 볼 수 없다.

## 4. 반드시 분리할 결정과 검증

- **WIN-00 기준선:** Windows 11 x64 일반 계정, Node/npm/Git/WSL 미설치 clean VM의 baseline을 별도로 수립한다.
- **WIN-01 배포 spike:** C# self-contained/Win32 launcher, 동봉 Node, 원형 ESM/Pi 리소스 로딩, 콘솔 소유권을 실제 artifact로 비교한다.
- **인증:** Windows Credential Manager 방식과 session-only fallback을 검증하되 평문 파일 fallback은 허용하지 않는다.
- **경로·프로세스:** 한글/공백 경로, root containment, junction/reparse/UNC/ADS 정책, process tree 취소를 Windows API 기준으로 검증한다.
- **UX:** Windows Terminal과 Console Host에서 onboarding, IME, 붙여넣기, resize, Ctrl-C/EOF/창 닫기를 수동·자동 증거로 남긴다.
- **모델:** 모델 0/1/2개와 purpose 정책, mock/live 분리, provider preflight와 실제 호출 설정의 동일성을 회귀 테스트로 고정한다.

## 5. AI-DLC 작업화 제안

단일 construction unit 내부의 Windows 배포 vertical slice로 다음 순서를 제안한다.

```text
WIN-00 기준선·환경 분류
→ WIN-01 runtime 동봉·launcher spike
→ WIN-02 bootstrap/workspace/기본 TUI
→ WIN-03 effective config/provider 진단
→ WIN-04 credential/onboarding
→ WIN-05 home/approval/Knowledge UX
→ WIN-06 path/command/shutdown/lock
→ WIN-07 installer/update/remove/signing
→ WIN-08 clean VM·live·사용자 검증
→ WIN-09 릴리스 판정
```

각 작업은 변경 파일, 재현 명령, 수동 절차, 산출물 hash, rollback, 미검증 제한을 기록한다. WIN-01 결과가 native dependency·콘솔·리소스 로딩에서 실패하면 배포 기술을 재선정한다.

## 6. 이번 승인 요청 범위

다음을 승인해 주십시오.

1. 첨부 설계를 **Windows 배포 및 신규 사용자 경험의 AI-DLC Inception 입력/검토 기준선**으로 채택
2. 단일 Node package와 단일 construction unit 안에서 위 WIN-00~WIN-09 순서로 requirements/user stories/acceptance/design/verification 계획을 구체화
3. 기존 Task/Episode/Run, approval, Knowledge, routing, recovery 정책을 유지한 채 Windows adapter·launcher·installer 경계를 설계
4. Windows native 증거가 확보되기 전에는 “Windows 지원 완료”, “개발 도구 불필요”, “서명으로 경고 제거”를 제품 주장으로 사용하지 않음
5. 구현 전 resume/provider preflight/mock-live/workspace context 등 기존 미결정 계약을 Inception에서 확정

승인에 포함하지 않는 사항:

- 현재 저장소에 첨부 설계의 patch·reference 코드를 자동 적용
- 즉시 Windows installer/launcher/native credential helper 구현
- 실제 유료 provider 호출 또는 credential 수집·변경
- GitHub push, 공개 배포, 서명 완료 판정
- Windows clean VM, IME, live provider 검증 완료 판정
- 단일 portable `.exe`를 1차 출시 필수 조건으로 확정

## 7. 승인 선택지

### Approve & Continue

다음 문서화 단계만 진행한다.

- WIN 작업의 user stories와 acceptance criteria
- Windows platform/NFR 및 adapter 계약
- launcher/installer/credential spike 계획
- clean VM 및 release evidence schema
- 이후 Construction 진입을 위한 별도 승인요청

### Request Changes

다음 중 변경할 범위를 지정한다: portable 단일 exe 필수 여부, 지원 Windows 버전/architecture, Credential Manager 정책, Windows Terminal/Console Host 범위, live provider 필수 여부, installer/signing 배포정책, workspace context 범위.

### Hold

배포 형태·지원 플랫폼·인증·live 검증 범위가 확정될 때까지 현재 Inception 승인 게이트에 보류한다.

## 8. 권고 결론

**권고: 조건부 Approve & Continue**

조건:

1. 첨부 문서는 구현 완료 보고서가 아닌 설계 입력으로 취급한다.
2. 현재 실행 결과는 Linux 기준선으로만 기록하고 Windows/live 증거와 섞지 않는다.
3. WIN-00과 WIN-01에서 실제 환경·배포 기술을 검증한 뒤 일정과 구현 범위를 확정한다.
4. 승인 전 소스 수정·native 구현·credential/live 호출·외부 배포를 하지 않는다.
5. 모든 acceptance criterion은 명령 또는 수동 절차와 release artifact hash로 추적한다.

현재 상태: **기본 작업 워크플로우 문서로 대체됨**

## 9. 정정 기록

- 이 문서는 AI-DLC를 기본 작업 방식으로 적용한 이전 기록이다.
- 사용자 정정에 따라 Windows 작업은 DDT 기본 작업 워크플로우로 진행한다.
- 현재 기준 문서는 `docs/windows-executable-design-review-approval.md`이다.
- AI-DLC 관련 내용은 참고 자료로만 취급하며 MindCraft 작업 상태나 승인 체계에 관여시키지 않는다.