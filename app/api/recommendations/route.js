import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import User from "@/models/User";
import Review from "@/models/Review";
import Collection from "@/models/Collection";
import Activity from "@/models/Activity";
import UserAchievement from "@/models/UserAchievement";
import {
  becauseYouWatched,
  recommendedForYou,
  discoverHiddenGems,
  fetchMovieDetail,
  analyzeTasteProfile,
  rankMoviesFromPeerReviews,
  getCuratedCollections,
} from "@/lib/recommendations";
import { recommendedGenreBoostFromBadges } from "@/lib/achievements";

/**
 * GET /api/recommendations
 * Returns personalized movie recommendations for the authenticated user.
 *
 * Query params:
 *   section = "because_you_watched" | "recommended" | "hidden_gems" |
 *             "trending_friends" | "similar_users_liked" | "all"
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

    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section") || "all";

    const user = await User.findById(userData.id).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const watchedMovieIds = user.watchedMovies || [];
    const watchlistIds = user.watchlist || [];
    const excludeIds = new Set(
      [...watchedMovieIds, ...watchlistIds].map((id) =>
        typeof id === "number" ? id : parseInt(String(id), 10)
      )
    );

    const reviews = await Review.find({ userId: userData.id }).lean();
    const collections = await Collection.find({ ownerId: userData.id }).lean();
    const collectionMovieIds = [];
    for (const c of collections) {
      for (const m of c.movies || []) collectionMovieIds.push(m);
    }

    const highlyRatedMovieIds = reviews
      .filter((r) => r.rating >= 4)
      .map((r) => r.movieId);

    const recentWatchedIds = watchedMovieIds.slice(-20);
    const movieDetailPromises = recentWatchedIds.map((id) => fetchMovieDetail(id));
    const movieDetails = (await Promise.all(movieDetailPromises)).filter(Boolean);

    const tasteProfile = analyzeTasteProfile(movieDetails, reviews);
    const badgeDoc = await UserAchievement.findOne({ userId: userData.id }).lean();
    const favoriteGenreIds = tasteProfile.favoriteGenres.map((g) => g.id);
    const badgeGenreBoost = recommendedGenreBoostFromBadges(badgeDoc?.unlockedKeys || []);
    const adaptiveGenreIds = [...new Set([...favoriteGenreIds, ...badgeGenreBoost])];

    const followingIds = (user.following || []).map(
      (id) => new mongoose.Types.ObjectId(id.toString())
    );

    let socialSignalMovieIds = [];
    if (followingIds.length > 0) {
      const friendActs = await Activity.find({
        userId: { $in: followingIds },
        type: { $in: ["watched_add", "review", "watchlist_add"] },
        createdAt: { $gte: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) },
      })
        .sort({ createdAt: -1 })
        .limit(40)
        .lean();
      socialSignalMovieIds = friendActs.map((a) => a.movieId).filter(Boolean);
    }

    const result = { success: true };

    if (section === "because_you_watched" || section === "all") {
      if (watchedMovieIds.length > 0) {
        result.becauseYouWatched = await becauseYouWatched(watchedMovieIds, excludeIds);
      } else {
        result.becauseYouWatched = [];
      }
    }

    if (section === "recommended" || section === "all") {
      if (
        watchedMovieIds.length > 0 ||
        favoriteGenreIds.length > 0 ||
        collectionMovieIds.length > 0
      ) {
        result.recommended = await recommendedForYou(
          watchedMovieIds,
          adaptiveGenreIds,
          excludeIds,
          {
            highlyRatedMovieIds,
            collectionMovieIds,
            socialSignalMovieIds,
          }
        );
      } else {
        result.recommended = [];
      }
    }

    if (section === "hidden_gems" || section === "all") {
      result.hiddenGems = await discoverHiddenGems(favoriteGenreIds.slice(0, 3));
      result.hiddenGems = result.hiddenGems.filter((m) => !excludeIds.has(m.id));
    }

    if (section === "trending_friends" || section === "all") {
      if (followingIds.length > 0) {
        const friendActivities = await Activity.find({
          userId: { $in: followingIds },
          type: { $in: ["watched_add", "review"] },
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();

        const movieFreq = {};
        for (const act of friendActivities) {
          movieFreq[act.movieId] = (movieFreq[act.movieId] || 0) + 1;
        }

        const trendingIds = Object.entries(movieFreq)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([id]) => parseInt(id, 10))
          .filter((id) => !excludeIds.has(id));

        const trendingDetails = await Promise.all(
          trendingIds.map((id) => fetchMovieDetail(id))
        );

        result.trendingAmongFriends = trendingDetails.filter(Boolean);
      } else {
        result.trendingAmongFriends = [];
      }
    }

    if (section === "similar_users_liked" || section === "all") {
      result.similarUsersLiked = [];
      if (watchedMovieIds.length >= 2) {
        const peerDocs = await User.aggregate([
          {
            $match: {
              _id: { $ne: new mongoose.Types.ObjectId(userData.id) },
              watchedMovies: { $exists: true, $not: { $size: 0 } },
            },
          },
          {
            $addFields: {
              overlap: {
                $size: {
                  $setIntersection: ["$watchedMovies", watchedMovieIds],
                },
              },
            },
          },
          { $match: { overlap: { $gte: 2 } } },
          { $sort: { overlap: -1 } },
          { $limit: 80 },
          { $project: { _id: 1 } },
        ]);

        const peerIds = peerDocs.map((p) => p._id);
        if (peerIds.length > 0) {
          const peerReviews = await Review.find({
            userId: { $in: peerIds },
            rating: { $gte: 4 },
          })
            .select("movieId rating")
            .limit(800)
            .lean();

          const ranked = rankMoviesFromPeerReviews(peerReviews, excludeIds, 4);
          const topIds = ranked.slice(0, 20).map((r) => r.movieId);
          const details = await Promise.all(topIds.map((id) => fetchMovieDetail(id)));
          result.similarUsersLiked = details.filter(
            (d) => d && d.poster_path && !excludeIds.has(d.id)
          );
        }
      }
    }

    if (section === "curated" || section === "all") {
      result.curatedCollections = await getCuratedCollections();
    }

    result.tasteProfile = tasteProfile;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Recommendations GET error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
