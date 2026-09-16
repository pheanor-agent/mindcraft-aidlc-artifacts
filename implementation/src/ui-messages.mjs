const STATUS_KO = {
  queued: "대기 중", running: "실행 중", completed: "완료", failed: "실패",
  aborted: "중단됨", interrupted: "비정상 종료", recoverable: "재개 가능", unknown: "확인 필요",
};

export function statusKo(value) { return STATUS_KO[value] ?? value ?? "-"; }

export const ko = Object.freeze({
  title: "MindCraft | 개인 AI 작업 도우미",
  firstRun: "첫 실행 설정이 필요합니다.",
  firstRunHint: "오프라인 리허설은 `setup mock deterministic`, 실제 provider는 `setup airouter <model>`을 입력하세요.",
  commands: "명령: setup <provider> <model> [purpose] | doctor | task <제목> | tasks | use <task-id> | run <요청> | approvals | approve <id> | reject <id> | status | history | runs | resume <run-id> | cancel <run-id> | knowledge [검색어] | promote <id> | quit",
  setupComplete: "첫 실행 설정이 완료되었습니다.",
  doctorOk: "환경 점검이 완료되었습니다.",
  doctorFailed: "환경 점검에 실패했습니다.",
  taskCreated: "작업이 생성되었습니다.",
  taskSelected: "현재 작업을 선택했습니다.",
  runComplete: "실행이 완료되었습니다.",
  approvalPending: "사용자 승인이 필요합니다.",
  approvalAction: "승인하려면 approve <id>, 거부하려면 reject <id>를 입력하세요.",
  cancelled: "실행을 중단했습니다.",
  error: "오류",
});
