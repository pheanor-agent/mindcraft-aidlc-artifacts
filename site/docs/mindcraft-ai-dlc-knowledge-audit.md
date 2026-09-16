# MindCraft / AI-DLC 지식·문서 경계 점검 기록

- 점검일: 2026-09-06
- 대상 저장소: `/opt/data/workspace/mindcraft`
- 목적: 다른 세션에서 MindCraft 제품 개념과 AI-DLC 개발 방법론을 혼동하지 않도록 현재 문서·Knowledge 저장 상태를 기록
- 상태: 정정 반영 승인·로컬 커밋 완료

## 1. 정정된 기준선

> **AI-DLC는 해커톤에서 MindCraft를 개발·검증하기 위해 사용한 외부 개발 방법론/개발 하네스이며, MindCraft 제품 내부의 런타임 개념이나 하네스가 아니다.**

관계는 다음과 같다.

```text
AI-DLC
└─ MindCraft를 개발·검증하기 위한 외부 방법론

MindCraft
└─ 해커톤 결과물인 독립형 Pi 기반 terminal TUI 제품
   ├─ Task / Episode / Run workflow
   ├─ Knowledge 관리
   ├─ Model 설정 및 routing
   ├─ Approval / GrantedScope / Tool safety
   ├─ Persistence / Recovery
   └─ Demo / onboarding UX
```

AI-DLC의 개발 단계와 MindCraft 제품 런타임의 Task/Episode/Run은 동일한 상태 모델이 아니다.

## 2. 점검 결과 요약

현재 권위 문서와 제품 Knowledge 저장소에는 AI-DLC를 MindCraft 런타임 내부 기능으로 정의한 내용이 확인되지 않았다.

다만 다음 과거 자료와 대화 기록에는 혼동을 유발할 수 있는 표현이 남아 있다.

- `docs/legacy/2026-09-03-pre-dual-model-routing/**`
- 과거 Discord 메시지의 `AI-DLC workspace` 표현
- 일부 제안 문서에서 AI-DLC 개발 단계와 MindCraft 제품 Workflow가 같은 문서에 함께 설명된 부분

이 과거 자료는 현재 SSOT로 승격하지 않는다.

## 3. 현재 SSOT 점검

### 정상 문서

#### `docs/SSOT.md`

- 제품 문서의 권위 순서를 정의한다.
- `docs/legacy/**`를 과거 자료로 분리한다.
- 개발 process 자료·과거 기록·미승인 제안을 실행 Context에 자동 포함하지 않는다.
- 제품 Knowledge와 개발 process 자료를 통합하지 않는다.

#### `docs/mindcraft-design-and-background-bundle.md`

다음 기준을 명시한다.

- AI-DLC는 MindCraft runtime이 아니라 MindCraft를 개발·검증하는 governance workflow
- MindCraft의 제품 Workflow는 Task/Episode/Run 및 Pi AgentSession 중심
- AI-DLC 기록은 제품 runtime approval 상태를 대신하지 않음

#### `docs/mindcraft-design-and-background-bundle-revision1.md`

다음 기준을 명시한다.

- AI-DLC는 제품 runtime이 아니라 개발 governance process
- AI-DLC 기록은 제품의 runtime approval 상태를 대신하지 않음
- AI-DLC 단계는 INCEPTION, CONSTRUCTION, OPERATIONS의 개발 프로세스 기록

#### `DESIGN.md`

MindCraft 자체 실행 흐름은 다음으로 정의된다.

```text
Task → Episode → Run → Pi AgentSession
```

AI-DLC Phase를 MindCraft 런타임 상태로 정의하지 않는다.

#### `ROUTING.md`

MindCraft 제품의 현재 Model 정책만 다룬다.

- Episode 시작 시 purpose 기반으로 Model을 한 번 선택
- 자동 Model switching/fallback 없음
- 사용자가 지정한 Model과 purpose를 사용

AI-DLC 개념 오염은 확인되지 않았다.

#### `docs/MINDCRAFT-PRODUCT-METADATA.md`

MindCraft의 제품 목적, Knowledge, Model, Tool, Platform 정책을 정의한다. AI-DLC를 제품 런타임 개념으로 저장한 내용은 확인되지 않았다.

## 4. 혼동 가능 문서

### `docs/mindcraft-concept-alignment-proposal.md`

이 문서는 `INCEPTION 종료 및 CONSTRUCTION 진입 승인`을 다루는 승인 대기 제안서다. AI-DLC 개발 프로세스와 MindCraft 제품 설계를 같은 문서에서 설명하므로 독자가 계층을 혼동할 가능성이 있다.

직접적인 오정의는 확인되지 않았지만 다음 주의 문구를 추가하는 것이 권장된다.

```markdown
> 주의: 이 문서의 AI-DLC 단계는 MindCraft를 개발하기 위한 외부 개발 프로세스다.
> MindCraft 제품 런타임의 Task/Episode/Run 상태나 사용자 실행 단계와 동일한 개념이 아니다.
```

### `docs/demo-plan/**`

Phase 0~6은 MindCraft 데모를 개발·검증하기 위한 작업 단계다.

- Phase 0: 데모 기준선과 fixture
- Phase 1: 초기화·Preflight·Model 설정
- Phase 2: TUI command workflow
- Phase 3: 승인·Tool safety
- Phase 4: Knowledge 재사용
- Phase 5: 상태·복구·관찰성
- Phase 6: Windows Terminal 검증·릴리스

이 Phase들은 MindCraft 사용자 실행 시의 AI-DLC Phase가 아니다. 문서 상단에 다음 문구를 추가하면 안전하다.

```markdown
> 이 문서의 Phase 0~6은 MindCraft 개발·검증을 위한 해커톤 작업 단계다.
> MindCraft 제품 사용자의 런타임 workflow나 AI-DLC 실행 엔진을 의미하지 않는다.
```

## 5. Legacy 문서 점검

다음 경로에는 과거의 잘못되었거나 현재 기준에서 폐기된 표현이 남아 있다.

```text
docs/legacy/2026-09-03-pre-dual-model-routing/
```

대표 표현:

- `협업형 AI-DLC workspace`
- `팀 협업형 AI-DLC workspace`
- MindCraft를 AI-DLC workspace로 정의

현재 기준에서는 이 표현을 제품 정의로 사용하지 않는다. 단, 해당 자료가 `docs/legacy/**` 아래에 있으므로 현재 SSOT나 실행 Context에 자동 반영되지는 않는다.

파일 삭제 대신 각 Legacy 문서 상단에 다음 경고를 추가하는 것이 권장된다.

```markdown
> Historical note:
> 이 문서는 2026-09-03 이전의 개념 검토 기록이다.
> 당시의 `AI-DLC workspace` 표현은 현재 기준에서 폐기되었다.
> AI-DLC는 MindCraft 런타임이 아니라 MindCraft 개발·검증에 사용한 외부 방법론이다.
```

## 6. Runtime Knowledge 저장소 점검

점검 시점에 다음 파일은 존재하지 않았다.

```text
/opt/data/workspace/mindcraft/.mindcraft/knowledge.jsonl
```

따라서 현재 저장된 제품 Knowledge에서 AI-DLC를 MindCraft 런타임으로 설명하는 Knowledge item은 확인되지 않았다.

존재하는 `.mindcraft/state.jsonl`에는 테스트 실행 기록이 있으며 다음 내용이 확인된다.

- Task/Run 상태
- Knowledge metrics
- mock Model 선택 결과
- filesystem read decision
- pending filesystem write approval

AI-DLC 개념을 제품 런타임으로 저장한 기록은 확인되지 않았다.

## 7. Discord 기록 점검

과거 Discord 기록에는 다음과 같은 혼동 가능 표현이 있다.

- MindCraft를 AI-DLC 컨셉의 스펙 문서로 재정의
- AI-DLC workspace
- AI-DLC가 MindCraft 프로젝트 안에 포함
- AI-DLC 하네스 역할의 파일

이는 과거 대화 기록이므로 임의 삭제하지 않는다. 이후 기준을 별도 메시지나 정본 문서로 명시해 해석 기준을 고정한다.

권장 기준 문장:

```text
[개념 정정]
AI-DLC는 MindCraft 제품 내부의 런타임 기능이나 하네스가 아니다.
AI-DLC는 해커톤에서 MindCraft를 개발·검증하기 위해 사용한 외부 개발 방법론이다.
MindCraft의 제품 기능과 상태 모델은 Task/Episode/Run, TUI, Knowledge,
Approval, Model, Recovery를 기준으로 설명한다.
```

## 8. 현재 판정

| 범위 | 판정 |
|---|---|
| 현재 SSOT | 정상 |
| 현재 설계 통합본 | 정상 |
| 현재 제품 Metadata | 정상 |
| 현재 Model 정책 | 정상 |
| Demo plan Phase 0~6 | 개발·검증 단계로 해석해야 하며 주의 문구 권장 |
| Concept alignment proposal | 계층 혼동 가능성 있음, 주의 문구 권장 |
| Legacy 문서 | 과거의 잘못된 표현 보존 중, 현재 기준으로 승격 금지 |
| Runtime Knowledge | `knowledge.jsonl` 없음, AI-DLC 오염 확인 안 됨 |
| Discord 기록 | 과거 혼동 표현 존재, 삭제보다 정정 기준 고정 권장 |

## 9. 다음 세션 시작 시 읽을 파일

1. 이 파일: `docs/mindcraft-ai-dlc-knowledge-audit.md`
2. `docs/SSOT.md`
3. `README.md`
4. `DESIGN.md`
5. `ROUTING.md`
6. `docs/mindcraft-design-and-background-bundle.md`
7. 필요할 때만 `docs/legacy/**`를 historical 참고자료로 읽는다.

## 10. 다음 작업 권장 순서

1. `docs/demo-plan/README.md` 상단에 Phase의 성격을 명시한다.
2. `docs/mindcraft-concept-alignment-proposal.md`에 AI-DLC와 제품 런타임의 경계 문구를 추가한다.
3. Legacy 문서에는 폐기된 과거 표현이라는 historical note를 추가한다.
4. AI-DLC 개발 산출물과 MindCraft 제품 문서를 검색·주입할 때 서로 다른 namespace로 취급한다.
5. 새로운 제품 Knowledge를 저장할 때 AI-DLC 개발 process 자료를 자동 promoted하지 않는다.

## 핵심 결론

현재 SSOT와 제품 Knowledge가 잘못 저장된 상태는 아니다. 문제는 과거 문서와 Discord 기록에 남은 표현이 현재 개념과 충돌할 수 있다는 점이다.

앞으로의 기준은 다음 한 문장으로 고정한다.

> **AI-DLC는 MindCraft를 개발하기 위해 사용한 외부 개발 방법론이며, MindCraft 제품 내부의 런타임 개념이나 하네스가 아니다.**
