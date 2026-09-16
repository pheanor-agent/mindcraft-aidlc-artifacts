const api = window.mindcraftDesktop;
document.body.dataset.desktopSlice = "prompt-workflow";
const statusNode = document.createElement("div");
statusNode.id = "desktopStatus";
statusNode.style.cssText = "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:80;max-width:min(720px,90vw);padding:10px 16px;border:1px solid #cfe2d5;border-radius:999px;background:#e8f2eb;color:#1b4d3e;font:12px 'Noto Sans KR',sans-serif;box-shadow:0 4px 12px rgba(19,62,54,.12);opacity:0;transition:opacity .2s";
document.body.append(statusNode);
let renderedTaskId = null;
let statusTimer;
function notify(text, error = false) {
  statusNode.textContent = text;
  statusNode.style.background = error ? "#ffebe6" : "#e8f2eb";
  statusNode.style.color = error ? "#7b2d26" : "#1b4d3e";
  statusNode.style.opacity = "1";
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { statusNode.style.opacity = "0"; }, 3500);
}
function showPromptResult(text, error = false) {
  const node = document.querySelector("[data-purpose='prompt-result']");
  if (!node || !text) return;
  node.textContent = text;
  node.classList.remove("hidden");
  node.classList.toggle("border-[#f0bd8b]", error);
  node.classList.toggle("bg-[#fff8ef]", error);
}
function transcriptHost() {
  const existing = document.querySelector("[data-purpose='desktop-transcript']");
  if (existing) return existing;
  const prompt = document.querySelector("[data-purpose='smart-prompt-input-card']");
  if (!prompt) return null;
  let host = document.getElementById("desktopTranscript");
  if (!host) {
    host = document.createElement("div");
    host.id = "desktopTranscript";
    host.className = "w-full max-h-64 overflow-y-auto rounded-xl border border-[#e2e0d5] bg-white p-3 space-y-2 text-left shadow-sm";
    prompt.parentElement.insertBefore(host, prompt);
  }
  return host;
}
function appendTranscript(text, role = "agent") {
  if (!text) return;
  const host = transcriptHost();
  if (!host) return;
  host.closest("[data-purpose='desktop-transcript-shell']")?.classList.remove("hidden");
  const line = document.createElement("div");
  line.className = role === "user" ? "text-xs text-[#707976]" : "text-xs leading-relaxed text-[#1b1c19] whitespace-pre-wrap";
  line.dataset.role = role;
  line.textContent = `${role === "user" ? "요청" : "Agent"} · ${text}`;
  host.append(line);
  host.scrollTop = host.scrollHeight;
}
function openSettings() {
  let panel = document.getElementById("desktopSettings");
  if (panel) { panel.remove(); return; }
  panel = document.createElement("section");
  panel.id = "desktopSettings";
  panel.className = "fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4";
  panel.innerHTML = `<div class="w-full max-w-md rounded-xl border border-[#e2e0d5] bg-[#faf9f3] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="AI 연결 설정"><div class="flex items-center justify-between mb-4"><h2 class="text-sm font-bold text-[#1b1c19]">AI 연결 설정</h2><button type="button" data-settings-close class="text-[#707976]">닫기</button></div><p class="mb-4 text-[11px] text-[#5c6460]">credential 원문은 Desktop UI에 입력하거나 저장하지 않습니다.</p><form data-settings-form class="space-y-3"><label class="block text-xs font-semibold">Provider<input name="provider" required class="mt-1 w-full rounded-lg border border-[#e2e0d5] bg-white p-2 text-xs" placeholder="mock 또는 provider 이름"></label><label class="block text-xs font-semibold">Model<input name="model" required class="mt-1 w-full rounded-lg border border-[#e2e0d5] bg-white p-2 text-xs" placeholder="model-id"></label><label class="block text-xs font-semibold">Purpose (선택)<input name="purpose" class="mt-1 w-full rounded-lg border border-[#e2e0d5] bg-white p-2 text-xs" placeholder="general"></label><div class="flex justify-end gap-2 pt-2"><button type="button" data-settings-doctor class="rounded-lg border border-[#e2e0d5] bg-white px-3 py-2 text-xs">환경 점검</button><button type="submit" class="rounded-lg bg-[#174d43] px-3 py-2 text-xs font-semibold text-white">설정 저장</button></div></form></div>`;
  document.body.append(panel);
  panel.querySelector("[name='provider']").value = "ollama";
  panel.querySelector("[name='model']").value = "glm-5.3-flash:cloud";
  panel.querySelector("[name='purpose']").value = "general";
  panel.querySelector("[data-settings-close]").addEventListener("click", () => panel.remove());
  panel.querySelector("[data-settings-doctor]").addEventListener("click", async () => { await command("doctor"); });
  panel.querySelector("[data-settings-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const provider = String(data.get("provider") ?? "").trim();
    const model = String(data.get("model") ?? "").trim();
    const purpose = String(data.get("purpose") ?? "").trim();
    await command(`setup ${provider} ${model}${purpose ? ` ${purpose}` : ""}`);
    panel.remove();
  });
}
async function openRecords(title, commandName) {
  let panel = document.getElementById("desktopRecords");
  if (panel) panel.remove();
  panel = document.createElement("section");
  panel.id = "desktopRecords";
  panel.className = "fixed inset-0 z-[65] flex items-center justify-center bg-black/30 p-4";
  panel.innerHTML = `<div class="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl border border-[#e2e0d5] bg-[#faf9f3] shadow-2xl" role="dialog" aria-modal="true"><div class="flex items-center justify-between border-b border-[#e2e0d5] p-4"><h2 class="text-sm font-bold text-[#1b1c19]"></h2><button type="button" data-records-close class="text-xs text-[#707976]">닫기</button></div><pre data-records-body class="max-h-[65vh] overflow-auto whitespace-pre-wrap p-4 text-xs leading-relaxed text-[#1b1c19]">불러오는 중...</pre></div>`;
  document.body.append(panel);
  panel.querySelector("h2").textContent = title;
  panel.querySelector("[data-records-close]").addEventListener("click", () => panel.remove());
  try {
    const result = await api.command(commandName);
    const body = result?.error ? `오류: ${result.error.message}` : result?.result;
    const target = panel.querySelector("[data-records-body]");
    if (commandName === "knowledge" && Array.isArray(body)) {
      target.replaceChildren();
      if (!body.length) target.textContent = "Knowledge 자료가 없습니다.";
      for (const item of body) {
        const card = document.createElement("article");
        card.className = "mb-3 rounded-lg border border-[#e2e0d5] bg-white p-3";
        const summary = document.createElement("div");
        summary.textContent = `${item.id} · ${item.state} · ${item.provenance?.source ?? "unknown"}`;
        card.append(summary);
        const detail = document.createElement("p");
        detail.className = "mt-1 whitespace-pre-wrap text-[#5c6460]";
        detail.textContent = item.content ?? "내용 미리보기 없음";
        card.append(detail);
        const actions = document.createElement("div");
        actions.className = "mt-2 flex gap-2";
        for (const [label, action] of [["상세", `knowledge-detail ${item.id}`], ["미리보기", `preview ${item.content ?? item.id}`], ...(item.state === "candidate" ? [["승격", `promote ${item.id}`], ["거부", `reject-knowledge ${item.id}`]] : [])]) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "rounded border border-[#e2e0d5] px-2 py-1 text-[10px] text-[#1b4d3e]";
          button.textContent = label;
          button.addEventListener("click", async () => { await command(action); await openRecords(title, commandName); });
          actions.append(button);
        }
        card.append(actions);
        target.append(card);
      }
    } else target.textContent = typeof body === "string" ? body : JSON.stringify(body ?? [], null, 2);
  } catch (error) { panel.querySelector("[data-records-body]").textContent = `오류: ${error.message}`; }
}
function taskHost() {
  const heading = [...document.querySelectorAll("h2")].find((node) => node.textContent.includes("TASKS"));
  return heading?.parentElement?.nextElementSibling ?? null;
}
function renderTasks(tasks) {
  const host = taskHost();
  if (!host) return;
  host.replaceChildren();
  for (const task of tasks) {
    const link = document.createElement("a");
    link.href = "#";
    link.dataset.taskId = task.id;
    link.className = "block px-3 py-2.5 rounded-xl hover:bg-[#1a4f45]/60 text-[#c5ddd6] hover:text-white transition-colors";
    link.innerHTML = `<div class="flex items-center space-x-2 mb-1"><span class="w-1.5 h-1.5 rounded-full bg-[#95d4b3] shrink-0"></span><span class="text-xs font-semibold truncate text-white"></span></div><div class="flex items-center justify-between text-[10px] text-[#aeeecb] pl-3.5"><span>${task.status ?? "active"}</span><span class="font-mono text-[#88bdb0]">${task.id.slice(0, 8)}</span></div>`;
    link.querySelector(".text-xs") .textContent = task.title;
    link.addEventListener("click", async (event) => { event.preventDefault(); await command(`use ${task.id}`); setActiveTaskTitle(task.title); });
    host.append(link);
  }
  const count = taskHost()?.previousElementSibling?.querySelector("span.font-mono");
  if (count) count.textContent = `${tasks.length}건`;
}
function setActiveTaskTitle(title) {
  const heading = document.querySelector("[data-purpose='active-task-title']");
  if (heading && title) heading.textContent = title;
}
function openNewTaskDialog() {
  let panel = document.getElementById("desktopNewTask");
  if (panel) return panel.querySelector("input")?.focus();
  panel = document.createElement("section");
  panel.id = "desktopNewTask";
  panel.className = "fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4";
  panel.innerHTML = `<div class="w-full max-w-md rounded-xl border border-[#e2e0d5] bg-[#faf9f3] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="새 작업"><div class="mb-4 flex items-center justify-between"><h2 class="text-sm font-bold">새 작업 시작</h2><button type="button" data-task-close class="text-xs text-[#707976]">닫기</button></div><form data-task-form><label class="block text-xs font-semibold">작업 제목<input name="title" required autofocus class="mt-1 w-full rounded-lg border border-[#e2e0d5] bg-white p-2 text-xs" placeholder="예: 배포 체크리스트 검토"></label><div class="mt-4 flex justify-end gap-2"><button type="button" data-task-close class="rounded-lg border border-[#e2e0d5] bg-white px-3 py-2 text-xs">취소</button><button type="submit" class="rounded-lg bg-[#174d43] px-3 py-2 text-xs font-semibold text-white">작업 생성</button></div></form></div>`;
  document.body.append(panel);
  panel.querySelectorAll("[data-task-close]").forEach((button) => button.addEventListener("click", () => panel.remove()));
  panel.querySelector("[data-task-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = String(new FormData(event.currentTarget).get("title") ?? "").trim();
    if (!title) return;
    const result = await command(`task ${title}`);
    if (!result?.error) { setActiveTaskTitle(title); panel.remove(); notify("새 작업이 생성되었습니다."); }
  });
  panel.querySelector("input")?.focus();
}
function renderHistory(snapshot) {
  const taskId = snapshot.status?.task?.id ?? null;
  if (taskId === renderedTaskId) return;
  renderedTaskId = taskId;
  const host = transcriptHost();
  if (!host) return;
  host.replaceChildren();
  const records = snapshot.history ?? [];
  for (const record of records) {
    const label = record.kind === "run" ? `Run · ${record.status ?? "unknown"}` : `${record.kind ?? "event"} · ${record.type ?? "record"}`;
    appendTranscript(label, "agent");
  }
  if (records.length) document.querySelector("[data-purpose='desktop-transcript-shell']")?.classList.remove("hidden");
}
function renderWorkflow(snapshot) {
  const pipeline = document.querySelector("[data-purpose='stepper-pipeline']");
  if (!pipeline) return;
  const runs = snapshot.status?.runs ?? [];
  const run = runs.at(-1) ?? null;
  let live = document.getElementById("desktopLiveWorkflow");
  if (!live) {
    live = document.createElement("div");
    live.id = "desktopLiveWorkflow";
    live.className = "mx-4 mb-2 rounded-lg border border-[#cfe2d5] bg-[#e8f2eb] p-2.5 text-[11px] text-[#1b4d3e]";
    pipeline.parentElement.insertBefore(live, pipeline);
  }
  const status = run?.status ?? "idle";
  const labels = { running: "실행 중", queued: "실행 대기", completed: "완료", failed: "실패", aborted: "중단", recoverable: "복구 가능", unknown: "상태 확인 필요" };
  const stage = status === "completed" ? 4 : ["failed", "aborted", "unknown", "recoverable"].includes(status) ? 3 : status === "idle" ? 0 : 2;
  const steps = [...pipeline.querySelectorAll("h3")].filter((node) => /^[1-4]\\./.test(node.textContent.trim()));
  for (const step of steps) {
    const number = Number(step.textContent.trim()[0]);
    const state = number < stage || status === "completed" ? "완료" : number === stage ? (status === "failed" ? "실패" : status === "aborted" ? "중단" : "진행") : "대기";
    const row = step.parentElement;
    const marker = row?.parentElement?.querySelector(".absolute");
    const value = row?.querySelector("span:last-child");
    if (value) value.textContent = state;
    if (marker) marker.textContent = state === "완료" ? "✓" : String(number);
    step.dataset.stepState = state;
  }
  const runIdNode = [...document.querySelectorAll("p.font-mono")].find((node) => node.textContent.includes("실행 ID:"));
  if (runIdNode) runIdNode.textContent = `실행 ID: ${run?.id ?? "-"}`;
  live.replaceChildren();
  const summary = document.createElement("span");
  summary.textContent = `실시간 Run · ${labels[status] ?? status}${run?.id ? ` · ${run.id.slice(0, 8)}` : ""}`;
  live.append(summary);
  if (run?.id && ["running", "queued"].includes(status)) {
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "ml-2 rounded border border-[#d9a08f] bg-white px-2 py-1 text-[10px] text-[#7b2d26]";
    cancel.textContent = "실행 중단";
    cancel.addEventListener("click", async () => { await command(`cancel ${run.id}`); });
    live.append(cancel);
  }
  if (run?.id && status === "recoverable") {
    const resume = document.createElement("button");
    resume.type = "button";
    resume.className = "ml-2 rounded border border-[#cfe2d5] bg-white px-2 py-1 text-[10px] text-[#1b4d3e]";
    resume.textContent = "실행 재개";
    resume.addEventListener("click", async () => { await command(`resume ${run.id}`); });
    live.append(resume);
  }
  live.dataset.runStatus = status;
  pipeline.dataset.runStatus = status;
  const gate = snapshot.approvals?.find((item) => item.status === "pending");
  pipeline.dataset.approvalPending = gate ? "true" : "false";
  let approval = document.getElementById("desktopApprovalDetails");
  if (!approval) {
    approval = document.createElement("div");
    approval.id = "desktopApprovalDetails";
    approval.className = "mx-4 mb-2 rounded-lg border border-[#f0bd8b] bg-[#fff8ef] p-3 text-[11px] text-[#603d16]";
    pipeline.insertBefore(approval, pipeline.firstChild);
  }
  if (!gate) {
    approval.textContent = "Human Gate · 현재 승인 대기 요청 없음";
    approval.dataset.approvalStatus = "idle";
  } else {
    const request = gate.request ?? {};
    const target = request.path ?? request.command ?? request.kind ?? "알 수 없는 작업";
    const args = request.args?.length ? ` ${request.args.join(" ")}` : "";
    const metadata = [
      `승인 ID: ${gate.id}`,
      `종류: ${request.kind ?? "unknown"}`,
      `대상: ${target}${args}`,
      request.cwd ? `workspace: ${request.cwd}` : null,
      request.contentChars != null ? `변경 크기: ${request.contentChars} chars` : null,
      request.changeType ? `변경 유형: ${request.changeType}` : null,
      request.contentDigest ? `digest: ${request.contentDigest.slice(0, 12)}…` : null,
    ].filter(Boolean);
    approval.replaceChildren();
    const heading = document.createElement("strong");
    heading.textContent = "Human Gate · 승인 대기";
    approval.append(heading);
    for (const value of metadata) { const row = document.createElement("div"); row.textContent = value; approval.append(row); }
    const actions = document.createElement("div"); actions.className = "mt-2 flex gap-2";
    for (const [label, commandName, className] of [["승인", "approve", "border-[#9bc7aa] text-[#1b4d3e]"], ["거부", "reject", "border-[#d9a08f] text-[#7b2d26]"]]) {
      const button = document.createElement("button"); button.type = "button"; button.className = `rounded border bg-white px-2 py-1 text-[10px] ${className}`; button.textContent = label;
      button.addEventListener("click", async () => { button.disabled = true; await command(`${commandName} ${gate.id}`); renderSnapshot(await api.snapshot()); }); actions.append(button);
    }
    approval.append(actions);
    approval.dataset.approvalStatus = gate.status;
  }
  const metrics = document.querySelector("[data-purpose='sandbox-metrics']");
  if (!metrics) return;
  let liveMetrics = document.getElementById("desktopRunMetrics");
  if (!liveMetrics) {
    liveMetrics = document.createElement("div");
    liveMetrics.id = "desktopRunMetrics";
    liveMetrics.className = "mt-2 rounded-lg border border-[#e2e0d5] bg-white p-2.5 text-[10px] text-[#5c6460] space-y-1";
    metrics.prepend(liveMetrics);
  }
  const knowledge = run?.knowledge ?? {};
  liveMetrics.replaceChildren();
  const title = document.createElement("strong");
  title.className = "text-[#1b1c19]";
  title.textContent = "Desktop 실시간 Run 상세";
  liveMetrics.append(title);
  for (const [label, value] of [["Model", run?.model ?? snapshot.boot?.model ?? "-"], ["마지막 event", run?.latestEvent ?? "-"], ["Knowledge", knowledge.manifest?.length ? `${knowledge.manifest.length}개 참조` : "참조 없음"], ["오류", run?.error ?? "없음"]]) {
    const row = document.createElement("div");
    row.textContent = `${label}: ${value}`;
    liveMetrics.append(row);
  }
}
function renderSnapshot(snapshot) {
  const tasks = snapshot.tasks ?? [];
  const hasTasks = tasks.length > 0;
  for (const selector of ["[data-purpose='welcome-icon']", "[data-purpose='welcome-description']", "[data-purpose='quick-recommendations']"]) {
    document.querySelector(selector)?.classList.toggle("hidden", hasTasks);
  }
  const model = snapshot.boot?.model ?? snapshot.status?.model;
  const modelPill = document.querySelector("[data-purpose='active-model-pill'] span.font-medium");
  if (modelPill) modelPill.textContent = model ?? "Mock/Local Model";
  renderHistory(snapshot);
  renderTasks(tasks);
  renderWorkflow(snapshot);
  if (snapshot.status?.activeRun?.status) notify(`실행 상태: ${snapshot.status.activeRun.status}`);
}
async function command(raw) {
  try {
    const result = await api.command(raw);
    if (result?.error) { notify(result.error.message ?? "명령을 처리하지 못했습니다.", true); showPromptResult(`오류 · ${result.error.message ?? "명령을 처리하지 못했습니다."}`, true); }
    else if (result?.command) notify(`${result.command} 완료`);
    if (result?.text) { appendTranscript(result.text); showPromptResult(result.text); }
    else if (result?.result?.text) showPromptResult(result.result.text);
    else if (result?.result && raw.startsWith("run ")) showPromptResult(typeof result.result === "string" ? result.result : JSON.stringify(result.result, null, 2));
    renderSnapshot(await api.snapshot());
    return result;
  } catch (error) { notify(error.message, true); return { error }; }
}
function findButton(label) { return [...document.querySelectorAll("button")].find((node) => node.textContent.includes(label)); }

api.onEvent((payload) => {
  if (payload.type === "output") { notify(payload.text); appendTranscript(payload.text); }
  if (payload.type === "core-event") {
    const event = payload.event ?? {};
    const sessionStatus = document.querySelector("[data-purpose='desktop-session-status']");
    if (sessionStatus) sessionStatus.textContent = event.type ?? "event";
    if (event.type) showPromptResult(`실행 상태 · ${event.type}${event.text ? `\n${event.text}` : ""}`, event.type === "error");
    if (event.text || event.type) appendTranscript(event.text ?? `Core event: ${event.type}`);
    if (event.type === "tool_decision" || event.type === "tool_execution_started" || event.type === "tool_execution_result") void api.snapshot().then(renderSnapshot).catch(() => {});
  }
  if (payload.type === "core-event" && payload.event?.type === "tool_decision" && payload.event.status === "pending") notify("사용자 승인 대기 중");
});

async function initializeDesktop() {
  try { const boot = await api.boot(); notify(`Desktop 코어 연결됨 · ${boot.mode}`); renderSnapshot(await api.snapshot()); }
  catch (error) { notify(error.message, true); }
  const newTask = document.querySelector("[data-desktop-action='new-task']");
  newTask?.addEventListener("click", (event) => { event.preventDefault(); openNewTaskDialog(); });
  const run = document.querySelector("[data-desktop-action='run']");
  run?.addEventListener("click", async (event) => { event.preventDefault(); if (run.disabled) return; const input = document.querySelector("[data-purpose='smart-prompt-input-card'] textarea"); const prompt = input?.value.trim(); if (!prompt) return notify("실행할 요청을 입력해 주세요.", true); run.disabled = true; run.classList.add("opacity-60", "cursor-wait"); showPromptResult("실행 준비 중…"); try { const before = await api.snapshot(); const selected = before.status?.task ?? null; if (!selected) { const existing = before.tasks?.[0]; if (existing) { await command(`use ${existing.id}`); setActiveTaskTitle(existing.title); } else await command("task Desktop 작업"); } appendTranscript(prompt, "user"); const searchMatch = prompt.match(/^(?:검색|search)\s+(.+)/iu); const result = await command(searchMatch ? `knowledge ${searchMatch[1]}` : `run ${prompt}`); if (result?.error) return; input.value = ""; } finally { run.disabled = false; run.classList.remove("opacity-60", "cursor-wait"); } });
  const promptInput = document.querySelector("[data-purpose='smart-prompt-input-card'] textarea");
  promptInput?.addEventListener("keydown", (event) => { if (event.key === "Enter" && event.shiftKey) { event.preventDefault(); run?.click(); } });
  document.querySelectorAll("[data-purpose='quick-recommendations'] button").forEach((chip) => chip.addEventListener("click", () => { const input = document.querySelector("textarea"); if (input) { input.value = `${input.value}${input.value ? "\\n" : ""}${chip.textContent.trim()}`; input.focus(); } }));
  const search = document.querySelector("[data-purpose='global-knowledge-search'] input");
  search?.addEventListener("keydown", async (event) => { if (event.key === "Enter" && search.value.trim()) await command(`knowledge ${search.value.trim()}`); });
  document.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); search?.focus(); } if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") { event.preventDefault(); newTask?.click(); } });
  const settings = document.querySelector("[data-desktop-action='settings']");
  settings?.addEventListener("click", (event) => { event.preventDefault(); openSettings(); });
  const history = [...document.querySelectorAll("a")].find((node) => node.textContent.includes("작업 기록"));
  history?.addEventListener("click", (event) => { event.preventDefault(); void openRecords("작업 기록", "history"); });
  const knowledge = [...document.querySelectorAll("a")].find((node) => node.textContent.includes("자료함"));
  knowledge?.addEventListener("click", (event) => { event.preventDefault(); void openRecords("Knowledge 자료함", "knowledge"); });
  const runs = [...document.querySelectorAll("a")].find((node) => node.textContent.includes("실행 기록"));
  runs?.addEventListener("click", (event) => { event.preventDefault(); void openRecords("Run 기록", "runs"); });

  const approve = findButton("간편 검토 및 승인 저장"); approve?.addEventListener("click", async () => { const snapshot = await api.snapshot(); const pending = snapshot.approvals?.[0]; if (pending) await command(`approve ${pending.id}`); else notify("대기 중인 승인이 없습니다.", true); });
  const reject = findButton("수정 요청"); reject?.addEventListener("click", async () => { const snapshot = await api.snapshot(); const pending = snapshot.approvals?.[0]; if (pending) await command(`reject ${pending.id}`); else notify("대기 중인 승인이 없습니다.", true); });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void initializeDesktop(), { once: true });
else void initializeDesktop();
