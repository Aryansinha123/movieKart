import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import { buildHomeDashboard } from "@/lib/homeDashboardData";

/**
 * GET /api/home-dashboard
 * Personalized discovery payload for the homepage dashboard.
 */
export async function GET(req) {
  try {
    await connectDB();

    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = await buildHomeDashboard(userData.id);
    if (!payload) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...payload });
  } catch (error) {
    console.error("home-dashboard", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
