import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";

export async function GET() {
  try {
    if (!env.HUB_API_URL) {
      return NextResponse.json(
        { status: "error", api: "hub-api-not-configured" },
        { status: 503 },
      );
    }
    const res = await fetch(`${env.HUB_API_URL}/db-ping`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { status: "error", api: "hub-api-unhealthy" },
        { status: 503 },
      );
    }
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch {
    return NextResponse.json({ status: "error", db: "disconnected" }, { status: 503 });
  }
}
