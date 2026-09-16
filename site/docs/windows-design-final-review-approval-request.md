# MindCraft Windows 설계 통합 리뷰 및 구현 승인요청

- 작업: **JOB-68**
- 작업 방식: **DDT 기본 작업 워크플로우**
- 조사·설계·리뷰 상태: **완료**
- 구현 상태: **미적용**
- 실제 Windows 실행/설치/live 호출: **미수행**

## 1. 검토 대상

- `docs/windows-executable-investigation-and-design.md`
- `docs/windows-launcher-runtime-spike-plan.md`
- `docs/windows-workspace-bootstrap-config-contract.md`
- `docs/windows-credential-provider-onboarding-contract.md`
- `docs/windows-tui-approval-shutdown-contract.md`
- `docs/windows-installer-release-evidence-plan.md`
- `docs/windows-executable-design-review.md`

## 2. 통합 리뷰 결과

| 영역 | 판정 | 비고 |
|---|---|---|
| 기본 작업 워크플로우 정합 | PASS | AI-DLC를 기본 작업 상태로 사용하지 않음 |
| 현재 코드·문서 추적성 | PASS | CLI/App/TUI/provider/config/path/lock 근거 반영 |
| 사용자 흐름 | PASS | 설치부터 workspace·설정·Run·승인·복구 흐름 정의 |
| 안전성 | PASS | approval, scope, credential redaction, unknown effect 유지 |
| 모델 정책 | PASS | 0/1/2 Model, purpose, fallback 금지 유지 |
| mock/live 분리 | PASS | mode snapshot과 readiness 분리 |
| 종료·복구 | PASS | coordinator, process tree, journal, lock 순서 정의 |
| 패키징 | CONDITIONAL | 실제 Windows launcher/installer/resource 검증 필요 |
| credential | CONDITIONAL | Credential Manager helper/binding의 실제 적합성 검증 필요 |
| 경로/process | CONDITIONAL | Windows API와 reparse/process tree 실제 검증 필요 |
| 릴리스 판정 | PASS | native/live 증거 없이는 완료 주장 금지 |

## 3. 구현 순서

```text
구현 단위 승인
→ WIN-01 launcher/runtime spike 구현
→ WIN-02 workspace/bootstrap/config 구현
→ WIN-03 credential/provider/onboarding 구현
→ WIN-04 TUI/approval/shutdown/recovery 구현
→ WIN-05 installer/update/release metadata 구현
→ 실제 Windows 검증
→ 결과 리뷰
→ 릴리스 승인요청
```

각 구현 단위는 기본 작업 워크플로우에서 별도 작업·변경 파일·테스트·rollback·증거를 남긴다.

## 4. 구현 승인 요청 범위

다음을 승인해 주십시오.

1. 조사·설계 문서의 계약을 기준으로 Windows 구현 단위를 시작
2. WIN-01은 launcher/runtime 기술 spike로 한정하고, 결과가 실패하면 기술 선택을 재검토
3. WIN-02~05는 기존 MindCraft runtime과 approval/Knowledge/routing/recovery 정책을 유지하며 구현
4. mock/offline 검증과 Windows native/live 검증을 분리
5. 실제 실행 결과가 없는 항목은 완료로 표시하지 않음
6. 구현 중 범위 변경은 기본 작업 워크플로우의 별도 승인으로 처리

## 5. 이번 승인에 포함되지 않는 범위

- 공개 배포·외부 push
- 실제 유료 provider 호출
- 사용자 credential 변경
- Windows clean VM 완료 판정
- signing 완료 판정
- portable 단일 `.exe` 1차 필수 확정
- 자동 provider fallback/switching
- 동시 workspace writer

## 6. 승인 선택지

### Approve & Continue

WIN-01 launcher/runtime spike 구현과 이후 구현 단위 작업을 시작한다. 실제 Windows 실행·설치·live 검증은 각 검증 승인과 환경 확보 후 수행한다.

### Request Changes

구현 범위, 배포 형태, 지원 OS/architecture, credential 정책, portable 여부, live 검증 조건을 수정한다.

### Hold

현재 설계 승인 게이트에서 보류한다.

## 7. 권고

**권고: Approve & Continue**

현재 설계는 조사와 자체 리뷰를 통과했지만, Windows native 기술 위험은 실제 spike 전까지 미확정이다. 따라서 전체 제품 출시 승인이 아니라 **구현 단위 시작 승인**으로 한정해야 한다.
