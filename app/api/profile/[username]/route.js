import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Collection from "@/models/Collection";
import Review from "@/models/Review";
import Activity from "@/models/Activity";
import UserAchievement from "@/models/UserAchievement";
import { badgeMeta } from "@/lib/achievements";

export async function GET(req, context) {
  try {
    await connectDB();

    const params = await context.params;

    const user = await User.findOne({
      username: params.username,
    }).select("-password");

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "User not found",
      });
    }

    const publicCollections = await Collection.find({
      ownerId: user._id,
      isPublic: true,
    })
      .sort({ updatedAt: -1 })
      .lean();

    // Get recent reviews by this user
    const recentReviews = await Review.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get recent activity
    const recentActivity = await Activity.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const achievementDoc = await UserAchievement.findOne({ userId: user._id }).lean();
    const unlockedKeys = achievementDoc?.unlockedKeys || [];
    const featuredKeys = achievementDoc?.featuredKeys || unlockedKeys.slice(0, 6);
    const badges = badgeMeta(unlockedKeys);
    const featuredBadges = badgeMeta(featuredKeys);

    return NextResponse.json({
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
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}