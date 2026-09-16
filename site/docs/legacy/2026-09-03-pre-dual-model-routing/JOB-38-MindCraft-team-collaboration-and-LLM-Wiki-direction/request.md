# JOB-38: MindCraft 팀 협업 및 LLM Wiki 방향 반영

> Historical note: 이 문서는 2026-09-03 이전의 개념 검토 기록이다. 당시의 `AI-DLC workspace` 표현은 현재 기준에서 폐기되었다. AI-DLC는 MindCraft 런타임이 아니라 MindCraft 개발·검증에 사용한 외부 방법론이다. 이 문서는 현재 SSOT가 아니다.

## 요청 (원문)
> 해당 프로젝트는 개인을 위한 툴이 아닌 팀을 위한 툴로 "협업" 관점에서 어떻게 더 효율적으로 시너지를 낼 수 있는지 고민
> 저장되는 지식 정보를 관련도 순으로 묶고 LLM Wiki처럼 TUI로 정리
> 사용자 관점에서 직관적이고 편하게 사용 가능한 형태로 구현

## 목표

MindCraft를 개인용 AI 실행 도구가 아닌 팀 협업형 AI-DLC workspace로 명확히 정의하고, 관련도 기반 LLM Wiki와 직관적인 TUI/UX를 이후 구현의 핵심 기준으로 삼는다.

## 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|---|---|---|---|
| R1 | 팀 공유 workflow와 협업 효율을 제품 방향에 반영 | P0 | 완료 |
| R2 | Knowledge를 관련도·신뢰도·provenance 중심으로 LLM Wiki화 | P0 | 방향/ToDo 반영 |
| R3 | TUI에서 Knowledge 검색·필터·상세·연결 관계·승인 흐름 제공 | P0 | ToDo 등록 |
| R4 | 현재 상태와 다음 행동이 명확한 직관적 UX | P0 | 방향/ToDo 반영 |
| R5 | 해커톤 심사 기준에 따른 자체 심사와 피드백 루프 유지 | P1 | 기존 문서 연계 |

## 범위

- 포함:
  - `HACKATHON.md`에 제품 방향과 우선순위 추가
  - `TODO.md`에 팀 협업, LLM Wiki TUI, UX, 검증 ToDo 추가
  - `README.md`에 핵심 방향과 관련 문서 링크 추가
- 제외:
  - 이번 작업에서 실제 TUI 기능 구현
  - Knowledge ranking 알고리즘 구현
  - 팀 계정/권한 backend 구현

## 산출물

- `/opt/data/workspace/mindcraft/HACKATHON.md`
- `/opt/data/workspace/mindcraft/TODO.md`
- `/opt/data/workspace/mindcraft/README.md`

## 피드백 이력

- 사용자 추가 요구사항을 반영해 개인용 도구 관점을 제거하고 팀 협업 관점으로 수정함.
- 관련도 기반 LLM Wiki TUI와 직관적인 사용자 경험을 P0 ToDo로 승격함.
