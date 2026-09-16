# Phase 5 — 상태·복구·관찰성

Phase 5 수행 기록은 [demo-plan README](README.md#phase-5-수행-기록--상태복구관찰성)를 정본으로 사용한다.

이 문서는 중복 상태표를 만들지 않고 Phase 5의 범위와 정본 링크만 제공한다.

## 후속 작업 기록 — MC-PER-01

- baseline: `69f0fe4bb23f5aef36d101bdb76d9b9890ea247f`; working tree clean.
- 변경: `WorkflowRepository` 내부 append를 single-writer chain으로 직렬화하고, persistence failure 이후 후속 write를 fail-closed로 차단했다. repair는 pending write가 끝난 뒤 수행한다.
- 검증: `node --test test/phase-05-recovery-observability.test.mjs` 통과(5/5). concurrent commit 순서와 persistence failure 이후 write 차단을 포함한다.
- 상태: 전체 회귀 검증 및 커밋 대기.

## 후속 작업 기록 — 실행 중 command 취소

- 변경: Run `AbortSignal`을 custom tool/command runner까지 전달하고, POSIX process group 및 Windows `taskkill /T /F` 기반 process-tree cleanup을 적용했다.
- 관찰성: command execution result에 `cleanup`과 `effectStatus`를 기록한다. cancel/timeout 이후 effect는 `uncertain`으로 남기며 완료된 effect를 rollback했다고 가정하지 않는다.
- 검증: `test/approval-workflow.test.mjs`에서 승인된 장시간 Node command를 cancel한 뒤 cleanup 완료를 확인하고, 지연 effect 파일이 생성되지 않음을 검증했다. 전체 `npm test`: 166/166 통과.
- 환경 한계: Windows native process execution은 Linux CI에서 직접 수행하지 못했으며, Windows adapter 및 cross-platform code path는 build/focused tests로 검증했다.