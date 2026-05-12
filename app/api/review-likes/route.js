import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Review from "@/models/Review";
import ReviewLike from "@/models/ReviewLike";

/** Toggle like on a review (auth). */
export async function POST(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const reviewId = body?.reviewId;
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return NextResponse.json(
        { success: false, message: "Valid reviewId is required." },
        { status: 400 }
      );
    }

    const review = await Review.findById(reviewId).lean();
    if (!review) {
      return NextResponse.json({ success: false, message: "Review not found." }, { status: 404 });
    }

    const uid = new mongoose.Types.ObjectId(userData.id);
    const existing = await ReviewLike.findOne({ reviewId, userId: uid });
    if (existing) {
      await ReviewLike.deleteOne({ _id: existing._id });
    } else {
      await ReviewLike.create({ reviewId, userId: uid });
    }

    const likesCount = await ReviewLike.countDocuments({ reviewId });
    return NextResponse.json({
      success: true,
      liked: !existing,
      likesCount,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
