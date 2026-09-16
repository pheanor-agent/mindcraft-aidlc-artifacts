# MindCraft 개선 작업 현황

기준 인계: 2026-09-08 사용자 시나리오 검증 보고서
최종 확인: 2026-09-08

## 전체 상태 요약

| 범위 | 상태 |
|---|---|
| MC-01~MC-04 | 구현·테스트·문서·독립 커밋 완료 |
| MC-05~MC-11 | 구현·회귀 테스트·관련 문서·커밋 완료 |
| MC-12 | 코드상 portability 수정 및 Linux 검증 완료; Windows Node 22/24·native 권한 검증 미실행 |
| MC-13 | 안내 문구 및 TUI 상태 관련 개선 완료; 전체 UX 재설계 acceptance는 별도 후속 범위 |

## 항목별 상태

| 작업 | 우선순위 | 상태 | 커밋/검증 |
|---|---:|---|---|
| MC-01 손상 journal 복구·쓰기 차단 | P1 | 완료 | `f8f944d`; journal repair 회귀 통과 |
| MC-02 실행 중 command 취소 | P1 | 완료 | `427fc1c`; process-tree 취소 회귀 통과 |
| MC-03 Provider contract/preflight 정합성 | P1 | 완료 | `783d2be`; provider/preflight 테스트 통과 |
| MC-04 Knowledge 경로 경계 | P1 | 완료 | `fee2e85`; POSIX/Windows traversal 테스트 통과 |
| MC-05 CLI 하위 옵션·도움말 | P2 | 완료 | `6c03de0`; CLI subprocess 및 parser 테스트 통과 |
| MC-06 workspace/doctor 일관성 | P2 | 완료 | `ced1b38`; 다른 cwd의 `--workspace` doctor subprocess 통과 |
| MC-07 저장 mock 설정 재시작 | P2 | 완료 | `31397f6`; 저장 registry 기반 mode 선택 반영 |
| MC-08 TUI 최종 Run 상태 | P2 | 완료 | `31397f6`; TUI 상태 테스트 및 build 통과 |
| MC-09 TUI 읽기 명령 응답성 | P2 | 완료 | `31397f6`; queue busy 중 approvals/status 회귀 통과 |
| MC-10 승인 정보 표시 | P2 | 완료 | `31397f6`, `2c81df8`; 요약 호환성과 구조 metadata 검증 |
| MC-11 문서 증거 인덱스 | P2 | 완료 | `f7e5fd7`; Pages build/check 통과 |
| MC-12 Windows 회귀 테스트 환경 | P2 | 부분 완료 | `2c81df8`; `fileURLToPath` 수정 및 Linux 검증. Windows native 검증 필요 |
| MC-13 첫 실행·상태 UX | P3 | 범위 내 완료 | `2c81df8`, `31397f6`; commands 안내와 TUI 최종 상태 반영 |

## 최종 검증

- `npm test`: 169 passed / 0 failed
- `npm run build`: 통과
- Pages build/check: 통과, 101 HTML pages, local href/src 대상 확인
- `git diff --check`: 통과

## 미검증 및 범위 제외

- 실제 외부 provider 호출·credential 검증
- Windows Node 22/24 실환경 및 Windows Terminal/ConPTY native 검증
- symlink/junction 권한 차이를 포함한 Windows 보안 검증
- native EXE/NSIS 빌드·업데이트·삭제·서명
- 장시간 soak 및 정량 메모리 시험

위 항목은 성공으로 표시하지 않으며 별도 환경에서 재검증해야 한다. 기존 미추적 사용자 파일은 커밋하지 않았다.

각 작업은 코드 변경과 별도로 작업 workflow의 조사/설계/검증 문서에 결과를 남겼다.
