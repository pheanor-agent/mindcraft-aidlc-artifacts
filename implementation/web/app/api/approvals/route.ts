import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: { runId?: string; decision?: string; prompt?: string };
  try { body = await request.json() as { runId?: string; decision?: string; prompt?: string }; } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  if (!body.runId || !body.decision) return NextResponse.json({ error: "runId and decision are required" }, { status: 400 });
  if (body.decision !== "approve" && body.decision !== "reject") return NextResponse.json({ error: "decision must be approve or reject" }, { status: 400 });
  const approved = body.decision === "approve";
  return NextResponse.json({ runId: body.runId, status: approved ? "completed" : "rejected", result: approved ? `승인 후 실행 완료 · ${body.prompt ?? "요청"}` : "사용자가 실행을 거부했습니다.", decision: body.decision });
}
