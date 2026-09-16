# Approval Request — First-Run TUI Onboarding

## 상태
**Awaiting explicit team approval**

## 검토 산출물
- `docs/first-run-onboarding-design.md`
- `src/cli.mjs`
- `src/command-queue.mjs`
- `src/tui-runner.mjs`
- `src/mindcraft-app.mjs`
- `test/first-run-onboarding.test.mjs`

## 제안 결정
다음 범위의 구현을 승인해 주세요.

1. 실행 파일 하나로 TUI에 진입한다.
2. 첫 실행에서 Model이 없으면 TUI가 setup 명령을 안내한다.
3. TUI와 non-TUI readline이 동일한 application command dispatcher를 사용한다.
4. setup 완료 즉시 preflight와 runtime을 갱신한다.
5. 기존 workflow/approval/Knowledge 경계를 유지한다.
6. deterministic mock은 오프라인 리허설용으로만 사용한다.

## 승인 선택지
- **Approve & Continue** — 이 vertical slice를 기준선으로 채택하고 Windows Terminal UX 및 반복 실행 검증을 계속 진행
- **Request Changes** — 변경할 정책/UX/범위를 명시
- **Hold** — 추가 제품/모델 정책 결정 전 보류

승인은 GitHub 변경, 배포, credential, 외부 환경 변경을 승인하지 않습니다.
