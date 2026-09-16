# Phase 3 보완 수행 기록

- baseline: `50a67223364428eae2ff5dc1f232f32a959af6af` after Phase 2 follow-up commit.
- 기존 충족: Pi custom inspect/write/command 도구, approval lifecycle, canonical/realpath scope, symlink/traversal denial, command `shell:false`, timeout 및 redaction이 이미 있었다.
- 보완: approval request를 deep snapshot하고 중복 decision을 차단했다. request에 `runId`, canonical path, write SHA-256 content digest를 포함하며, run 취소는 pending/늦은 approval 모두 `cancelled`로 무효화한다. command 문자열 allowlist는 임의 argv를 허용하지 않고, object spec은 executable+정확한 args+선택 cwd를 일치시킨다. `.mindcraft` 제어 경로를 Agent tool에서 차단하고 child 환경을 PATH로 최소화했으며 output 상한 초과 시 child를 종료한다. approval 실행 실패는 `failed`로 기록한다.
- 검증: `node --test test/phase-03-followup.test.mjs` 통과(4 tests), `npm run build` 통과, `npm test` 통과(105 tests, 105 passed). 기존 path-security/approval/runtime 통합 테스트도 전체 실행에 포함됐다.
- 남은 문제: effect와 audit 저장의 원자적 exactly-once는 보장하지 않으며, effect 후 기록 실패 복구는 Phase 5 식별·history 경로에서 다룬다. Windows/live provider는 Phase 6 조건이다.
- 다음 조건: Phase 4를 시작하기 전 승인 후 effect/audit 불확실성의 recovery contract를 유지해야 한다.

## 1차 후속 보완 기록

- baseline: `42c583598670e137ea6819f25cd840fe43ca7c86`; working tree clean.
- 보완: 승인 decision audit write를 순차화하고 `flush()` 경계를 추가했다. pending decision 기록 실패 또는 승인 decision 기록 실패 시 side effect를 시작하지 않는다. `MindCraftApp.recordToolDecision()`은 repository commit 완료를 반환한다.
- 검증: 승인 journal failure 시 executor 0회 회귀 테스트를 추가했다. `node --test test/phase-03-followup.test.mjs test/phase-06-release-rehearsal.test.mjs` 통과(6/6). 전체 `npm test` 통과(113/113).
- 제한: journal과 외부 side effect의 원자적 exactly-once는 여전히 보장하지 않는다. effect 이후 결과 기록 실패는 `unknown`/확인 필요 경로를 사용한다.

## 후속 작업 기록 — MC-SAFE-01

- baseline: `3ca662609b83282766d6d2e7ec03a8e5f99e3599`; `MC-PER-01` 변경을 선행 커밋한 상태.
- 변경: 승인 후 `execution_started` 저장 경계를 추가하고, filesystem write와 command의 실행 직전 scope/canonical target 및 immutable payload/argv를 재검증한다. 검증 실패 시 side effect를 실행하지 않는다.
- 검증: `node --test test/phase-03-followup.test.mjs` 통과(6/6). approval/ execution-start journal failure 차단을 포함한다.
- 제한: journal과 외부 side effect의 원자적 exactly-once는 보장하지 않으며, process tree cleanup은 별도 후속 작업이다.
- 상태: 완료. 커밋 `0694fc20521fbf17e1de5c1015f234112069a76f`.
