# MindCraft AI-DLC 실행 키트 전체 검토 및 승인요청

- 검토 대상: `MINDCRAFT-AI-DLC--.zip`
- 수신 파일: `/opt/data/cache/documents/doc_a3cf23e0bfe6_MINDCRAFT-AI-DLC--.zip`
- 검토 압축 해제 위치: `/tmp/mindcraft-ai-dlc-review`
- 현재 제품 저장소: `/opt/data/workspace/mindcraft`
- 검토 상태: **완료 — 승인 대기**
- 코드 적용 상태: **미적용**

> 이 문서는 첨부 키트의 검토 결과와 다음 단계 승인을 요청하기 위한 문서다. 승인 전에는 새 프로젝트 생성, 첨부 patch 적용, reference 코드 이식, 실제 provider 호출, 외부 push/배포를 수행하지 않는다.

---

## 1. 검토 범위와 절차

첨부 ZIP의 전체 75개 항목을 확인했다.

| 영역 | 확인 내용 |
|---|---|
| 실행 키트 설명 | `README.md` 전체 검토 |
| AI-DLC 프롬프트 | 설치/Inception, Design/Construction, Gate/Resume, Build/Test/Demo 전체 검토 |
| 입력 요구사항 | requirements, constraints, reference decisions 전체 검토 |
| 참조 제품 | README, DESIGN, ROUTING, package, src, test, fixture 전체 포함 여부와 syntax 확인 |
| 패치 | `demo-readiness.patch` 검토 |
| evidence | JSON manifest·baseline/fixed test log·offline rehearsal 결과 검토 및 JSON parse |
| artifact | `mindcraft-0.1.0.tgz` 내부 항목·SHA-1·경로 확인 |
| 독립 실행 | 참조 코드에 `npm ci --ignore-scripts`, `npm run build`, `npm test`, offline rehearsal 실행 |
| 현재 저장소 대조 | 참조 코드 58개 파일과 현재 저장소 비교 |

### 독립 실행 결과

첨부 키트의 `reference/mindcraft`에서 실제로 다음을 실행했다.

```text
npm ci --ignore-scripts --no-audit --no-fund   PASS
npm run build                                  PASS
npm test                                       PASS — 120/120
node scripts/offline-rehearsal.mjs reference/mindcraft PASS
```

offline rehearsal은 실제 CLI·filesystem·fixture test command와 mock runtime을 사용한다. 실제 Pi provider, 유료 API, Windows native UX의 증거는 아니다.

---

## 2. 첨부 키트 구성 판정

첨부 키트는 다음을 포함한다.

- `starter/`: 새 AI-DLC 프로젝트에 투입할 requirements/constraints/reference decisions
- `reference/mindcraft/`: 기존 MindCraft를 기반으로 한 참조 코드
- `prompts/`: 단계별 AI-DLC 실행 프롬프트
- `patches/demo-readiness.patch`: release rehearsal과 control command 반응성 관련 최소 수정
- `scripts/offline-rehearsal.mjs`: 승인·거부·cancel·restart·SIGKILL/resume offline 검증
- `evidence/`: baseline/fixed 테스트 결과, package manifest, rehearsal 결과
- `artifacts/mindcraft-0.1.0.tgz`: 설치 검증 대상 package artifact

키트 README가 명확히 밝히는 범위는 다음과 같다.

- 새 프로젝트와 한 개의 AI-DLC construction unit을 사용
- 기존 코드는 참조 범위와 행사 규칙에 따라 재사용 여부를 별도 확정
- 세 내부 체크포인트 A/B/C는 독립 AI-DLC unit이 아님
- mock/live, 제품 Pi/provider와 개발 도구 Bedrock을 구분
- 이전 state/audit를 새 개발 기록으로 이식하지 않음
- 미실행 검증을 PASS로 기록하지 않음

이 구조는 현재 MindCraft의 제품 runtime과 AI-DLC 외부 개발 방법론을 분리한다는 현재 SSOT와 정합하다.

---

## 3. 확인된 강점

### 3.1 요구사항과 실행 증거가 연결됨

starter requirements가 다음 필수 시나리오를 구체적으로 제시한다.

- Model 미설정 → setup → Task/Run
- Task 선택·Run 상태·재시작 후 이력
- 승인 전 filesystem write/command 차단
- pending 승인 중 목록 조회·거부·cancel
- interruption → recoverable → 새 Run resume
- Knowledge candidate → promote → 다음 Run manifest
- 0/1/2 Model 정책과 자동 fallback 금지
- 실제 tgz 설치 후 offline flow

### 3.2 안전성 경계가 과장되지 않음

키트는 일반 shell이나 동일 OS 사용자 권한을 sandbox라고 주장하지 않는다. 또한 mock을 실제 모델 능력, 실제 provider, Windows native 증거로 사용하지 않는다. 이 점은 현재 MindCraft의 fail-closed·approval 원칙과 일치한다.

### 3.3 독립 재실행 가능성

참조 코드에서 독립적으로 120개 테스트와 offline rehearsal이 통과했다. 승인·path·persistence·Knowledge·routing·CLI/TUI·release fixture 시나리오가 포함된다.

### 3.4 최소 수정 범위가 명시됨

키트가 제시한 최소 수정은 다음 성격이다.

- active Run 중 `approvals`/`status` 응답성 개선
- TUI `quit`/exit 연결
- fixture가 실제 `node --test`를 안내하도록 수정
- TAP reporter를 명시해 release rehearsal assertion을 안정화

---

## 4. 현재 저장소와 첨부 참조 코드의 차이

참조 코드 58개 파일을 현재 저장소와 byte-level 비교한 결과:

- 동일: 50개
- 상이: 8개
- 누락: 0개

상이한 파일:

1. `README.md`
2. `examples/release-demo/README.md`
3. `src/cli.mjs`
4. `src/command-queue.mjs`
5. `src/demo-fixture.mjs`
6. `src/mindcraft-app.mjs`
7. `src/tui-runner.mjs`
8. `test/phase-06-release-rehearsal.test.mjs`

### 차이의 의미

- 첨부 참조본은 제품 Model 환경변수/provider selection 관련 기존 내용을 제거하고, 사용자 지정 Model registry 정책을 기준으로 한다.
- 참조본은 active Run 중 `approvals`/`status`를 queue 밖에서 처리하도록 하는 release-readiness 수정을 포함한다.
- 참조본은 `model` 조회 명령과 `model-config.mjs` 기반 provider selection 경로를 현재 기준에서 제외한다.
- 참조본은 fixture의 `npm test` 안내를 실제 package 없는 fixture에서도 실행 가능한 `node --test`로 바꾼다.
- 참조본의 `MindCraftApp`은 현재 저장소의 일부 Model selection/provider adapter 경로와 다르다.
- 현재 저장소에 첨부 patch를 그대로 적용하면 현재 제품 SSOT와 테스트·Model 정책을 다시 대조해야 한다.

**판정:** 첨부 참조본은 현재 저장소와 동일한 최신 checkout이 아니다. 따라서 ZIP을 그대로 source of truth 또는 자동 patch 입력으로 취급하지 않는다.

---

## 5. 검토 중 발견된 주의사항과 미결정 사항

### A. 승인 전 반드시 결정할 항목

#### A-1. Resume의 Episode 계약

첨부 키트와 참조 구현은 `resumeRun` 시 새 Episode와 새 Run을 만든다. 현재 MindCraft 설계 문서 일부는 같은 Episode에 새 Run을 연결하는 방향을 제시한다.

- 첨부 키트의 현재 구현 증거: 새 Episode 생성
- 설계상 대안: 같은 Episode + 새 Run + `resumedFrom`
- 승인 필요: 이번 AI-DLC 재개발에서 어느 계약을 채택할지

권고: acceptance criteria가 변경되지 않은 resume은 같은 Episode의 새 Run으로 연결하는 계약을 채택하고, 기존 첨부 참조 동작을 바꾸는 경우 별도 회귀 테스트를 추가한다.

#### A-2. Provider preflight

첨부 evidence는 credential이 없는 상태에서 최상위 `ok: true`가 남고 provider 내부 status에 `credential missing`이 들어가는 동작을 재현했으며, 이를 미수정으로 기록한다.

- `doctor=ok`를 live provider 접속 성공으로 해석하지 않음
- live 실행 전 provider availability/credential 상태를 별도 gate로 확인
- 수정 여부는 인증 회귀 테스트와 함께 별도 승인

권고: 실제 provider 실행을 허용하기 전 top-level readiness 판정과 provider별 실패 상태를 분리·명확화한다.

#### A-3. setup과 runtime provider 전환

mock setup 후 같은 프로세스에서 다른 provider로 전환하는 factory 경로가 완전하지 않다고 기록되어 있다.

권고: mock/live를 별도 process/workspace로 운영하고, same-process provider switching은 이번 범위에서 승인하지 않는다.

#### A-4. Workspace context

현재 reference 구현은 전달된 `fileContents` 처리는 가능하지만 일반 run 호출에서 workspace 파일 자동 수집을 의미하지 않는다.

권고: 이번 범위에서는 명시적 tool read와 Knowledge reuse만 제품 증거로 사용하고, 자동 workspace ingestion은 별도 요구사항으로 분리한다.

### B. 현재 상태를 제한적으로 문서화해야 할 항목

- Knowledge는 workflow journal과 달리 plain JSONL이며 동일 checksum/recovery 보장을 주장하지 않음
- single-writer는 프로세스 내부 직렬화이며 프로세스 간 lock을 제공하지 않음
- session 정상 종료는 acceptance criteria 충족과 동일하지 않음
- 기본 제품 command allowlist는 임의 shell/코드 수정 demo가 아님
- full TUI(`MINDCRAFT_TUI=1`)와 기본 readline CLI를 구분
- native Windows/WSL, live Pi provider는 미실행

---

## 6. Evidence 무결성 판정

첨부 evidence의 내용과 artifact는 다음과 같이 확인했다.

- ZIP은 정상 해제 및 `zip_test: PASS`
- evidence JSON 4개는 parse 성공
- 참조 source/test/script 51개는 `node --check` 성공
- artifact `mindcraft-0.1.0.tgz` SHA-1은 manifest의 `6be0528ece05ffa685dc88fcd7c5fb2e3d1060e1`과 일치
- artifact는 22개 package entry를 포함
- artifact 내부에 `.git`, credential, secret, `.mindcraft` 경로는 없음
- `token-doctor.mjs`의 문자열은 기능 파일명이며 secret 파일이 아님

단, evidence `baseline-identity.json`에 기록된 `input_zip_sha256`과 현재 전달된 ZIP의 SHA-256은 일치하지 않았다.

```text
현재 전달 파일 SHA-256:
bb63d39bc8a63e07b5a43f08d66399ea1f951d188d3987ae0b3b3638071f6659

evidence 기록 SHA-256:
54ad554d2999138ceef10124ea6c2b236f29c5b6926712c87db44884200e531b
```

따라서 evidence의 ZIP identity는 **독립적으로 확정할 수 없음**으로 판정한다. 다만 현재 전달 ZIP 자체의 압축 무결성, 내부 파일, artifact hash, 독립 실행 결과는 별도로 확인되었다.

---

## 7. AI-DLC 프로세스 진행 판정

현재는 다음 단계까지 진행한 것으로 판정한다.

```text
첨부 수신
→ ZIP 무결성·전체 inventory
→ 요구사항·제약·참조 결정 검토
→ 참조 코드·패치·evidence 검토
→ 현재 저장소와 차이 분석
→ 독립 build/test/offline rehearsal
→ 승인요청 작성
→ [현재] 사람 승인 대기
```

승인 전에는 다음 단계로 넘어가지 않는다.

```text
승인
→ 새 project root/workspace 결정
→ AI-DLC v1.0.1 실제 규칙·tag·commit 확인
→ starter만 새 project에 배치
→ Inception 질문·requirements·user stories·acceptance 확정
→ application design·NFR·unit plan·code generation plan 승인
→ Construction 구현
```

첨부 ZIP의 `reference/`, 기존 제품 `.mindcraft/state.jsonl`, 과거 세션/audit를 새 AI-DLC state로 복사하지 않는다.

---

## 8. 이번 승인 요청 범위

다음 네 가지를 승인해 주십시오.

1. 첨부 키트를 **AI-DLC 재개발 준비 입력 및 reference/evidence 자료**로 채택
2. 새 개발은 **단일 Node package + 단일 construction unit + 내부 A/B/C 체크포인트**로 진행
3. 제품 runtime과 AI-DLC 개발 산출물/state/audit를 분리
4. 위 A-1~A-4 계약 차이를 Inception에서 확정한 뒤에만 코드 생성·이식 진행

승인에 포함하지 않는 사항:

- 첨부 patch의 현재 제품 저장소 적용
- reference 코드의 자동 복사·이식
- GitHub push 또는 배포
- credential 변경·실제 유료 provider 호출
- Windows/native 환경 검증 완료 판정
- AI-DLC가 MindCraft runtime 기능이라는 해석

---

## 9. 승인 선택지

### Approve & Continue

첨부 키트를 입력 자료로 채택하고, 위 미결정 계약을 Inception 질문으로 확정한 뒤 다음 산출물을 작성한다.

- 실제 AI-DLC 규칙 provenance
- requirements/user stories/acceptance
- application design
- NFR requirements/design
- 단일 unit plan
- code generation plan
- 검증·release plan

### Request Changes

다음 중 수정할 항목을 지정한다.

- resume Episode 계약
- provider preflight 정책
- setup/provider switching 범위
- workspace context 자동 수집 범위
- Knowledge persistence/recovery 계약
- reference 코드 재사용 허용 범위
- live provider/native Windows의 필수 여부

### Hold

행사 규칙, 재사용 허용 범위, live/native 검증 필요성이 확정될 때까지 새 개발을 보류한다.

---

## 10. 권고 결론

**권고: Approve & Continue를 조건부로 승인**한다.

조건:

1. 첨부 ZIP은 최신 제품 source가 아니라 검토된 reference kit으로 취급
2. ZIP identity hash 불일치를 evidence에 기록하고 독립 provenance로 보완
3. resume, provider preflight, setup switching, workspace context의 네 계약을 Inception에서 명시적으로 결정
4. AI-DLC 실제 규칙의 tag/commit과 승인 기록을 새 workspace에 남김
5. 승인 전에는 patch 적용·코드 이식·외부 환경 변경을 하지 않음
6. mock/offline 결과와 live provider/Windows native 결과를 발표·문서에서 분리

현재 승인요청 문서 자체의 상태는 **검토 완료 / 사람 승인 대기**다.

---

## 11. 추가 결정 반영 — 멀티 세션·Doctor·Mock·파일 접근

사용자 결정으로 다음 방향을 추가 등록한다.

### 11.1 멀티 세션

여러 번 실행해 이전 상태를 이어가는 **순차 멀티 세션**을 고려한다.

```text
Session 1 → 저장 → 종료
Session 2 → 복원 → 다음 Run
Session 3 → 복원 → 다음 Run
```

이번 범위에서 지원할 기준:

- session마다 별도 identity와 시작/종료 기록
- Task/Episode/Run/Knowledge는 workspace journal에서 복원
- 동일 workspace는 active Run 하나
- 같은 workspace의 동시 writer/병렬 session은 lock 설계 전까지 차단
- 서로 다른 workspace는 상태를 공유하지 않음
- 늦은 event는 종료된 session/Run을 변경하지 않음

순차 멀티 세션은 승인 대상이며, 병렬 멀티 세션까지 승인하는 것은 아니다.

### 11.2 Doctor

사용자 결정: 권장안을 채택한다.

`doctor`는 하나의 단순한 성공/실패가 아니라 다음을 분리해 표시한다.

- local runtime/storage 상태
- Model registry 상태
- mock/offline 실행 가능 여부
- 실제 provider readiness
- 실행을 막는 조치와 다음 행동

provider가 준비되지 않은 경우에도 local 상태와 mock rehearsal은 진단할 수 있지만, live Run은 fail-closed한다. `doctor=ok`를 실제 provider 호출 성공으로 해석하지 않는다.

### 11.3 Mock과 live provider

사용자 결정: 권장안을 채택한다.

- mock과 live는 기본적으로 별도 process/workspace
- 실행 중 provider 자동 전환 금지
- mock 재시작 시 명시적인 mock mode 요구
- Run마다 provider/model/mode snapshot 저장
- credential 원문은 config/history/log에 저장하지 않음

이를 통해 테스트 환경과 실제 비용·외부 전송 환경이 섞이는 것을 방지한다.

### 11.4 파일 접근

사용자 결정: 실행된 folder 하위만 기본 제공한다.

- execution root 하위 파일만 기본 scope
- root 밖 경로는 기본 거부
- 필요한 root 밖 접근은 구체적 대상·범위·위험을 표시한 승인 필요
- `..`, absolute path, symlink/junction/reparse escape는 fail-closed
- `.mindcraft` control files와 credential/secret 의심 파일은 일반 agent 대상에서 제외
- 사용·제외 파일과 사유를 context manifest에 기록

### 11.5 추가 작업 등록

| ID | 작업 | 우선순위 | 상태 |
|---|---|---:|---|
| `MC-SESSION-01` | 순차 멀티 세션·재실행 연속성 | P0 | proposed |
| `MC-DIAG-01` | Doctor 상태 분리 | P0 | proposed |
| `MC-MODE-01` | Mock/Live process 경계 | P0 | proposed |
| `MC-SCOPE-01` | Execution root 하위 파일 접근 | P0 | proposed |

진행 순서는 다음과 같다.

```text
MC-SESSION-01 설계
→ MC-DIAG-01 Doctor 계약
→ MC-MODE-01 Mock/Live 경계
→ MC-SCOPE-01 execution-root scope
→ 통합 acceptance 및 release rehearsal
```

상세 acceptance와 verification 명령은 저장소 `TODO.md`에 등록했다. 네 작업은 JOB-62~65로 정식 등록되었고 구현·검증까지 완료되었다. 동시 병렬 session은 별도 승인 범위로 남긴다.

---

## 12. 갱신된 승인 요청

다음 범위를 승인해 주십시오.

1. 순차 멀티 세션과 session identity/history 설계
2. local/mock/live readiness를 분리하는 Doctor 계약
3. mock/live provider의 process/workspace 분리
4. execution root 하위 파일 접근 기본 scope
5. 위 네 작업을 `MC-SESSION-01 → MC-DIAG-01 → MC-MODE-01 → MC-SCOPE-01` 순서로 AI-DLC 작업화

승인하지 않는 범위:

- 동시 병렬 session 또는 다중 writer
- 자동 provider fallback/switching
- execution root 밖 무승인 파일 접근
- 첨부 patch의 현재 저장소 자동 적용
- live provider·Windows native 검증을 완료로 간주

### 선택

- **Approve & Continue** — 위 네 작업의 Inception/설계 단계 진행
- **Request Changes** — 특정 작업의 범위·계약·우선순위 수정
- **Hold** — 추가 결정 전 보류

권고는 **Approve & Continue**이며, 구현 결과는 다음과 같다.

## 13. 구현 완료 기록 — JOB-62~65

- 순차 session identity/start/close와 Run의 `sessionId`/`mode` snapshot을 구현했다.
- 동일 workspace process-level writer lock과 stale lock 복구를 구현했다.
- Doctor에서 `localReady`와 `liveReady`/`providerReadiness`를 분리했다.
- provider가 준비되지 않은 live Run은 fail-closed하고, mock/live mode는 첫 Run 이후 자동 전환하지 않는다.
- execution-root 기반 path/security 및 기존 approval gate를 유지·검증했다.
- 검증: `npm run build`, `npm test` — 130/130 통과.
- 작업 메타데이터: `/opt/data/workspace/JOB-QUEUE.md`, `JOB-INDEX.md`, JOB-62~65 request/verification 갱신 완료.
