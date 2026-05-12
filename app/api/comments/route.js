import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Comment from "@/models/Comment";
import Review from "@/models/Review";
import Collection from "@/models/Collection";
import User from "@/models/User";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");
    const parentCommentId = searchParams.get("parentCommentId");

    if (!["review", "collection"].includes(targetType) || !mongoose.Types.ObjectId.isValid(targetId)) {
      return NextResponse.json(
        { success: false, message: "targetType (review|collection) and valid targetId required." },
        { status: 400 }
      );
    }

    const filter = {
      targetType,
      targetId: new mongoose.Types.ObjectId(targetId),
    };
    if (parentCommentId && mongoose.Types.ObjectId.isValid(parentCommentId)) {
      filter.parentCommentId = new mongoose.Types.ObjectId(parentCommentId);
    } else {
      filter.$or = [
        { parentCommentId: null },
        { parentCommentId: { $exists: false } },
      ];
    }

    const comments = await Comment.find(filter).sort({ createdAt: 1 }).limit(100).lean();

    return NextResponse.json({ success: true, comments });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const targetType = body?.targetType;
    const targetId = body?.targetId;
    const text = (body?.body || "").toString().trim();
    const parentCommentId = body?.parentCommentId || null;

    if (!["review", "collection"].includes(targetType) || !mongoose.Types.ObjectId.isValid(targetId)) {
      return NextResponse.json(
        { success: false, message: "Invalid target." },
        { status: 400 }
      );
    }
    if (!text || text.length > 2000) {
      return NextResponse.json(
        { success: false, message: "body is required (max 2000 chars)." },
        { status: 400 }
      );
    }

    const tid = new mongoose.Types.ObjectId(targetId);
    if (targetType === "review") {
      const rev = await Review.findById(tid).lean();
      if (!rev) {
        return NextResponse.json({ success: false, message: "Review not found." }, { status: 404 });
      }
    } else {
      const col = await Collection.findById(tid).lean();
      if (!col) {
        return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
      }
      if (!col.isPublic && col.ownerId.toString() !== userData.id) {
        return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
      }
    }

    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return NextResponse.json(
          { success: false, message: "Invalid parentCommentId." },
          { status: 400 }
        );
      }
      const parent = await Comment.findById(parentCommentId).lean();
      if (
        !parent ||
        parent.targetType !== targetType ||
        parent.targetId.toString() !== tid.toString()
      ) {
        return NextResponse.json(
          { success: false, message: "Parent comment not found for this target." },
          { status: 400 }
        );
      }
    }

    const user = await User.findById(userData.id).select("username").lean();
    const username = user?.username || userData.username || "User";

    const doc = await Comment.create({
      targetType,
      targetId: tid,
      userId: userData.id,
      username,
      body: text,
      parentCommentId: parentCommentId ? new mongoose.Types.ObjectId(parentCommentId) : null,
    });

    return NextResponse.json({ success: true, comment: doc.toObject() });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
