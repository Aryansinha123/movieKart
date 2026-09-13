import { NextResponse } from "next/server";
import { checkAllReleases } from "@/lib/releaseChecker";

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const secretParam = req.nextUrl?.searchParams?.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    // Validate secret if CRON_SECRET is configured
    if (cronSecret) {
      const isBearerValid = authHeader === `Bearer ${cronSecret}`;
      const isParamValid = secretParam === cronSecret;

      if (!isBearerValid && !isParamValid) {
        return NextResponse.json({ success: false, message: "Unauthorized cron access." }, { status: 401 });
      }
    }

    const stats = await checkAllReleases();

    return NextResponse.json({
      success: true,
      message: "Release check completed.",
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron /api/cron/release-check] Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  return GET(req);
}
