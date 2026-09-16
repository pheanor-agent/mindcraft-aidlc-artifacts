# Phase 4 — Knowledge 검색·검토·재사용

## 목표

첫 번째 작업 결과가 Knowledge로 축적되고, 사용자가 승인한 내용만 다음 Run에 재사용되는 모습을 TUI에서 보여준다.

## 작업

1. Knowledge 목록 화면을 추가한다.
2. 검색어와 관련도 정렬을 지원한다.
3. `captured`, `promoted`, `rejected` 상태를 명확히 표시한다.
4. provenance(Task/Episode/Run/source)를 표시한다.
5. 상세 보기와 promote/reject action을 추가한다.
6. 다음 Run에 포함될 context preview를 제공한다.
7. 실제 포함된 Knowledge item과 제외된 item을 구분한다.
8. 검색 결과 부족 시 fallback 범위를 표시한다.
9. redacted candidate가 승인 전 context에 들어가지 않는지 검증한다.

## 수정 후보

- `src/knowledge.mjs`
- `src/tui-runner.mjs`
- `src/tui-adapter.mjs`
- `src/mindcraft-app.mjs`
- `test/knowledge-ui-flow.test.mjs`
- `test/knowledge-reuse.test.mjs`

## 완료 조건

```text
Run 1 완료
→ candidate 생성
→ knowledge 목록 확인
→ candidate promote
→ Run 2 시작
→ approved Knowledge attached 표시
```

화면에 다음 정보가 있어야 한다.

- Knowledge ID
- relevance
- status
- source
- 연결 Task/Run
- 이번 Run 포함 여부
- context 문자 수

## 검증

```sh
npm run build
npm test
```

## 작업 시작 프롬프트

```text
MindCraft 저장소에서 Phase 4인 Knowledge 검색·검토·재사용 workflow를 구현해줘.

목표:
- TUI에서 Knowledge 목록, 검색, 상세, promote, reject를 사용할 수 있게 한다.
- provenance와 relevance를 표시한다.
- promoted Knowledge만 다음 Run context에 포함한다.
- captured/rejected item은 자동 context에 포함하지 않는다.
- context preview와 fallback 범위를 표시한다.

보안/데이터 요구:
- candidate와 promoted 상태를 혼동하지 않는다.
- raw data와 metadata/provenance를 분리 보존한다.
- secret redaction을 유지한다.
- Knowledge 내용을 Run record에 불필요하게 중복 저장하지 않는다.

완료 조건:
- 첫 Run 결과 capture → promote → 두 번째 Run 재사용 테스트
- 검색/관련도/상태 표시 테스트
- 승인 전 candidate 제외 테스트
- npm run build와 npm test 통과

변경한 schema가 기존 state/knowledge reload와 호환되는지 확인해줘.
```

## Phase 4 수행 기록

### 기준선

- 시작 branch: `master`
- 시작 HEAD: `9ddee48f3117339765d5c2eb1d4502d601bf6db9`
- 시작 working tree: clean; staged/unstaged 변경 없음
- 기존 Phase 1~3: 기존 follow-up 문서와 105개 baseline 테스트로 확인

### 이번 변경

기존 `KnowledgeService`와 application dispatcher/Pi session 경계를 유지하면서 다음만 보완했다.

- capture candidate는 redacted content와 SHA-256 revision/digest, Task/Episode/Run/source URI/timestamp provenance를 저장하고, 같은 source Run의 재시도는 기존 item을 반환한다.
- `buildContext`가 promoted 필터→관련 검색→동일 budget의 전체 promoted 검색→scope/secret/internal/binary/generated/vendor 제외 파일 fallback 순서를 단일 경로로 제공한다. 실제 점수가 없으므로 score를 만들지 않고 manifest와 제외 사유를 보존한다.
- `MindCraftApp.previewKnowledge`와 Run 실행이 같은 context builder를 사용한다. Run manifest에는 실제 Knowledge ID/revision 또는 workspace digest, 순서, 길이, fallback/제외 사유가 기록된다.
- CLI/TUI 공통 command dispatcher에 `knowledge [query]`, `knowledge-detail`, `promote`, `reject-knowledge`, `preview`를 연결했다. captured/rejected는 context에 들어가지 않는다.
- capture 실패는 Run 성공과 분리되고 `knowledgeCapture.status=failed, retryable=true`로 남는다. provider/tool 재실행 없이 `retryCapture`를 호출할 수 있다.

### 실제 검증

- `npm run build` — 통과
- `npm test` — 통과, 108 tests / 108 pass / 0 fail

추가한 `test/phase-04-knowledge-reuse.test.mjs`가 capture→promote→실제 Run 2 prompt/manifest, 안전한 파일 fallback, idempotent capture retry를 검증한다. Windows Terminal 및 live provider 호출은 로컬 검증에 포함하지 않았다.

### 남은 문제와 다음 조건

- 파일 fallback의 실제 디렉터리 스캔은 기존 Agent tool 승인 경계를 우회하지 않도록 자동 추가하지 않았다. 호출자가 승인된/허용된 파일 목록을 context builder에 제공해야 한다.
- tokenizer 기반 상한은 아직 없으며 기존 보수적 문자 예산(2,000)을 사용한다.
- Phase 5는 이 Run manifest와 `knowledgeCapture`/provenance를 조회해 status/history를 구성해야 한다.
