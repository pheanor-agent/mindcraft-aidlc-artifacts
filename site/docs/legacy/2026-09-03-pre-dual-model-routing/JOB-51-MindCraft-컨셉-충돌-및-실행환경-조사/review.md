# JOB-51 설계 리뷰

## 리뷰 상태

**조건부 실행 승인 요청 상태**

조사·문서화·상세 설계까지는 완료했다. 실제 CLI 설치, credential 사용, 외부 Model 호출, adapter 구현은 별도 실행 승인이 필요하다.

## 오버엔지니어링 리뷰

### 확인된 과잉 범위 위험

- Vendor API, OpenAI-compatible API, Ollama, LM Studio, llama.cpp, OpenCode server, CLI, MCP를 동시에 구현 대상으로 보면 MVP가 검증되기 전에 adapter framework가 커진다.
- `listModels`, `countTokens`, `usage`, `cancel`, streaming을 모든 provider의 필수 계약으로 만들면 지원하지 않는 provider 때문에 공통 interface가 불안정해진다.
- Windows native, WSL2, Linux를 모두 같은 시점에 지원하려 하면 OS별 문제와 Model routing 문제가 섞인다.
- Claude Code/OpenCode의 harness 기능과 단순 Model completion을 하나의 abstraction으로 합치면 실제 capability 차이를 숨기게 된다.

### 축소 결정

1. **제품 기본값은 OpenCode와 Claude Code다.** 둘은 단순 Model provider가 아니라 기본 coding harness로 설계한다.
2. **Airouter와 Codex는 제품 provider가 아니다.** 기존 구현과 deterministic test는 개발·테스트 fixture로 유지하되 사용자 기본 설정과 분리한다.
3. **사용자 등록 provider API/local endpoint는 확장 경로다.** OpenAI-compatible fixture를 계약 검증의 첫 단계로 사용하되, 실제 제품 routing은 provider 등록·역할 지정까지를 목표로 한다.
4. **CLI/server/ACP/SDK/MCP를 한 번에 모두 구현하지 않는다.** 기본 harness 요구사항은 OpenCode/Claude Code로 유지하되, OpenCode server/ACP와 Claude Agent SDK를 CLI 외 연결 후보로 probe하고 server·ACP·SDK·MCP의 구현 시점은 분리한다.
5. **optional capability는 계약에서 nullable로 둔다.** `usage`, `countTokens`, `cancel`, streaming은 지원 여부를 capability로 보고하며 필수 성공 조건으로 만들지 않는다.
6. **CLI 외 인터페이스도 고려하되 ExecutionBackend로 통합한다.** HTTP API/local server는 1차 Model 경로, OpenCode server는 2차 harness 경로, SDK와 GUI는 후속/제외로 구분한다.

## SSOT 리뷰

### SSOT 계층

1. `src/`와 `package.json`: 현재 실제 구현·runtime·dependency의 사실 기준
2. `JOB-51/design.md`: 이번 작업의 확정 범위·계약·acceptance 기준
3. `HACKATHON.md`: 제품 가설·우선순위·장기 방향
4. `README.md`: 사용자에게 공개하는 현재 지원 범위와 설치 방법
5. `ENVIRONMENT.md`: 검증 matrix와 환경별 증적
6. `request.md`·`review.md`·`verification.md`: 작업 이력과 판단 근거

문서 간 충돌이 생기면 구현되지 않은 미래 방향을 README의 현재 기능처럼 쓰지 않는다. `현재 구현`, `설계 후보`, `검증 대기`, `지원 확정`을 명시적으로 구분한다.

### 현재 SSOT 불일치 및 정리 원칙

- 현재 구현 SSOT는 Airouter provider 하나이지만, 이는 개발·테스트 fixture다. 제품 요구사항 SSOT의 기본 harness는 OpenCode와 Claude Code다.
- README의 외부 CLI와 routing 설명은 “검토 방향”으로 읽혀야 하며, 현재 지원 기능으로 오해되지 않아야 한다.
- ENVIRONMENT의 OS matrix는 지원 선언이 아니라 검증 계획이다. 판정 전에는 `Not tested` 또는 `Conditional`을 유지한다.
- HACKATHON은 장기 제품 방향을 담고, 실제 acceptance는 JOB-51 `verification.md`를 따른다. 구현 상태와 제품 기본값은 반드시 구분한다.

## 리뷰 결론 보정

초기 설계는 제품 기본 harness와 개발용 provider를 혼동했다. 따라서 다음 실행은 **OpenCode/Claude Code 기본 harness의 preflight·capability report·mock contract**를 중심으로 하고, 사용자 등록 API는 역할별 Model provider 확장 계약으로 분리한다. Airouter/Codex는 fixture 검증에만 사용한다.

## 리뷰 결과

### 통과한 항목

- Windows-first UX와 Linux/WSL2-capable backend를 분리해 컨셉 충돌을 완화했다.
- OpenCode/Claude Code의 공식 설치 가능성과 MindCraft adapter 지원 가능성을 구분했다.
- CLI별 차이를 공통 adapter 계약으로 격리했다.
- routing을 자동 실행이 아닌 proposal → approval → execution으로 설계했다.
- credential 미수집, argv secret 금지, cwd 제한, environment allowlist, redaction을 명시했다.
- Windows native, WSL2, Linux를 동일 acceptance 시나리오로 비교하도록 했다.
- 실제 유료 호출과 자동 설치를 범위에서 제외했다.

### 주요 위험

1. CLI가 interactive permission prompt를 강제하면 headless adapter가 불안정할 수 있다.
2. CLI의 usage/cost 정보가 표준화되어 있지 않으면 비용은 정확한 값이 아닌 unknown 또는 estimate로 표시해야 한다.
3. WSL2에서 Windows 경로를 사용할 때 file watcher와 I/O 성능 저하가 발생할 수 있다.
4. local Model은 사용자별 GPU·메모리 편차가 커서 단일 성능 기준을 약속하기 어렵다.
5. subprocess 종료가 process tree 전체에 전파되지 않으면 timeout/cancel 후 유령 process가 남을 수 있다.
6. Windows와 WSL 사이의 credential·project file 경계를 잘못 설계하면 privacy 문제가 생길 수 있다.

## 리뷰 결론

**정정된 요구사항을 반영한 설계는 실행 가능한 수준으로 정리되었으며, 다음 단계는 제한된 범위에서 조건부 승인할 수 있다.**

단, 1차 실행은 다음으로 제한한다.

- OpenCode/Claude Code 설치·버전·capability preflight
- deterministic harness mock adapter
- 사용자 등록 Model provider의 최소 등록 schema
- Windows runner의 package/CLI smoke
- 실제 Model 호출 없는 process/TTY/timeout/cancel 테스트

다음은 별도 승인 없이는 수행하지 않는다.

- 실제 Windows PC 또는 VM에 대한 원격 변경
- 외부 CLI 자동 설치
- credential/login 처리
- 유료 Model 호출
- remote push 또는 배포
