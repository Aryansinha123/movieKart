import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import User from "@/models/User";
import Review from "@/models/Review";
import Collection from "@/models/Collection";
import ReviewLike from "@/models/ReviewLike";
import {
  calculateUserSimilarity,
  analyzeTasteProfile,
  fetchMovieDetail,
  aggregateTalentFromMovieIds,
  GENRE_MAP,
} from "@/lib/recommendations";

async function buildUserProfile(user) {
  const reviews = await Review.find({ userId: user._id }).lean();
  const collections = await Collection.find({ ownerId: user._id }).lean();
  const likes = await ReviewLike.find({ userId: user._id }).select("reviewId").lean();
  const likedReviews = likes.length
    ? await Review.find({ _id: { $in: likes.map((x) => x.reviewId) } }).select("movieId").lean()
    : [];

  const watched = user.watchedMovies || [];
  const details = (await Promise.all(watched.slice(-15).map((id) => fetchMovieDetail(id)))).filter(Boolean);
  const taste = analyzeTasteProfile(details, reviews);
  const talent = await aggregateTalentFromMovieIds(watched, 8);

  return {
    profile: {
      watchedMovies: watched,
      reviews,
      collections,
      topGenres: taste.favoriteGenres.map((g) => g.id),
      topActors: (talent.favoriteActors || []).map((x) => x.name),
      topDirectors: (talent.favoriteDirectors || []).map((x) => x.name),
      likedMovieIds: likedReviews.map((r) => r.movieId),
    },
  };
}

/**
 * GET /api/taste-match?username=<targetUsername>
 * Returns compatibility between authenticated user and target profile user.
 */
export async function GET(req) {
  try {
    await connectDB();
    const viewer = getUserFromToken(req);
    if (!viewer) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const username = (searchParams.get("username") || "").trim();
    if (!username) {
      return NextResponse.json(
        { success: false, message: "username query param is required." },
        { status: 400 }
      );
    }

    const [me, target] = await Promise.all([
      User.findById(viewer.id).select("_id username watchedMovies").lean(),
      User.findOne({ username }).select("_id username watchedMovies").lean(),
    ]);

    if (!me || !target) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }
    if (String(me._id) === String(target._id)) {
      return NextResponse.json({
        success: true,
        isSelf: true,
        compatibilityPercent: 100,
        similarity: { overall: 1, compatibilityPercent: 100 },
      });
    }

    const [myBundle, targetBundle] = await Promise.all([buildUserProfile(me), buildUserProfile(target)]);
    const similarity = calculateUserSimilarity(myBundle.profile, targetBundle.profile);

    const sharedGenreNames = (similarity.sharedGenreIds || []).map(
      (id) => GENRE_MAP[id] || `Genre ${id}`
    );
    const sharedMovieDetails = (
      await Promise.all((similarity.sharedWatchedMovieIds || []).slice(0, 6).map((id) => fetchMovieDetail(id)))
    ).filter(Boolean);

    return NextResponse.json({
      success: true,
      target: { _id: target._id, username: target.username },
      compatibilityPercent: similarity.compatibilityPercent,
      similarity,
      sharedGenreNames,
      sharedMovies: sharedMovieDetails,
    });
  } catch (error) {
    console.error("taste-match", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

