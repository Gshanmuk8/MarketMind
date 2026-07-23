import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { availableChannelTypes } from "@/features/notifications/delivery";
import { createChannel, LimitError, listChannels } from "@/features/notifications/service";
import { createChannelSchema } from "@/features/notifications/types";

/** GET /api/notifications — the user's channels + which types can be added. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channels = await listChannels(user.id);
  return NextResponse.json({ channels, available: availableChannelTypes() });
}

/** POST /api/notifications — add an email or telegram channel. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createChannelSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue ? `${issue.path.join(".") || "request"}: ${issue.message}` : "Invalid channel." },
      { status: 400 }
    );
  }

  if (!availableChannelTypes().includes(parsed.data.type)) {
    return NextResponse.json(
      { error: `${parsed.data.type.toLowerCase()} delivery isn't configured on the server.` },
      { status: 400 }
    );
  }

  try {
    const channel = await createChannel(user.id, parsed.data);
    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    if (error instanceof LimitError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
