import { NextResponse } from "next/server";

const endpoint = process.env.OLLAMA_CLOUD_ENDPOINT ?? "https://ollama.com/v1";
const model = process.env.OLLAMA_CLOUD_MODEL ?? "glm-5.3-flash:cloud";

function configuredKey() {
  return [process.env.OLLAMA_API_KEY, process.env.OLLAMA_CLOUD_API_KEY].map((value) => value?.trim()).find(Boolean);
}

export async function GET() {
  const hasKey = Boolean(configuredKey());
  return NextResponse.json({ ok: hasKey, provider: "ollama", model, status: hasKey ? "configured" : "credential missing" });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const key = configuredKey();
  console.info(`[ollama:${requestId}] start`, { endpoint: new URL(endpoint).host, model, credential: Boolean(key) });
  if (!key) {
    console.warn(`[ollama:${requestId}] credential missing`);
    return NextResponse.json({ requestId, error: "Ollama Cloud credential missing", status: "credential missing" }, { status: 503 });
  }
  let body: { prompt?: string; taskId?: string };
  try { body = await request.json() as { prompt?: string; taskId?: string }; } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  const prompt = body.prompt?.trim();
  if (!prompt) return NextResponse.json({ requestId, error: "prompt is required" }, { status: 400 });
  console.info(`[ollama:${requestId}] request`, { promptLength: prompt.length, taskId: body.taskId ? "present" : "missing" });
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let response: Response;
    try {
      response = await fetch(`${endpoint.replace(/\/$/, "")}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], stream: false }), signal: controller.signal });
    } finally { clearTimeout(timeout); }
    const payload = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } | string };
    if (!response.ok) {
      const upstream = typeof payload.error === "string" ? payload.error : payload.error?.message;
      const detail = upstream ? ` · ${String(upstream).slice(0, 240)}` : "";
      console.error(`[ollama:${requestId}] upstream error`, { httpStatus: response.status, detail: upstream ? String(upstream).slice(0, 240) : "empty response" });
      const status = response.status === 401 || response.status === 403 ? "credential rejected" : response.status === 404 ? "model or endpoint not found" : response.status === 429 ? "rate limited" : "connection failed";
      return NextResponse.json({ requestId, error: `Ollama Cloud ${status}${detail}`, status }, { status: 502 });
    }
    console.info(`[ollama:${requestId}] success`, { httpStatus: response.status });
    return NextResponse.json({ requestId, taskId: body.taskId ?? null, runId: crypto.randomUUID(), status: "completed", result: payload.choices?.[0]?.message?.content ?? "Ollama Cloud가 빈 응답을 반환했습니다.", provider: "ollama", model, connection: "live ready" });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Ollama Cloud request timed out" : "Ollama Cloud connection failed";
    console.error(`[ollama:${requestId}] request failed`, { message });
    return NextResponse.json({ requestId, error: message, status: "connection failed" }, { status: 502 });
  }
}
