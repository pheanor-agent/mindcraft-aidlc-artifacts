# MindCraft Product Metadata — Current Decision Baseline

- Version: decision baseline v1
- Decision source: approved product decisions
- 제품 interface: Pi 기반 terminal TUI
- 1차 검증 환경: Windows Terminal + Node.js/npm
- Linux/WSL/macOS: 별도 compatibility 검토
- Usage model: single user/personal use
- Agent foundation: Pi as the core; reuse Pi's existing interface where suitable

## Product purpose

사용자가 지정한 Model과 Pi 기반 terminal TUI를 통해 코드·문서 분석, 정리, 생성·가공 workflow를 실행한다.

## General use cases

범용 작업을 지원한다. 대표 예시는 다음과 같다.

- 코드 분석 및 구조/문제 요약
- 문서 분석 및 핵심 내용 정리
- 목적에 맞춘 문서 가공·생성
- 반복 작업 결과를 다음 작업에서 재사용

## Workflow and knowledge

- 전체 workflow가 동작해야 한다.
- Task/Episode/Run의 반복 실행과 상태 관리를 지원한다.
- 작업 산출물을 raw data와 메타데이터를 포함한 Knowledge artifact로 가공한다.
- Knowledge artifact를 기반으로 관리·검색·재사용한다.
- 각 작업에서 검색 정확도와 유사도에 따라 관련 Knowledge 일부를 우선 사용한다.
- 적절한 Knowledge가 부족하면 Knowledge 전체 검색 후 파일 전체 검색으로 확장한다.
- 개인용 제품이므로 팀 공유·다중 사용자 권한·실시간 동기화는 현재 범위에서 제외한다.

## Model policy

사용자가 모델을 지정한다.

- 모델 0개: 설정 오류로 실행하지 않는다.
- 모델 1개: 모든 용도에 해당 모델을 사용한다.
- 모델 2개: 용도별로 하나씩 지정한다(예: 분석/고성능, 반복 가공/저비용).
- 동일 용도에 2개 이상의 모델: 허용하지 않는다.
- 자동으로 임의 모델을 추가·선택하지 않는다.
- 실제 작업 시작 전 선택된 모델과 용도를 표시한다.

## Tool and file policy

- 허용된 execution root 내부 read: canonical/realpath 검증 후 허용
- filesystem write: 경로가 허용되어도 명시적 사용자 승인 후 실행
- execution root 외부 파일, `..`, symlink escape: fail-closed 차단
- shell command: allowlist, workspace-bound working directory, timeout과 명시적 사용자 승인 필요
- 승인·거부·실행 결과: session/run history와 audit event에 기록

## Platform policy

- Windows Terminal/호환 terminal 기반 TUI를 1차 제품 대상으로 고려한다.
- Linux/WSL/macOS용 제품 UX는 현재 범위에 포함하지 않는다.
- Pi의 기존 interface를 우선 재사용한다.

## Quality policy

- Security Baseline: 적용
- Property-Based Testing: 상태·권한·routing에 적용
- Resiliency Baseline: checkpoint, 중단, 재개, 실패 복구에 적용
- 정량 기준은 추천 초안을 기준으로 후속 승인한다.
