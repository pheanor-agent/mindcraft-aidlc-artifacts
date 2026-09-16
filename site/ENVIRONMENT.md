# MindCraft 로컬·설치 검증 환경 설계

> 현재 제품은 Pi 기반 terminal TUI입니다. 외부 coding-agent/CLI 설치는 제품 prerequisite가 아닙니다. Model 선택 정책은 [`ROUTING.md`](./ROUTING.md)를 따릅니다.

## 1. 목적

MindCraft를 개발자 로컬, clean install 환경, CI, 선택한 provider의 실제 통합 환경에서 같은 기준으로 재현 가능하게 실행한다.

환경 검증은 다음 두 계층으로 분리한다.

```text
기본 검증: 외부 API 없이 설치·build·unit test·CLI smoke
통합 검증: Airouter credential과 실제 model을 사용한 end-to-end run
```

## 2. 지원 기준

### 필수 runtime

- 제품/release target: Windows x64 bundled runtime + compatible terminal
- 개발·CI 기본 환경: Linux native 또는 WSL2
- Node.js `>=22.19.0`
- npm
- Git
- Bash 또는 POSIX shell (`install.sh` 실행 시)

Node.js 20은 지원하지 않는다. 현재 프로젝트 dependency인 `undici`와 Pi runtime이 요구하는 Node 22 기준을 따른다.

Windows native는 본체 설치 대상에서 제외한다는 뜻이 아니라, 외부 CLI adapter와 process/TTY/권한 동작을 별도로 검증한 뒤 지원한다는 의미다. 설치 UX는 Windows-first로 만들되, 실행 backend는 OS 조합별 지원 matrix로 명시한다.

### 선택 항목

- 등록 Model provider: 최소 1개 필요
- 고성능/저비용 profile: 둘 다 설정하거나 하나만 설정할 수 있음
- Airouter API key: 해당 provider를 선택한 실제 통합 테스트에만 필요
- local Model backend/GPU: 저비용 profile이 local endpoint일 때만 필요

## 2-A. 등록 Model provider 지원 matrix (초안)

| 조합 | 1차 상태 | 확인할 계약 |
|---|---|---|
| Linux/WSL2/Windows + 등록 HTTP API | 우선 검증 | TLS/auth, model ID, stream/usage, timeout |
| Linux/WSL2/Windows + local HTTP server | 조건부 검증 | loopback scope, model discovery, GPU, data boundary |
| profile 2개 설정 | 우선 검증 | 상황별 선택과 approval/audit |
| profile 1개 설정 | 우선 검증 | 모든 작업 단일 Model fallback |

provider 연결은 adapter contract로 다룬다. 외부 coding-agent/CLI 설치와 interactive mode는 제품 prerequisite가 아니다.

## 3. 권장 디렉터리

```text
~/src/mindcraft              # source checkout
~/tmp/mindcraft-install      # clean install fixture
~/.mindcraft-agent           # Pi agent state
<project>/.mindcraft/        # workflow/knowledge state
```

실행 state는 source repository와 분리된 test project에서 생성한다. 실제 credential이나 개인 파일이 source tree에 기록되지 않도록 한다.

## 4. Node.js 설치 정책

### 개발자 로컬

Node version manager를 사용하고 project별 버전을 고정한다.

```sh
nvm install 22.19.0
nvm use 22.19.0
node --version
npm --version
```

`node --version` 결과가 `v22.19.0` 이상이어야 한다.

### 자동화 환경

CI image 또는 setup action에서 Node 22를 명시한다. `latest`나 Node 20을 사용하지 않는다.

### 사전 검사

설치 script는 다음 순서로 실패를 빠르게 알려야 한다.

1. `node` 존재 여부
2. `npm` 존재 여부
3. Node semver가 `>=22.19.0`인지
4. source directory에 `package.json` 존재 여부
5. 이후에만 package install 수행

## 5. 설치 검증 시나리오

### A. source checkout 설치

```sh
git clone <private-repository-url> ~/src/mindcraft
cd ~/src/mindcraft
nvm use 22.19.0
./install.sh
```

확인:

```sh
command -v mindcraft
mindcraft
```

CLI에서 `task`, `status`, `quit`가 동작해야 한다.

### B. clean install

기존 dependency나 global package의 영향을 제거한다.

```sh
rm -rf node_modules
npm ci
npm run build
npm test
npm run release:check
```

그 다음 별도 임시 project에서 global 설치 명령을 확인한다.

```sh
mkdir -p ~/tmp/mindcraft-install
cd ~/tmp/mindcraft-install
mindcraft
```

### C. package artifact 설치

release 전 package artifact를 source checkout과 분리해서 검증한다.

```sh
cd ~/src/mindcraft
npm pack
mkdir -p ~/tmp/mindcraft-artifact
cd ~/tmp/mindcraft-artifact
npm install -g ~/src/mindcraft/mindcraft-0.1.0.tgz
mindcraft
```

artifact에는 `src`, `package.json`, `package-lock.json`, `README.md`, `install.sh`만 포함되어야 한다. `.mindcraft`, `node_modules`, credential 파일은 포함하지 않는다.

## 6. 기본 검증과 통합 검증

### 기본 검증 — API key 불필요

```sh
npm ci
npm run build
npm test
npm run release:check
printf 'status\nquit\n' | mindcraft
```

검증 대상:

- dependency 설치
- JavaScript syntax
- domain/repository/knowledge/safety test
- CLI 초기화·status·종료
- package artifact 내용

### 통합 검증 — API key 필요

credential은 shell history, Git, 로그에 남기지 않는 방식으로 주입한다.

```sh
export AIROUTER_API_KEY='...'
mkdir -p ~/tmp/mindcraft-e2e
cd ~/tmp/mindcraft-e2e
mindcraft
```

검증 순서:

```text
task integration smoke
run 짧은 테스트 응답을 반환해줘
status
knowledge
quit
```

성공 기준:

- AgentSession이 생성됨
- Run이 `completed`가 됨
- assistant 결과가 출력됨
- 상태가 `.mindcraft/state.jsonl`에 저장됨
- candidate가 `.mindcraft/knowledge.jsonl`에 저장됨
- secret이 결과·오류·candidate에 노출되지 않음

통합 검증은 비용과 외부 network에 의존하므로 일반 unit test와 분리한다.

## 7. CI 설계

CI job은 세 개로 분리한다.

### `unit`

- Node 22.19.0
- `npm ci`
- `npm run build`
- `npm test` 중 deterministic test
- credential 없음

### `package`

- `npm pack --dry-run`
- artifact file list 검사
- clean temporary directory에서 package 설치
- CLI `status/quit` smoke

### `integration` (수동 또는 보호된 secret)

- `AIROUTER_API_KEY` secret injection
- 짧은 단일 model request
- timeout과 비용 제한
- 결과 로그에 credential 출력 금지

통합 job 실패가 기본 unit job을 막지 않도록 외부 provider 의존성을 분리한다.

## 8. 환경변수와 secret 정책

현재 필수 provider 환경변수:

```text
AIROUTER_API_KEY
```

정책:

- `.env` 파일을 repository에 commit하지 않는다.
- API key 원문을 Discord, issue, test fixture, 로그에 기록하지 않는다.
- preflight 오류는 변수 이름과 설정 여부만 표시한다.
- 오류·Run 결과·Knowledge candidate는 redaction 후 저장한다.
- 통합 테스트 종료 후 임시 state directory를 삭제한다.

## 9. 현재 환경 기준 갭

현재 확인된 환경은 다음과 같다.

- Node.js `v20.19.2`: 지원 기준 미달
- npm `9.2.0`: 존재
- `node_modules`: 존재하지만 clean install을 대체하지 못함
- `AIROUTER_API_KEY`: 설정되어 있음
- source working tree: `package.json` 수정 및 README/install script/DESIGN 문서가 아직 uncommitted

따라서 현재 로컬은 기본 검증을 위한 준비 상태가 아니며, Node 22 전환 후 clean install을 수행해야 한다.

## 10. 환경 설계 리뷰

### 승인 전 필수

- [ ] Node 22.19.0 이상 설치
- [ ] `rm -rf node_modules && npm ci`
- [ ] build/test/release-check 재실행
- [ ] 별도 임시 directory에서 global install
- [ ] API key 없이 CLI smoke
- [ ] 보호된 API key로 단일 integration smoke
- [ ] 임시 state와 package artifact에 secret 미포함 확인

### 보류 가능한 항목

- [ ] 다중 OS matrix
- [ ] 다중 Node 22 minor version
- [ ] concurrent writer test
- [ ] 장시간 Agent run

## 11. 결론

환경 세팅은 단순히 Node를 설치하는 작업이 아니라, **지원 runtime 고정 → clean dependency install → API 없는 기본 검증 → API를 사용하는 통합 검증 → package artifact 검증**의 재현 가능한 절차로 관리한다.

현재 다음 실행 승인은 아래 범위로 요청한다.

> Node.js `>=22.19.0` 환경에서 clean install 및 CLI smoke를 먼저 수행한다. 이후 선택한 provider에 맞는 별도 승인된 integration smoke를 실행한다.
