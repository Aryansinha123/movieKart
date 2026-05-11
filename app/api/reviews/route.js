import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Review from "@/models/Review";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const movieIdRaw = searchParams.get("movieId");
    const movieId = Number(movieIdRaw);

    if (!movieIdRaw || !Number.isFinite(movieId)) {
      return NextResponse.json(
        { success: false, message: "movieId query param is required." },
        { status: 400 }
      );
    }

    const reviews = await Review.find({ movieId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ success: true, reviews });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    const movieId = Number(body?.movieId);
    const rating = Number(body?.rating);
    const comment = (body?.comment || "").toString().trim();

    if (!Number.isFinite(movieId)) {
      return NextResponse.json(
        { success: false, message: "movieId must be a number." },
        { status: 400 }
      );
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: "rating must be between 1 and 5." },
        { status: 400 }
      );
    }
    if (comment.length > 1000) {
      return NextResponse.json(
        { success: false, message: "comment must be <= 1000 characters." },
        { status: 400 }
      );
    }

    const username = userData?.username || userData?.email || "User";

    // One review per user per movie (upsert).
    const review = await Review.findOneAndUpdate(
      { movieId, userId: userData.id },
      { movieId, userId: userData.id, username, rating, comment },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ success: true, review });
  } catch (error) {
    const isDuplicate = error?.code === 11000;
    return NextResponse.json(
      { success: false, message: isDuplicate ? "Duplicate review." : error.message },
      { status: 500 }
    );
  }
}

