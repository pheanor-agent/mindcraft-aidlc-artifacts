# JOB-40: 바이브 코딩 지원형 자동 개입 및 Routing 방향 반영

## 요청 (원문)
> 사용자가 바이브 코딩 형식으로 진행하여도 적절하게 해당 시스템이 개입 및 CLI를 연결하여 효율성을 높여 줬으면 좋겠다.

## 목표

사용자가 정해진 `task`/`run` 명령이나 고정된 workflow를 따르지 않고 자유롭게 바이브 코딩을 하더라도, MindCraft가 작업 맥락을 파악해 필요한 시점에만 적절한 CLI·Provider·Model·Knowledge를 제안하거나 연결하는 방향을 정의한다.

## 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|---|---|---|---|
| R1 | 바이브 코딩 맥락과 작업 의도를 감지 | P2 | 방향/ToDo 반영 |
| R2 | 자연어 기반 Task 자동 생성 또는 기존 Task 연결 | P2 | ToDo 등록 |
| R3 | 상황 기반 CLI/Provider/Model routing 제안 | P2 | ToDo 등록 |
| R4 | 자연어 기반 Run 실행 지원 | P2 | ToDo 등록 |
| R5 | 필요한 순간에만 개입하고 사용자가 무시·수동 전환 가능 | P2 | 원칙 반영 |
| R6 | 위험 동작은 자동 실행하지 않고 승인 및 fallback 적용 | P2 | 원칙/ToDo 반영 |

## 범위

- 포함:
  - 바이브 코딩과 자연스러운 개입 원칙을 `HACKATHON.md`에 기록
  - P2 자동 개입 및 routing ToDo를 `TODO.md`에 기록
  - README에 제품 방향 요약 추가
- 제외:
  - 이번 작업에서 실제 의도 분석기 구현
  - Provider/Model router 구현
  - 자연어 기반 자동 실행 구현

## 산출물

- `/opt/data/workspace/mindcraft/HACKATHON.md`
- `/opt/data/workspace/mindcraft/TODO.md`
- `/opt/data/workspace/mindcraft/README.md`
