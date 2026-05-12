import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Review from "@/models/Review";
import ReviewLike from "@/models/ReviewLike";
import User from "@/models/User";
import Activity from "@/models/Activity";

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

    const ids = reviews.map((r) => r._id);
    const likeCounts = await ReviewLike.aggregate([
      { $match: { reviewId: { $in: ids } } },
      { $group: { _id: "$reviewId", likesCount: { $sum: 1 } } },
    ]);
    const countBy = new Map(likeCounts.map((x) => [x._id.toString(), x.likesCount]));

    let likedSet = new Set();
    const userData = getUserFromToken(req);
    if (userData && ids.length > 0) {
      const mine = await ReviewLike.find({
        userId: userData.id,
        reviewId: { $in: ids },
      })
        .select("reviewId")
        .lean();
      likedSet = new Set(mine.map((m) => m.reviewId.toString()));
    }

    const enriched = reviews.map((r) => ({
      ...r,
      likesCount: countBy.get(r._id.toString()) || 0,
      likedByMe: likedSet.has(r._id.toString()),
    }));

    return NextResponse.json({ success: true, reviews: enriched });
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

    // Log activity
    const user = await User.findById(userData.id).select("avatar").lean();
    await Activity.create({
      userId: userData.id,
      username,
      userAvatar: user?.avatar || "",
      type: "review",
      movieId,
      meta: {
        rating,
        comment: comment.slice(0, 200),
      },
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    const isDuplicate = error?.code === 11000;
    return NextResponse.json(
      { success: false, message: isDuplicate ? "Duplicate review." : error.message },
      { status: 500 }
    );
  }
}
