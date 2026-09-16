# Commit History — MindCraft local baseline

- 작성 시점: 2026-09-03
- 기준 HEAD: `4d327107b524f76f2a836162ca6776cbf8487b34` (`feat: add opt-in token doctor mode`)
- 대상 branch: `master`
- 목적: 기존 미커밋 변경과 JOB-53 Model routing 변경을 하나의 검토 가능한 local baseline으로 기록
- 원격 반영: workflow 파일을 제외한 변경만 수행

## 변경 이력 및 파일 분류

### 기존 MindCraft 전달물·문서·환경 산출물

다음 파일은 기준 HEAD 시점에 이미 working tree에 존재하던 미커밋 산출물이다. 프로젝트 baseline, 설치, CI, 설계, TODO를 구성한다.

- `DESIGN.md`
- `ENVIRONMENT.md`
- `README.md`
- `TODO.md`
- `install.sh`

`.github/workflows/windows-smoke.yml`은 GitHub OAuth App의 `workflow` scope 부족으로 원격 push가 거부되어 이번 원격 커밋에서는 제외했다. 로컬 파일도 삭제했으며, workflow 반영은 권한 보완 후 별도 작업으로 진행해야 한다.

### JOB-53 이중 Model routing 구현

이번 요청에서 추가·수정한 파일이다.

- `ROUTING.md`: 현재 routing SSOT
- `src/model-routing.mjs`: registry validation, task classification, deterministic selection, fail-closed policy
- `src/config-store.mjs`: `.mindcraft/config.json` 로드 및 atomic save
- `src/mindcraft-app.mjs`: 고정 Model 조회를 routing policy 경유로 변경, Run routing audit 저장
- `src/cli.mjs`: `MINDCRAFT_CONFIG`/기본 config 경로 로드
- `test/model-routing.test.mjs`: dual/single/no-model 및 오류 시나리오
- `package.json`: build 대상 및 ROUTING.md package 포함

### Legacy 이력 보존

`docs/legacy/2026-09-03-pre-dual-model-routing/` 아래에는 JOB-53 이전 문서와 컨셉 검토 이력을 삭제하지 않고 보존한다.

- 현재 문서 원본: `README.md`, `DESIGN.md`, `ENVIRONMENT.md`, `ROUTING.md`, `TODO.md`
- 관련 이력은 git history와 `docs/legacy/`에서 확인한다.

## 프로세스 확인

1. 기준 HEAD와 branch 확인
2. tracked diff와 untracked file 목록 확인
3. 기존 산출물과 JOB-53 변경을 분리 분류
4. 상세 설계·리뷰·승인 기록 확인
5. 변경 구현 및 deterministic test 수행
6. explicit file manifest 기반 stage
7. staged diff/stat 검토 후 local commit
8. commit 후 `git show`와 working tree 재확인

## 검증 증적

- `npm run build`: pass
- `npm test`: 93 pass, 0 fail, 0 skip
- `npm run release:check`: pass, package 17 files, `ROUTING.md` 포함
- `git diff --check`: pass
- routing test: pass
- 최초 local commit `8124514`는 44개 파일에 생성했으나 workflow scope 오류로 원격 push되지 않았다.
- 원격 반영용 재구성 커밋에서는 workflow 파일을 제외한다.
- 실제 외부 Model/API 호출: 미수행
- credential 변경/수집: 미수행
- remote push: 미수행

## Phase 2 — TUI command workflow

이번 변경은 CLI와 Windows Terminal TUI의 command surface를 통합하고 입력·실행
상태 처리를 보강한 것이다.

- `src/command-queue.mjs`: 공통 command parser/dispatcher와 비동기 입력 queue
- `src/cli.mjs`: 공통 dispatcher 사용 및 Phase 2 명령 연결
- `src/tui-runner.mjs`: queue, streaming event, tool decision, 상단 상태 표시, Ctrl-C cancel
- `src/mindcraft-app.mjs`: event callback, 중복 실행 방지, cancel 상태 영속화
- `test/cli-command-queue.test.mjs`: 빠른 연속 입력 순서 및 command flow 검증
- `README.md`, `DESIGN.md`, `docs/demo-plan/README.md`: Phase 2 구현 상태와 명령 문서화

검증:

- `npm run build`: pass
- `npm test`: 95 pass, 0 fail, 0 skip

## 커밋 경계

- 이 문서가 커밋되는 모든 파일의 변경 목적과 출처를 기록한다.
- `node_modules`, `.mindcraft` runtime state, credential, 개인 파일은 stage 대상이 아니다.
- 원격 push는 별도 승인·preflight·read-back 절차가 필요하다.
- `.github/workflows/windows-smoke.yml`은 GitHub `workflow` scope 부족으로 별도 미반영 상태다.
