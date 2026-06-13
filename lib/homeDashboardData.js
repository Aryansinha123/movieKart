import mongoose from "mongoose";

import User from "@/models/User";
import Review from "@/models/Review";
import Collection from "@/models/Collection";
import Activity from "@/models/Activity";
import SavedCollection from "@/models/SavedCollection";
import {
  becauseYouWatched,
  recommendedForYou,
  fetchMovieDetail,
  analyzeTasteProfile,
} from "@/lib/recommendations";
import { mapTmdbResult } from "@/lib/tmdb";
import { getDiscoverParamsForMoods, MOODS } from "@/lib/mood";

/**
 * Assumes MongoDB is already connected.
 * Aggregates homepage / discovery dashboard payload.
 */
export async function buildHomeDashboard(userIdStr) {
  const user = await User.findById(userIdStr).lean();
  if (!user) return null;

  const watchedMovieIds = user.watchedMovies || [];
  const watchlistIds = user.watchlist || [];
  const notInterestedIds = (user.notInterested || []).map((item) => item.movieId);
  const excludeIds = new Set(
    [...watchedMovieIds, ...watchlistIds, ...notInterestedIds].map((id) =>
      typeof id === "number" ? id : parseInt(String(id), 10)
    )
  );

  const reviews = await Review.find({ userId: userIdStr }).lean();
  const collections = await Collection.find({ ownerId: userIdStr }).lean();
  const collectionMovieIds = [];
  for (const c of collections) {
    for (const m of c.movies || []) collectionMovieIds.push(m);
  }
  const highlyRatedMovieIds = reviews.filter((r) => r.rating >= 4).map((r) => r.movieId);

  const followingIds = (user.following || []).map(
    (id) => new mongoose.Types.ObjectId(id.toString())
  );

  let socialSignalMovieIds = [];
  if (followingIds.length > 0) {
    const friendActs = await Activity.find({
      userId: { $in: followingIds },
      type: { $in: ["watched_add", "review", "watchlist_add"] },
      createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    socialSignalMovieIds = friendActs.map((a) => a.movieId).filter(Boolean);
  }

  const recentWatchedIds = watchedMovieIds.slice(-20);
  const movieDetails = (
    await Promise.all(recentWatchedIds.map((id) => fetchMovieDetail(id)))
  ).filter(Boolean);
  const tasteProfile = analyzeTasteProfile(movieDetails, reviews);
  const favoriteGenreIds = tasteProfile.favoriteGenres.map((g) => g.id);

  const [
    becauseRows,
    recommended,
    friendActivity,
    trendingAmongFollows,
    trendingCollections,
    communityReviews,
    suggestedCreators,
  ] = await Promise.all([
    watchedMovieIds.length
      ? becauseYouWatched(watchedMovieIds, excludeIds)
      : Promise.resolve([]),
    watchedMovieIds.length || favoriteGenreIds.length || collectionMovieIds.length
      ? recommendedForYou(watchedMovieIds, favoriteGenreIds, excludeIds, {
          highlyRatedMovieIds,
          collectionMovieIds,
          socialSignalMovieIds,
          notInterested: user.notInterested || [],
        })
      : Promise.resolve([]),
    followingIds.length
      ? Activity.find({ userId: { $in: followingIds } })
          .sort({ createdAt: -1 })
          .limit(14)
          .lean()
      : Promise.resolve([]),
    (async () => {
      if (followingIds.length === 0) return [];
      const acts = await Activity.find({
        userId: { $in: followingIds },
        type: { $in: ["watched_add", "review"] },
        createdAt: { $gte: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) },
      })
        .sort({ createdAt: -1 })
        .limit(60)
        .lean();
      const freq = {};
      for (const a of acts) freq[a.movieId] = (freq[a.movieId] || 0) + 1;
      const ids = Object.entries(freq)
        .sort(([, x], [, y]) => y - x)
        .slice(0, 8)
        .map(([id]) => parseInt(id, 10))
        .filter((id) => !excludeIds.has(id));
      const details = await Promise.all(ids.map((id) => fetchMovieDetail(id)));
      return details.filter(Boolean);
    })(),
    Collection.aggregate([
      {
        $match: {
          isPublic: true,
          movies: { $exists: true, $type: "array", $not: { $size: 0 } },
        },
      },
      {
        $lookup: {
          from: "collectionlikes",
          localField: "_id",
          foreignField: "collectionId",
          as: "likes",
        },
      },
      {
        $lookup: {
          from: "savedcollections",
          localField: "_id",
          foreignField: "collectionId",
          as: "saves",
        },
      },
      {
        $addFields: {
          likesCount: { $size: "$likes" },
          savesCount: { $size: "$saves" },
          movieCount: { $size: "$movies" },
        },
      },
      {
        $addFields: {
          score: {
            $add: [
              "$likesCount",
              { $multiply: ["$savesCount", 1.5] },
              { $multiply: ["$movieCount", 0.12] },
            ],
          },
        },
      },
      { $sort: { score: -1, updatedAt: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "ownerId",
          foreignField: "_id",
          as: "ownerArr",
        },
      },
      {
        $addFields: {
          owner: {
            $let: {
              vars: { o: { $arrayElemAt: ["$ownerArr", 0] } },
              in: {
                _id: "$$o._id",
                username: "$$o.username",
                avatar: "$$o.avatar",
              },
            },
          },
        },
      },
      {
        $project: {
          likes: 0,
          saves: 0,
          ownerArr: 0,
        },
      },
    ]),
    Review.find({})
      .sort({ updatedAt: -1 })
      .limit(12)
      .lean(),
    Review.aggregate([
      { $match: { userId: { $ne: new mongoose.Types.ObjectId(userIdStr) } } },
      { $group: { _id: "$userId", reviewCount: { $sum: 1 } } },
      { $sort: { reviewCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "u",
        },
      },
      {
        $project: {
          userId: "$_id",
          reviewCount: 1,
          username: { $arrayElemAt: ["$u.username", 0] },
          avatar: { $arrayElemAt: ["$u.avatar", 0] },
          bio: { $arrayElemAt: ["$u.bio", 0] },
        },
      },
    ]),
  ]);

  const communityWithMovies = await Promise.all(
    communityReviews.map(async (r) => ({
      ...r,
      movie: await fetchMovieDetail(r.movieId),
    }))
  );

  const savedIds = await SavedCollection.find({ userId: userIdStr })
    .select("collectionId")
    .lean();
  const savedSet = new Set(savedIds.map((s) => s.collectionId.toString()));

  const trendingWithSaved = trendingCollections.map((c) => ({
    ...c,
    savedByMe: savedSet.has(c._id.toString()),
  }));

  const moodPicks = [];
  try {
    const keys = Object.keys(MOODS);
    const randomMoods = [
      keys[Math.floor(Math.random() * keys.length)],
      keys[Math.floor(Math.random() * keys.length)],
    ];
    const uniqueMoods = [...new Set(randomMoods)];
    
    for (const mood of uniqueMoods) {
      const params = getDiscoverParamsForMoods([mood]);
      
      const discoverMoviesUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&with_genres=${params.with_genres}&sort_by=vote_average.desc&vote_count.gte=1000`;
      const discoverTvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${process.env.TMDB_API_KEY}&with_genres=${params.with_genres}&sort_by=vote_average.desc&vote_count.gte=1000`;
      
      const [discoverRes, discoverTvRes] = await Promise.all([
        fetch(discoverMoviesUrl),
        fetch(discoverTvUrl)
      ]);
      const discoverData = await discoverRes.json();
      const discoverTvData = await discoverTvRes.json();
      
      const discoverResults = [
        ...(discoverData.results || []).map(m => mapTmdbResult({ ...m, media_type: "movie" })),
        ...(discoverTvData.results || []).map(m => mapTmdbResult({ ...m, media_type: "tv" }))
      ].filter(Boolean);

      // Simple shuffle to mix movies and TV shows
      const shuffled = discoverResults.sort(() => 0.5 - Math.random());
      
      if (shuffled.length > 0) {
        moodPicks.push({
          id: mood,
          mood,
          title: `${mood} Cinema For You`,
          subtitle: MOODS[mood].description,
          movies: shuffled.slice(0, 10),
        });
      }
    }
  } catch(e) {
    console.error("Mood picks error:", e);
  }

  return {
    personalizedRecommended: recommended.slice(0, 14),
    becauseYouWatched: becauseRows.slice(0, 2),
    friendActivity,
    trendingAmongFollows,
    trendingCollections: trendingWithSaved,
    communityRecentReviews: communityWithMovies.filter((x) => x.movie),
    suggestedCreators,
    tasteProfile,
    moodPicks,
  };
}
