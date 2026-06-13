import { NextResponse } from "next/server";
import { getLiveSportsData } from "@/lib/sports";

export async function GET() {
  try {
    const matches = getLiveSportsData();
    return NextResponse.json({ success: true, matches });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load sports data." },
      { status: 500 }
    );
  }
}
