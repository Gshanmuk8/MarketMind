import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getSettings, updateSettings } from "@/features/notifications/service";
import { updateSettingsSchema } from "@/features/notifications/types";

/** GET /api/notifications/settings — the user's cross-channel delivery rules. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getSettings(user.id);
  return NextResponse.json({ settings });
}

/** PATCH /api/notifications/settings — timezone, quiet hours, weekend pause. */
export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue ? `${issue.path.join(".") || "request"}: ${issue.message}` : "Invalid settings." },
      { status: 400 }
    );
  }

  const settings = await updateSettings(user.id, parsed.data);
  return NextResponse.json({ settings });
}
