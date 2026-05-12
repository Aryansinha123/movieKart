import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import User from "@/models/User";
import Review from "@/models/Review";
import Collection from "@/models/Collection";
import { calculateUserSimilarity, analyzeTasteProfile, fetchMovieDetail } from "@/lib/recommendations";

/**
 * GET /api/similar-users
 * Returns users with the most similar movie taste to the authenticated user.
 */
export async function GET(req) {
  try {
    await connectDB();

    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const currentUser = await User.findById(userData.id).lean();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Get current user's reviews and collections
    const myReviews = await Review.find({ userId: userData.id }).lean();
    const myCollections = await Collection.find({ ownerId: userData.id }).lean();

    // Get taste profile for genre info
    const myWatchedIds = currentUser.watchedMovies || [];
    const recentIds = myWatchedIds.slice(-15);
    const myMovieDetails = (
      await Promise.all(recentIds.map((id) => fetchMovieDetail(id)))
    ).filter(Boolean);
    const myTaste = analyzeTasteProfile(myMovieDetails, myReviews);
    const myTopGenres = myTaste.favoriteGenres.map((g) => g.id);

    const myProfile = {
      watchedMovies: currentUser.watchedMovies || [],
      reviews: myReviews,
      topGenres: myTopGenres,
      collections: myCollections,
    };

    // Get candidate users (users with at least some watched movies)
    // Exclude current user and already-followed users
    const followingSet = new Set(
      (currentUser.following || []).map((id) => id.toString())
    );

    const candidates = await User.find({
      _id: { $ne: currentUser._id },
      watchedMovies: { $exists: true, $not: { $size: 0 } },
    })
      .select("_id username avatar bio watchedMovies followers following")
      .limit(100)
      .lean();

    const similarUsers = [];

    for (const candidate of candidates) {
      // Get candidate's reviews and collections
      const candidateReviews = await Review.find({
        userId: candidate._id,
      }).lean();
      const candidateCollections = await Collection.find({
        ownerId: candidate._id,
      }).lean();

      // Calculate candidate's top genres
      const candWatchedIds = (candidate.watchedMovies || []).slice(-10);
      const candMovieDetails = (
        await Promise.all(candWatchedIds.map((id) => fetchMovieDetail(id)))
      ).filter(Boolean);
      const candTaste = analyzeTasteProfile(candMovieDetails, candidateReviews);
      const candTopGenres = candTaste.favoriteGenres.map((g) => g.id);

      const candidateProfile = {
        watchedMovies: candidate.watchedMovies || [],
        reviews: candidateReviews,
        topGenres: candTopGenres,
        collections: candidateCollections,
      };

      const similarity = calculateUserSimilarity(myProfile, candidateProfile);

      if (similarity.overall > 0.01) {
        similarUsers.push({
          _id: candidate._id,
          username: candidate.username,
          avatar: candidate.avatar,
          bio: candidate.bio,
          watchedCount: (candidate.watchedMovies || []).length,
          followersCount: (candidate.followers || []).length,
          isFollowing: followingSet.has(candidate._id.toString()),
          similarity,
        });
      }
    }

    // Sort by similarity score
    similarUsers.sort((a, b) => b.similarity.overall - a.similarity.overall);

    // Split into "Similar Taste" and "Suggested to Follow"
    const similarTaste = similarUsers.slice(0, 10);
    const suggestedToFollow = similarUsers
      .filter((u) => !u.isFollowing)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      similarUsers: similarTaste,
      suggestedToFollow,
    });
  } catch (error) {
    console.error("Similar users error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
