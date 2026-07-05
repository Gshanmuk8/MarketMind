import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { askStrategist, listMessages } from "@/features/chat/service";

const askSchema = z.object({ message: z.string().min(2).max(2000) });

/** GET /api/chat — the default thread's messages. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await listMessages(user.id));
}

/** POST /api/chat — ask the strategist; grounded answer with citations. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = askSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ask a question (2–2000 characters)." }, { status: 400 });
  }

  try {
    const result = await askStrategist(user.id, parsed.data.message);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[chat]", error);
    return NextResponse.json(
      { error: "The strategist couldn't answer — check that an AI provider key is configured." },
      { status: 502 }
    );
  }
}
