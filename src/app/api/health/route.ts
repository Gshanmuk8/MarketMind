import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Liveness + database reachability — the first thing to check on any deploy. */
export async function GET() {
  let database = "ok";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (error) {
    database = `error: ${
      error instanceof Error ? error.message.replace(/\s+/g, " ").trim().slice(0, 220) : "unknown"
    }`;
  }
  return NextResponse.json(
    { status: "ok", service: "marketmind-ai", database },
    { status: database === "ok" ? 200 : 503 }
  );
}
