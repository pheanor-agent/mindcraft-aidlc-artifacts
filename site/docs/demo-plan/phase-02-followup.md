# Phase 2 보완 수행 기록

- baseline: `9055ea135eeb7171d02fe9ac16732b793afe18ec` after Phase 1 follow-up commit.
- 기존 충족: CLI/TUI 공통 dispatcher와 `CommandQueue`, active Run 중복 차단, streaming 상태, Ctrl-C 경로가 이미 있었다.
- 보완: readline과 TUI 모두 `approve/reject`뿐 아니라 `cancel/quit/exit`를 제어 경로로 즉시 dispatch한다. 인자 없는 `cancel`은 active Run을 대상으로 하며 quit도 active Run을 먼저 정상 cancel한다.
- 검증: `node --test test/phase-02-followup.test.mjs` 통과(1 test), `npm run build` 통과. 후속 Phase 3 변경 포함 최종 전체 `npm test`는 105 tests passed. 고정 sleep만 사용하지 않고 queue가 실제 blocked promise를 해소하는 경계를 확인했다.
- 남은 문제: 실제 interactive terminal/Windows Terminal 수동 리허설은 Phase 6에서 수행한다.
- 다음 조건: Phase 3은 승인 request snapshot, run 취소 무효화, 고정 command argv 경계를 검증한다.
