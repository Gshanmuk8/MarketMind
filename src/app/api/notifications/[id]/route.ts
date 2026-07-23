import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import {
  deleteChannel,
  NotFoundError,
  sendTest,
  updateChannel,
  ValidationError,
} from "@/features/notifications/service";
import { updateChannelSchema } from "@/features/notifications/types";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.union([
  z.object({ action: z.literal("test") }),
  updateChannelSchema,
]);

/** PATCH /api/notifications/:id — toggle/update, or { action: "test" } to send a test. */
export async function PATCH(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if ("action" in parsed.data) {
      const result = await sendTest(user.id, id);
      return NextResponse.json(
        result.ok
          ? { ok: true }
          : { error: "Test send failed — check the address/chat id and try again." },
        { status: result.ok ? 200 : 502 }
      );
    }
    const channel = await updateChannel(user.id, id, parsed.data);
    return NextResponse.json({ channel });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

/** DELETE /api/notifications/:id */
export async function DELETE(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    await deleteChannel(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
