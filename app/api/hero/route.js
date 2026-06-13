import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import User from "@/models/User";
import { buildHeroSlides } from "@/lib/heroSlides";

export async function GET(req) {
  try {
    let preferredLanguages = [];

    const userData = getUserFromToken(req);
    if (userData?.id) {
      await connectDB();
      const user = await User.findById(userData.id).select("preferredLanguages").lean();
      preferredLanguages = user?.preferredLanguages || [];
    }

    const slides = await buildHeroSlides(preferredLanguages);

    return NextResponse.json({ success: true, slides });
  } catch (error) {
    console.error("Hero API error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load hero slides.", slides: [] },
      { status: 502 }
    );
  }
}
