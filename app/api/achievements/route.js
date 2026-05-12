import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import User from "@/models/User";
import Review from "@/models/Review";
import Collection from "@/models/Collection";
import Activity from "@/models/Activity";
import ReviewLike from "@/models/ReviewLike";
import CollectionLike from "@/models/CollectionLike";
import SavedCollection from "@/models/SavedCollection";
import Comment from "@/models/Comment";
import UserAchievement from "@/models/UserAchievement";
import { fetchMovieDetail } from "@/lib/recommendations";
import { badgeMeta, computeDayStreak, evaluateAchievements } from "@/lib/achievements";

async function buildStatsForUser(user) {
  const [reviews, collections, activities] = await Promise.all([
    Review.find({ userId: user._id }).lean(),
    Collection.find({ ownerId: user._id }).lean(),
    Activity.find({ userId: user._id }).sort({ createdAt: -1 }).limit(2000).lean(),
  ]);

  const myReviewIds = reviews.map((r) => r._id);
  const myCollectionIds = collections.map((c) => c._id);

  const [reviewLikesReceived, collectionLikesReceived, collectionSavesReceived, commentsReceived] =
    await Promise.all([
      myReviewIds.length ? ReviewLike.countDocuments({ reviewId: { $in: myReviewIds } }) : 0,
      myCollectionIds.length ? CollectionLike.countDocuments({ collectionId: { $in: myCollectionIds } }) : 0,
      myCollectionIds.length ? SavedCollection.countDocuments({ collectionId: { $in: myCollectionIds } }) : 0,
      Comment.countDocuments({
        $or: [
          { targetType: "review", targetId: { $in: myReviewIds } },
          { targetType: "collection", targetId: { $in: myCollectionIds } },
        ],
      }),
    ]);

  const watchIds = user.watchedMovies || [];
  const movieDetails = (await Promise.all(watchIds.slice(-160).map((id) => fetchMovieDetail(id)))).filter(Boolean);
  const genreCounts = {};
  let totalRuntimeMinutes = 0;
  const countries = new Set();
  for (const m of movieDetails) {
    totalRuntimeMinutes += m.runtime || 120;
    for (const g of m.genres || []) {
      genreCounts[g.id] = (genreCounts[g.id] || 0) + 1;
    }
    for (const c of m.production_countries || []) {
      if (c?.iso_3166_1) countries.add(c.iso_3166_1);
    }
  }

  const reviewLengths = reviews.map((r) => (r.comment || "").length);
  const reviewDates = reviews.map((r) => r.createdAt);
  const activityDates = activities.map((a) => a.createdAt);
  const reviewStreak = computeDayStreak(reviewDates);
  const actStreak = computeDayStreak(activityDates);

  const byDay = {};
  for (const a of activities) {
    const key = new Date(a.createdAt).toISOString().slice(0, 10);
    byDay[key] = (byDay[key] || 0) + (a.type === "watched_add" ? 1 : 0);
  }
  const maxDailyWatched = Math.max(0, ...Object.values(byDay));

  return {
    watchedCount: watchIds.length,
    totalRuntimeHours: Math.floor(totalRuntimeMinutes / 60),
    maxDailyWatched,
    genreCounts,
    countryCount: countries.size,
    reviewCount: reviews.length,
    maxReviewLength: Math.max(0, ...reviewLengths),
    reviewLikesReceived,
    collectionCount: collections.length,
    collectionMovieTotal: collections.reduce((s, c) => s + (c.movies?.length || 0), 0),
    collectionLikesReceived,
    collectionSavesReceived,
    followersCount: (user.followers || []).length,
    commentCount: commentsReceived,
    totalEngagement:
      reviewLikesReceived + collectionLikesReceived + collectionSavesReceived + commentsReceived,
    weekendReviewCount: reviews.filter((r) => {
      const d = new Date(r.createdAt).getDay();
      return d === 0 || d === 6;
    }).length,
    currentReviewStreak: reviewStreak.current,
    currentActivityStreak: actStreak.current,
    longestActivityStreak: actStreak.longest,
    lateNightActivities: activities.filter((a) => {
      const h = new Date(a.createdAt).getHours();
      return h >= 0 && h <= 4;
    }).length,
    activitiesAt3AM: activities.filter((a) => new Date(a.createdAt).getHours() === 3).length,
  };
}

export async function GET(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    const user = username
      ? await User.findOne({ username }).select("-password").lean()
      : await User.findById(userData.id).select("-password").lean();
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const stats = await buildStatsForUser(user);
    const unlockedKeys = evaluateAchievements(stats);
    const meta = badgeMeta(unlockedKeys);

    // Persistence + notifications only for self
    let newlyUnlocked = [];
    let notifications = [];
    let featuredKeys = [];
    if (!username || username === user.username) {
      const doc = await UserAchievement.findOneAndUpdate(
        { userId: user._id },
        { $setOnInsert: { unlockedKeys: [], notifiedKeys: [], featuredKeys: [] } },
        { upsert: true, new: true }
      );
      const previous = new Set(doc.unlockedKeys || []);
      newlyUnlocked = unlockedKeys.filter((k) => !previous.has(k));

      const notified = new Set(doc.notifiedKeys || []);
      notifications = newlyUnlocked.filter((k) => !notified.has(k));

      doc.unlockedKeys = unlockedKeys;
      if (!doc.featuredKeys?.length) {
        doc.featuredKeys = unlockedKeys.slice(0, 6);
      } else {
        doc.featuredKeys = doc.featuredKeys.filter((k) => unlockedKeys.includes(k)).slice(0, 6);
      }
      doc.lastComputedAt = new Date();
      await doc.save();
      featuredKeys = doc.featuredKeys || [];
    } else {
      const doc = await UserAchievement.findOne({ userId: user._id }).lean();
      featuredKeys = doc?.featuredKeys || unlockedKeys.slice(0, 6);
    }

    return NextResponse.json({
      success: true,
      username: user.username,
      counters: {
        unlocked: unlockedKeys.length,
        legendary: meta.filter((m) => m.rarity === "legendary").length,
        secret: meta.filter((m) => m.rarity === "secret").length,
      },
      featuredKeys,
      unlockedKeys,
      badges: meta,
      newlyUnlocked,
      notifications,
      progress: {
        watched: stats.watchedCount,
        reviews: stats.reviewCount,
        followers: stats.followersCount,
        collections: stats.collectionCount,
        currentStreak: stats.currentActivityStreak,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    const markNotified = Array.isArray(body?.markNotified) ? body.markNotified : [];
    const featuredKeys = Array.isArray(body?.featuredKeys) ? body.featuredKeys.slice(0, 6) : null;

    const doc = await UserAchievement.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userData.id) },
      { $setOnInsert: { unlockedKeys: [], notifiedKeys: [], featuredKeys: [] } },
      { upsert: true, new: true }
    );
    if (markNotified.length > 0) {
      doc.notifiedKeys = [...new Set([...(doc.notifiedKeys || []), ...markNotified])];
    }
    if (featuredKeys) {
      const allowed = new Set(doc.unlockedKeys || []);
      doc.featuredKeys = featuredKeys.filter((k) => allowed.has(k));
    }
    await doc.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

