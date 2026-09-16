# MindCraft Windows 실행 파일·신규 사용자 경험 설계 검토 및 승인요청

- 작업: **JOB-68 — MindCraft Windows 실행 파일·신규 사용자 경험 설계 검토 및 승인요청**
- 작업 방식: **DDT 기본 작업 워크플로우**
- 참고 자료: 첨부 `windows-executable-comprehensive-design.md`
- 참고 범위: 기존 MindCraft SSOT, 제품 설계 문서, 필요 시 AI-DLC 관련 자료
- 상태: **설계 검토 완료 — 다음 단계 진행 승인됨**
- 구현 상태: **미적용**

## 1. 워크플로우 정정

이 작업은 AI-DLC 프로젝트가 아니다. MindCraft의 Windows 배포 기능을 검토·구현하는 일반 작업이며, DDT 기본 작업 워크플로우를 따른다.

AI-DLC는 필요한 경우 관련 프로젝트의 요구사항·설계·검증 관행을 참고하는 자료일 뿐, MindCraft 작업의 기본 상태·승인·작업 단위를 대체하지 않는다.

```text
작업 등록
→ 현재 상태·요구사항 확인
→ 설계 검토
→ 다음 작업 승인
→ 구현
→ 테스트·검증
→ 결과 검토
→ 릴리스 판단
```

## 2. 검토 결과

현재 저장소 기준선:

- `npm run build` — PASS
- `npm test` — 130/130 PASS
- `npm run release:check` — PASS

설계와 정합한 방향:

- Task/Episode/Run 유지
- 승인 전 side effect 차단
- Knowledge candidate/promote 분리
- 자동 Model fallback/switching 금지
- mock/live와 local/live readiness 분리
- 순차 session·단일 writer·복구 시 자동 재실행 금지
- 설치 위치와 작업 폴더 분리

현재 구현되지 않은 주요 영역:

- Windows launcher 및 동봉 runtime
- 사용자 단위 installer/update/remove
- onboarding wizard와 기본 TUI 진입
- Windows Credential Manager 연동
- Windows 경로·process tree·IME 검증
- clean Windows 환경 설치·실행 검증
- signing 및 실제 live provider 검증

Linux 기준선 결과는 Windows 완료 또는 live provider 완료 증거로 사용하지 않는다.

## 3. 승인된 다음 작업

다음 작업 단위를 기본 작업 워크플로우에 등록해 진행한다.

1. Windows 실행 환경 기준선 확인
2. 동봉 runtime과 launcher feasibility 확인
3. workspace/bootstrap과 기본 TUI 설계·구현
4. 설정·provider·credential 경계 설계·구현
5. 승인·경로·취소·복구 동작 연결
6. installer/update/remove와 release metadata 구성
7. Windows 환경 검증 및 결과 보고

각 작업은 별도 상태와 검증 결과를 남기며, 구현 전 범위가 커지면 다시 승인받는다.

## 4. 이번 승인에 포함되지 않는 범위

- 첨부 문서의 patch/reference 코드 자동 적용
- AI-DLC 절차를 기본 작업 상태로 사용
- 실제 유료 provider 호출 또는 credential 변경
- 외부 push·공개 배포
- Windows 지원 완료 또는 signing 완료 판정
- 단일 portable `.exe`를 필수 조건으로 확정

## 5. 현재 판정

**JOB-68은 기본 작업 워크플로우의 설계 검토 완료 상태로 진행한다.**

AI-DLC 관련 문서는 참고 자료로만 유지하고, MindCraft 제품 작업 상태·승인·검증 기록과 섞지 않는다.
