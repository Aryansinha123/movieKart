import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import User from "@/models/User";
import Activity from "@/models/Activity";

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

    if (!mongoose.Types.ObjectId.isValid(userData.id)) {
      return NextResponse.json(
        { success: false, message: "Invalid user" },
        { status: 400 }
      );
    }

    const user = await User.findById(userData.id).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const followingIds = (user.following || []).map(
      (id) => new mongoose.Types.ObjectId(id.toString())
    );

    if (followingIds.length === 0) {
      return NextResponse.json({ success: true, activities: [] });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;

    const activities = await Activity.find({
      userId: { $in: followingIds },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Activity.countDocuments({
      userId: { $in: followingIds },
    });

    return NextResponse.json({
      success: true,
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Feed GET error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
