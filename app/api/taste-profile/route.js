import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import User from "@/models/User";
import Review from "@/models/Review";
import {
  fetchMovieDetail,
  analyzeTasteProfile,
  aggregateTalentFromMovieIds,
} from "@/lib/recommendations";

/**
 * GET /api/taste-profile
 * Returns the taste analysis for the authenticated user.
 * Optionally accepts ?username=xxx to view another user's public taste.
 */
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const targetUsername = searchParams.get("username");

    let userId;

    if (targetUsername) {
      const targetUser = await User.findOne({ username: targetUsername })
        .select("_id watchedMovies")
        .lean();
      if (!targetUser) {
        return NextResponse.json(
          { success: false, message: "User not found" },
          { status: 404 }
        );
      }
      userId = targetUser._id;
    } else {
      const userData = getUserFromToken(req);
      if (!userData) {
        // Just return 401 without logging a big error for unauthenticated calls
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }
      userId = userData.id;
    }

    const user = await User.findById(userId).select("watchedMovies username").lean();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const watchedMovieIds = user.watchedMovies || [];
    const reviews = await Review.find({ userId }).lean();

    const recentIds = watchedMovieIds.slice(-30);
    const movieDetails = (
      await Promise.all(recentIds.map((id) => fetchMovieDetail(id)))
    ).filter(Boolean);

    const tasteProfile = analyzeTasteProfile(movieDetails, reviews);
    const { favoriteActors, favoriteDirectors } = await aggregateTalentFromMovieIds(
      watchedMovieIds,
      15
    );

    return NextResponse.json({
      success: true,
      username: user.username,
      tasteProfile: {
        ...tasteProfile,
        favoriteActors,
        favoriteDirectors,
      },
    });
  } catch (error) {
    console.error("Taste profile error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
