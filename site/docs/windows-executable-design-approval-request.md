# MindCraft Windows 실행 파일·신규 사용자 경험 설계 승인요청

- 작업: **JOB-68**
- 작업 방식: **DDT 기본 작업 워크플로우**
- 조사 문서: `docs/windows-executable-investigation-and-design.md`
- 리뷰 문서: `docs/windows-executable-design-review.md`
- 상태: **Approve & Continue 승인됨 — 후속 작업 등록 단계**
- 구현 상태: **미적용**

## 1. 이번 단계에서 완료한 것

1. 현재 MindCraft의 package/runtime, CLI/TUI, App, provider/model, preflight, config, approval, path, process, lock, Knowledge 경계를 조사했다.
2. 기존 WSL 중심 Windows release 문서와 native Windows 실행 파일 목표의 차이를 정리했다.
3. launcher/bootstrap/workspace/onboarding/credential/effective-config/TUI/approval/process/recovery/packaging 설계를 작성했다.
4. User story와 acceptance 기준을 기존 작업 문서에서 확인하고 상세 설계에 반영했다.
5. 설계 자체 리뷰를 수행해 위험·대응·구현 차단 기준을 기록했다.
6. 실제 Windows 실행·설치·live 호출·서명·credential 저장은 수행하지 않았다.

## 2. 설계 판정

설계는 다음 기존 정책을 유지한다.

- Task/Episode/Run lifecycle
- Model 0/1/2개와 purpose 정책
- 자동 Model fallback/switching 금지
- Knowledge candidate/promote 분리
- 승인 전 side effect 차단
- execution root 기본 scope
- 단일 workspace writer
- unknown effect 자동 재실행 금지
- MindCraft runtime과 참고 개발 방법론 분리

현재 구현과의 주요 갭은 다음과 같다.

- Windows launcher 및 동봉 runtime 없음
- 기본 실행이 아직 readline CLI이며 기본 TUI 진입 미완료
- workspace/user-data/bootstrap 분리 미완료
- Credential Manager 연동 없음
- Windows path/process tree/IME 검증 없음
- installer/update/remove/signing pipeline 없음
- clean Windows/live 검증 없음

## 3. 승인 요청 범위

다음 설계와 후속 구현 조사 계획을 승인해 주십시오.

1. 1차 배포를 사용자 단위 installer + 설치된 `MindCraft.exe` launcher로 진행
2. 동봉 Node runtime과 기존 ESM/Pi 모듈 구조를 우선 유지하고, bundling/portable은 후속 spike로 분리
3. 기본 실행은 TUI, `--cli`는 호환 모드로 제공
4. `--workspace`·최근 workspace·사용자 선택 순으로 workspace를 확정하고 설치 폴더를 암묵적 workspace로 사용하지 않음
5. EffectiveConfigResolver를 preflight·doctor·provider·Run의 단일 설정 경로로 설계
6. Windows 보호 저장 또는 session-only만 credential 저장 대안으로 허용하고 평문 fallback 금지
7. Windows path/reparse/process-tree/shutdown/lock을 별도 adapter로 설계
8. mock/live, Linux/Windows, source/artifact/live 결과를 분리한 evidence 체계로 검증

## 4. 승인에 포함되지 않는 범위

- 실제 Windows 실행·설치·clean VM 검증
- 실제 launcher/installer/native helper 구현
- 실제 Credential Manager 저장
- 실제 유료 provider 호출
- signing 완료 또는 공개 배포
- 첨부 문서의 patch/reference 자동 적용
- portable 단일 `.exe`를 1차 필수 조건으로 확정
- 동시 workspace writer
- 자동 provider fallback/switching

## 5. 다음 기본 작업 워크플로우

승인 후에도 즉시 전체 구현하지 않고 다음 순서로 진행한다.

```text
설계 승인
→ launcher/runtime 기술 조사 및 spike 설계
→ workspace/bootstrap/config 계약 확정
→ credential/provider/TUI/approval 상세 설계
→ 구현 단위별 작업 등록
→ 구현 승인
→ 실제 Windows 실행·검증
→ 결과 리뷰 및 릴리스 승인요청
```

## 6. 승인 선택지

### Approve & Continue

현재 조사·상세 설계를 기준으로 구현 단위와 실제 기술 spike 계획을 등록한다. 실제 Windows 실행은 별도 구현 승인 이후에만 수행한다.

### Request Changes

배포 형태, 기본 TUI/CLI 정책, 지원 Windows 범위, credential 저장 방식, portable 목표, live provider 필수 여부 등을 지정한다.

### Hold

설계 승인 전 현재 상태에서 보류한다.

## 7. 권고

**권고: Approve & Continue**

조건:

1. 이 문서는 구현 완료나 Windows 지원 완료를 의미하지 않는다.
2. 실제 실행 전에는 launcher·credential·process-tree·path 정책의 기술 선택을 별도 기록한다.
3. 구현 단계 진입 시 변경 파일·테스트·rollback·검증 증거를 작업별로 남긴다.
4. Windows native/live 검증은 실제 환경에서 수행한 뒤에만 완료로 판정한다.

## 8. 승인 기록

- 결정: **Approve & Continue**
- 승인 범위: 조사·상세 설계를 기준으로 기본 작업 워크플로우의 후속 작업 단위 등록 및 구현 준비
- 미승인 범위: 실제 Windows 실행·설치·clean VM 검증·live 호출·credential 저장·외부 push·배포
- 승인 근거: Discord 작업 지시 `진행해`
- 후속 작업: JOB-69~JOB-73
