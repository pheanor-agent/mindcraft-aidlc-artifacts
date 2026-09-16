# Phase 6 — Windows Terminal + WSL 검증·릴리스

## 목표

실제 데모 환경에서 설치부터 종료까지 반복 가능하도록 검증하고 릴리스 자료를 고정한다.

## 검증 환경

```text
Windows
└─ Windows Terminal
   └─ WSL Ubuntu
      └─ Node.js >=22.19.0
         └─ MindCraft
```

## 작업

1. clean checkout에서 설치한다.
2. `install.sh` 또는 npm 설치 경로를 검증한다.
3. Windows Terminal에서 TUI를 실행한다.
4. 한글 입력, 색상, 줄바꿈, resize를 확인한다.
5. Ctrl-C, cancel, quit을 확인한다.
6. 긴 event/result 출력이 화면을 깨뜨리지 않는지 확인한다.
7. WSL/Linux 경로와 Windows 경로 경계 동작을 확인한다.
8. demo fixture와 demo 명령을 사용해 3회 이상 반복 리허설한다.
9. README에 실제 실행 절차와 known limitation을 반영한다.
10. release artifact와 버전을 확인한다.

## 완료 조건

다음 명령이 통과한다.

```sh
npm run build
npm test
npm run release:check
npm audit --audit-level=high
```

Windows Terminal에서 다음 전체 흐름이 성공한다.

```text
doctor
→ task
→ run
→ approval
→ result
→ knowledge
→ promote
→ second run
→ status
→ quit
```

## Phase 6 수행 기록

### 기준선과 변경

- 시작 branch: `master`
- 시작 HEAD/tested baseline: `559da013b77011c24ffb240fd26d1daea0262c65`
- 시작 working tree: clean; staged/unstaged 변경 없음
- baseline 충족: fixture validator, approval lifecycle, Knowledge promote/reuse,
  status/history/resume/cancel safety, build/test/release/audit script가 존재하고
  baseline에서 확인됨
- 이번 보완: `src/mock-provider.mjs`에 명시적 deterministic mock runtime/session을
  추가하고, CLI의 `MINDCRAFT_MODE=mock`, mock Model/provider 표시 경로와 고정된
  `node --test test/release-check.test.mjs` command allowlist를 연결함. release-check command는 `examples/release-demo` 실행 복사본의
 `test/release-check.test.mjs`를 대상으로 하며 저장소 루트에서 실행하는
 경로가 아니다. 기존 adapter/approval boundary를 우회하지 않음.

### 1차 후속 보완

- release fixture의 고정 command 경로를 검증하는 `test/phase-06-release-rehearsal.test.mjs`를 추가했다. 새 임시 fixture 복사본에서 실제 `node --test test/release-check.test.mjs`를 실행하고 validator로 fixture 무결성을 재확인한다.
- 승인 audit 저장 실패 시 side effect 차단 보완은 Phase 3 후속 기록과 동일한 변경으로 검증했다.

### 실제 로컬 검증

| 항목 | 결과 |
|---|---|
| 환경 | Linux 6.17.0-1029-nvidia, Node v22.19.0, npm 10.9.3 |
| build | `npm run build` PASS |
| unit/regression | `npm test` PASS, 113/113, 0 fail |
| release artifact | `npm run release:check` PASS, 21 files; credential/state/temp 파일 미포함 확인 |
| audit | `npm audit --audit-level=high` PASS, 0 vulnerabilities |
| fixture | `validateReleaseDemoWorkspace` PASS before each run |
| mock rehearsal | 새 임시 workspace 3회 연속 PASS; 각 Run `completed`, 승인된 write만 report 생성, command rejection 기록 |
| live | `npm run test:live` PASS, 1/1 Airouter smoke test |

mock rehearsal은 실제 `MindCraftApp`과 custom tools를 사용해 read → write pending →
write approve → command pending → command reject 순서로 실행했다. 거부된 command는
실행되지 않았고, 원본 fixture 파일은 덮어쓰지 않았다. 각 회차 시간은 61ms, 33ms,
22ms였다(로컬 deterministic 실행 시간이며 5분 Windows UX 측정이 아니다).

### Windows/WSL 실환경 결과와 제한

이 실행 환경에는 Windows, Windows Terminal, WSL 배포판, `/mnt/c`가 없어 다음은
**미검증**이다: 한글 입력/색상/줄바꿈/resize/긴 streaming 출력, 승인 입력 혼동,
Ctrl-C와 terminal 복원, Linux·`/mnt/c`·공백/한글/unsupported drive·UNC 경로,
Windows Terminal에서의 3회 연속 본편. Linux 테스트나 mock 결과를 Windows 증거로
대체하지 않는다.

사용자 재현 절차는 다음과 같다.

```sh
git clone <repository-url> mindcraft && cd mindcraft
npm ci
./install.sh
cd /path/to/a/copy/of/examples/release-demo
mindcraft init
mindcraft config add-model --id release-mock --provider mock --model deterministic
MINDCRAFT_MODE=mock mindcraft
```

TUI에서 `doctor`로 `mode=mock`, Model/provider, storage를 확인하고 `task` →
`run` 후 `approvals`에서 write를 승인하고 command를 별도로 거부한다. 이어
`knowledge`, `knowledge-detail`, `promote`, 두 번째 `run`, `status`, `history`,
`quit`를 실행한다. live 검증은 mock 환경변수 없이 사용자가 구성한 Model로
별도 실행하며 실패/미가용 시 mock fallback을 하지 않는다.

### 최종 readiness

- 기능/mock: **준비 완료** — 실제 approval/tool/Run 상태 흐름과 3회 임시 workspace 검증.
- clean checkout/release/audit: **로컬 준비 완료** — clean baseline에서 재현 가능한
  install/build/test/release/audit 경로를 확인. Windows clean checkout은 미검증.
- Windows 3회: **미완료/차단** — Windows 환경 부재.
- live provider smoke: **통과** — `npm run test:live` 1/1.
- 전체 live 본편과 Windows 데모: **미완료/차단** — Windows 환경과 3회 native 리허설 부재.
- 따라서 전체 Phase 6 또는 Windows 데모를 완료로 선언하지 않는다.

## 반드시 기록할 결과

- Windows/WSL 버전
- Node/npm 버전
- 사용한 commit
- 설치 명령
- 데모 수행 시간
- 성공/실패한 시나리오
- 남은 known limitation

## 작업 시작 프롬프트

```text
MindCraft 저장소의 Phase 6인 Windows Terminal + WSL 검증과 릴리스 준비를 수행해줘.

목표:
- clean checkout 설치부터 TUI 종료까지 실제 데모 경로를 검증한다.
- Windows Terminal + WSL에서 색상, 한글, resize, Ctrl-C, 긴 출력, cancel을 확인한다.
- doctor → task → run → approval → result → knowledge → promote → second run → status 흐름을 3회 반복한다.
- build, test, release-check, audit 결과를 기록한다.
- 실제 검증하지 못한 항목은 성공했다고 쓰지 말고 known limitation으로 남긴다.

완료 조건:
- 재현 가능한 설치/실행 절차가 README에 반영됨
- Windows Terminal 리허설 결과 문서화
- npm run build 통과
- npm test 통과
- npm run release:check 통과
- npm audit --audit-level=high 통과

실제 명령 출력과 실패 원인을 근거로 최종 데모 readiness를 판정해줘.
```