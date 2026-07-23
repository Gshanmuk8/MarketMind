import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { answerMarketQuestion } from "@/features/ask/service";

// One grounded AI call — give it room beyond the serverless default.
export const maxDuration = 30;

/** POST /api/ask — a one-shot, grounded answer to a market question. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (question.length < 2) {
    return NextResponse.json({ error: "Ask a question about your market." }, { status: 400 });
  }

  try {
    const result = await answerMarketQuestion(user.id, question.slice(0, 500));
    return NextResponse.json(result);
  } catch (error) {
    console.error("[ask] answer failed:", error);
    return NextResponse.json(
      { error: "Couldn't answer that right now — the intelligence engine is busy. Try again in a moment." },
      { status: 502 }
    );
  }
}
