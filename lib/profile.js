import User from "@/models/User";
import Collection from "@/models/Collection";
import Review from "@/models/Review";
import Activity from "@/models/Activity";
import UserAchievement from "@/models/UserAchievement";
import CollectionFollow from "@/models/CollectionFollow";
import { badgeMeta } from "@/lib/achievements";
import { connectDB } from "@/lib/mongodb";

export async function getProfileData(username) {
  await connectDB();

  const user = await User.findOne({ username }).select("-password").lean();
  if (!user) return null;

  const userId = user._id;

  const publicCollections = await Collection.find({
    ownerId: userId,
    isPublic: true,
  })
    .sort({ updatedAt: -1 })
    .lean();

  // Fetch followed collections
  const follows = await CollectionFollow.find({ userId }).lean();
  const followedIds = follows.map((f) => f.collectionId);
  const followedCollections = await Collection.find({
    _id: { $in: followedIds },
    visibility: "public",
  })
    .populate({ path: "ownerId", select: "username avatar" })
    .sort({ updatedAt: -1 })
    .lean();

  const recentReviews = await Review.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const recentActivity = await Activity.find({ userId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const achievementDoc = await UserAchievement.findOne({ userId }).lean();
  const unlockedKeys = achievementDoc?.unlockedKeys || [];
  const featuredKeys = achievementDoc?.featuredKeys || unlockedKeys.slice(0, 6);
  const badges = badgeMeta(unlockedKeys);
  const featuredBadges = badgeMeta(featuredKeys);

  const data = {
    ...user,
    _id: user._id.toString(),
    publicCollections: publicCollections.map(c => ({ ...c, _id: c._id.toString(), ownerId: c.ownerId.toString() })),
    followedCollections: followedCollections.map((c) => ({
      ...c,
      _id: c._id.toString(),
      ownerId: (c.ownerId?._id || c.ownerId).toString(),
      owner: c.ownerId,
    })),
    recentReviews: recentReviews.map(r => ({ ...r, _id: r._id.toString(), userId: r.userId.toString() })),
    recentActivity: recentActivity.map(a => ({ ...a, _id: a._id.toString(), userId: a.userId.toString() })),
    achievements: {
      unlockedCount: unlockedKeys.length,
      featuredKeys,
      featuredBadges,
      badges,
    },
  };

  // Final serialization pass to catch any nested ObjectIds or Dates
  return JSON.parse(JSON.stringify(data));
}

