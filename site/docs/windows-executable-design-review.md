# MindCraft Windows 실행 파일 설계 자체 리뷰

- 작업: **JOB-68**
- 리뷰 대상: `docs/windows-executable-investigation-and-design.md`
- 리뷰 방식: 문서 내부 일관성·현재 코드 대조·기존 정책 대조
- 실제 실행: **수행하지 않음**
- 리뷰 상태: **완료**

## 1. 리뷰 체크리스트

| 항목 | 결과 | 리뷰 의견 |
|---|---|---|
| 기본 작업 워크플로우와 정합 | PASS | AI-DLC를 기본 상태·승인 체계로 사용하지 않음 |
| 현재 코드와의 추적성 | PASS | cli, app, pi-tools, preflight, config, TUI, lock 근거를 반영 |
| 설치 위치/workspace 분리 | PASS | 확정 전 생성 금지와 user-data 분리 명시 |
| Model/routing 정책 보존 | PASS | 0/1/2 Model, purpose, fallback 금지 유지 |
| approval 경계 보존 | PASS | request digest, decision, execution_started, unknown 순서 유지 |
| credential privacy | PASS | argv/log/config/transcript 원문 금지, 평문 fallback 금지 |
| path safety | PASS | canonical containment와 reparse/ADS/UNC 미지원 시 fail-closed |
| recovery safety | PASS | unknown effect 자동 재실행 금지, 새 Run 연결 |
| mock/live 구분 | PASS | mode snapshot과 readiness 분리 |
| 기존 CLI 호환 | PASS | 기본 TUI, `--cli`, 구조화 workspace 인자 계획 |
| Windows 증거 과장 방지 | PASS | 실제 실행 전 완료 주장 금지 |
| 구현 가능성 | CONDITIONAL | launcher/credential/process-tree는 spike 결과로 기술 선택 필요 |

## 2. 발견된 설계 위험과 대응

### R1. 현재 CLI의 환경변수와 workspace registry 이중 경로

- 위험: preflight와 실제 runtime이 서로 다른 model/provider를 볼 수 있다.
- 대응: `EffectiveConfigResolver` 결과를 preflight·doctor·provider·Run에 주입하고 Run snapshot을 저장한다.
- 차단 기준: resolver 없이 기존 독립 env selection을 새 UI에서 재사용하지 않는다.

### R2. Windows credential helper 배포 실패

- 위험: native binding/helper가 설치·백신·ACL 문제로 실패할 수 있다.
- 대응: WIN-01 이전에 helper 방식의 package/resource/ACL spike를 수행한다.
- 금지: 평문 JSON·일반 log fallback.
- 허용 대안: session-only credential.

### R3. console ownership과 terminal restore

- 위험: Explorer 실행과 terminal 실행에서 창이 즉시 닫히거나 입력이 꼬일 수 있다.
- 대응: launcher가 console attach/create를 소유하고 TUI는 terminal lifecycle을 한 번만 소유한다.
- 검증 대상: Explorer, 시작 메뉴, Windows Terminal, Console Host, EOF, Ctrl-C, 창 닫기.

### R4. process tree 취소

- 위험: child 하나만 종료되고 손자 process가 남을 수 있다.
- 대응: Windows Job Object 또는 동등한 process-tree adapter를 선택하고 fixture로 손자 종료를 검증한다.
- 차단 기준: 단일 `child.kill`만으로 완료 처리하지 않는다.

### R5. path identity와 reparse point

- 위험: 문자열 prefix가 형제 폴더·junction escape를 허용할 수 있다.
- 대응: canonical identity, parent validation, 실행 직전 재검사, 불명확한 reparse/UNC/ADS fail-closed.
- 차단 기준: Windows path matrix 없이 native 지원을 주장하지 않는다.

### R6. schema/config migration

- 위험: 업데이트가 기존 workspace를 손상시키거나 상위 schema를 덮어쓸 수 있다.
- 대응: backup → temp write → replace, 상위 schema read-only 오류, rollback metadata.

### R7. 현재 TUI transcript 저장 방식

- 위험: `render(120)` 결과를 다시 transcript로 저장하면 resize에서 줄바꿈이 누적된다.
- 대응: 원본 message/event 모델과 width-aware renderer를 분리하고 보관 상한을 별도 적용한다.

### R8. mock 결과의 과장

- 위험: offline/mock 성공을 Windows native/live provider 성공으로 오해할 수 있다.
- 대응: evidence에 OS, terminal, mode, provider, artifact hash를 필수로 기록하고 결과 종류를 분리한다.

## 3. 승인 전 설계 결정

다음은 구현 전에 승인받아야 한다.

1. 1차 배포는 installer + installed launcher로 하고 portable 단일 exe는 후속으로 둔다.
2. 기본 실행은 TUI, `--cli`는 호환 모드로 둔다.
3. workspace는 `--workspace` → 최근 workspace → 사용자 선택 순이며 현재 cwd는 후보일 뿐 자동 확정하지 않는다.
4. credential 보호 저장 실패 시 session-only만 허용한다.
5. mock/live 자동 전환과 Model fallback은 금지한다.
6. root 밖 접근, reparse escape, unknown effect는 fail-closed 또는 사용자 확인이다.
7. Windows native/live/clean VM 결과는 Linux/mock 결과와 분리한다.

## 4. 리뷰 결론

**설계는 현재 MindCraft 정책과 구현 경계에 부합하며, 구현 전 설계 승인요청을 제출할 수 있다.**

단, 다음은 실제 실행이 아니라 설계상 기술 선택을 위해 별도 spike가 필요한 항목이다.

- launcher 기술과 console 동작
- 동봉 Node/ESM/Pi resource loading
- Credential Manager helper/binding
- Windows process tree cancellation
- canonical path/reparse handling
- installer/update/signing pipeline

이 리뷰는 해당 항목들이 성공했다고 의미하지 않는다.
