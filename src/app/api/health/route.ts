import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Liveness + database reachability — the first thing to check on any deploy. */
export async function GET() {
  let database = "ok";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (error) {
    // Unauthenticated endpoint — log the detail, never return it (connection
    // strings and hostnames leak infra topology).
    console.error("[health] database unreachable:", error);
    database = "error";
  }
  const healthy = database === "ok";
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", service: "marketmind-ai", database },
    { status: healthy ? 200 : 503 }
  );
}
