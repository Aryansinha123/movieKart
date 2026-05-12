import User from "@/models/User";
import Collection from "@/models/Collection";
import Review from "@/models/Review";
import Activity from "@/models/Activity";
import UserAchievement from "@/models/UserAchievement";
import { badgeMeta } from "@/lib/achievements";
import { connectDB } from "@/lib/mongodb";

export async function getProfileData(username) {
  await connectDB();

  const user = await User.findOne({ username }).select("-password");
  if (!user) return null;

  const userId = user._id;

  const publicCollections = await Collection.find({
    ownerId: userId,
    isPublic: true,
  })
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

  return {
    ...user.toObject(),
    publicCollections,
    recentReviews,
    recentActivity,
    achievements: {
      unlockedCount: unlockedKeys.length,
      featuredKeys,
      featuredBadges,
      badges,
    },
  };
}
