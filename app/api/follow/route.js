import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getUserFromToken } from "@/lib/getUser";

export async function POST(req) {
  try {
    await connectDB();

    const currentUserData = getUserFromToken(req);
    if (!currentUserData) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const targetUserIdRaw = body?.targetUserId;

    // Validate both IDs
    if (
      !mongoose.Types.ObjectId.isValid(currentUserData.id) ||
      !mongoose.Types.ObjectId.isValid(targetUserIdRaw)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid user id." },
        { status: 400 }
      );
    }

    // Cast to ObjectId for correct Mongo operations
    const currentOid = new mongoose.Types.ObjectId(currentUserData.id);
    const targetOid = new mongoose.Types.ObjectId(targetUserIdRaw);

    if (currentOid.equals(targetOid)) {
      return NextResponse.json(
        { success: false, message: "You cannot follow yourself" },
        { status: 400 }
      );
    }

    const targetUser = await User.findById(targetOid);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Check if already following
    const currentUser = await User.findById(currentOid);
    const alreadyFollowing = (currentUser.following || []).some(
      (id) => id.toString() === targetOid.toString()
    );

    if (alreadyFollowing) {
      // UNFOLLOW — use ObjectId in $pull
      await User.updateOne(
        { _id: currentOid },
        { $pull: { following: targetOid } }
      );
      await User.updateOne(
        { _id: targetOid },
        { $pull: { followers: currentOid } }
      );

      const updatedTarget = await User.findById(targetOid).select("followers").lean();
      return NextResponse.json({
        success: true,
        following: false,
        followersCount: updatedTarget?.followers?.length || 0,
      });
    }

    // FOLLOW — use ObjectId in $addToSet
    await User.updateOne(
      { _id: currentOid },
      { $addToSet: { following: targetOid } }
    );
    await User.updateOne(
      { _id: targetOid },
      { $addToSet: { followers: currentOid } }
    );

    const updatedTarget = await User.findById(targetOid).select("followers").lean();
    return NextResponse.json({
      success: true,
      following: true,
      followersCount: updatedTarget?.followers?.length || 0,
    });
  } catch (error) {
    console.error("Follow POST error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// GET: Check if current user follows a target user
export async function GET(req) {
  try {
    await connectDB();

    const currentUserData = getUserFromToken(req);
    if (!currentUserData) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const targetUserIdRaw = searchParams.get("targetUserId");

    if (
      !targetUserIdRaw ||
      !mongoose.Types.ObjectId.isValid(currentUserData.id) ||
      !mongoose.Types.ObjectId.isValid(targetUserIdRaw)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid or missing targetUserId" },
        { status: 400 }
      );
    }

    const currentOid = new mongoose.Types.ObjectId(currentUserData.id);
    const targetOid = new mongoose.Types.ObjectId(targetUserIdRaw);

    const currentUser = await User.findById(currentOid).lean();
    const isFollowing = (currentUser?.following || []).some(
      (id) => id.toString() === targetOid.toString()
    );

    return NextResponse.json({
      success: true,
      following: isFollowing,
    });
  } catch (error) {
    console.error("Follow GET error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}