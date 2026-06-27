import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Collection from "@/models/Collection";
import CollectionFollow from "@/models/CollectionFollow";
import Notification from "@/models/Notification";
import User from "@/models/User";

export async function POST(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const collectionId = body?.collectionId;
    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
      return NextResponse.json({ success: false, message: "Invalid collectionId." }, { status: 400 });
    }

    const col = await Collection.findById(collectionId);
    if (!col) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }

    if (col.visibility === "private" || col.visibility === "collaborative_private") {
      return NextResponse.json(
        { success: false, message: "Private collections cannot be followed." },
        { status: 403 }
      );
    }

    const userId = new mongoose.Types.ObjectId(userData.id);
    const existingFollow = await CollectionFollow.findOne({ userId, collectionId });

    let followed = false;
    if (existingFollow) {
      await CollectionFollow.deleteOne({ _id: existingFollow._id });
      await Collection.updateOne({ _id: collectionId }, { $inc: { followersCount: -1 } });
      const updated = await Collection.findById(collectionId).select("followersCount").lean();
      col.followersCount = Math.max(0, updated?.followersCount ?? 0);
    } else {
      await CollectionFollow.create({ userId, collectionId });
      await Collection.updateOne({ _id: collectionId }, { $inc: { followersCount: 1 } });
      const updated = await Collection.findById(collectionId).select("followersCount").lean();
      col.followersCount = updated?.followersCount ?? (col.followersCount || 0) + 1;
      followed = true;

      // Notify the owner (if not the user themselves)
      if (col.ownerId.toString() !== userData.id) {
        await Notification.create({
          recipientId: col.ownerId,
          senderId: userId,
          senderUsername: userData.username || "Someone",
          type: "follow",
          collectionId: col._id,
          collectionName: col.name,
          message: `${userData.username || "Someone"} started following your collection "${col.name}"`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      followed,
      followersCount: col.followersCount,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    const { searchParams } = new URL(req.url);
    const collectionId = searchParams.get("collectionId");

    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
      return NextResponse.json({ success: false, message: "Invalid collectionId." }, { status: 400 });
    }

    const col = await Collection.findById(collectionId).select("followersCount").lean();
    if (!col) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }

    let followed = false;
    if (userData) {
      const follow = await CollectionFollow.findOne({
        userId: userData.id,
        collectionId,
      }).lean();
      followed = !!follow;
    }

    return NextResponse.json({
      success: true,
      followed,
      followersCount: col.followersCount || 0,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
