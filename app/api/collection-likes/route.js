import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Collection from "@/models/Collection";
import CollectionLike from "@/models/CollectionLike";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const collectionId = searchParams.get("collectionId");
    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
      return NextResponse.json(
        { success: false, message: "collectionId required." },
        { status: 400 }
      );
    }
    const likesCount = await CollectionLike.countDocuments({ collectionId });
    const userData = getUserFromToken(req);
    let likedByMe = false;
    if (userData) {
      const found = await CollectionLike.findOne({
        collectionId,
        userId: userData.id,
      }).lean();
      likedByMe = !!found;
    }
    return NextResponse.json({ success: true, likesCount, likedByMe });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** Toggle like on a collection (auth). */
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
      return NextResponse.json(
        { success: false, message: "Valid collectionId is required." },
        { status: 400 }
      );
    }

    const col = await Collection.findById(collectionId).lean();
    if (!col) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }
    if (!col.isPublic) {
      return NextResponse.json(
        { success: false, message: "Only public collections can be liked." },
        { status: 403 }
      );
    }

    const uid = new mongoose.Types.ObjectId(userData.id);
    const existing = await CollectionLike.findOne({ collectionId, userId: uid });
    if (existing) {
      await CollectionLike.deleteOne({ _id: existing._id });
    } else {
      await CollectionLike.create({ collectionId, userId: uid });
    }

    const likesCount = await CollectionLike.countDocuments({ collectionId });
    return NextResponse.json({
      success: true,
      liked: !existing,
      likesCount,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
