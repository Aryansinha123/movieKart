import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Collection from "@/models/Collection";
import SavedCollection from "@/models/SavedCollection";
import User from "@/models/User"; // Required for populate("ownerId")

export async function GET(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const saves = await SavedCollection.find({ userId: userData.id })
      .sort({ createdAt: -1 })
      .lean();

    const ids = saves.map((s) => s.collectionId);
    const collections = await Collection.find({ _id: { $in: ids } })
      .populate({ path: "ownerId", select: "username avatar" })
      .lean();

    const byId = new Map(collections.map((c) => [c._id.toString(), c]));
    const ordered = saves
      .map((s) => {
        const c = byId.get(s.collectionId.toString());
        if (!c) return null;
        return { ...c, savedAt: s.createdAt };
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, collections: ordered });
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
    const collectionId = body?.collectionId;
    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
      return NextResponse.json(
        { success: false, message: "Valid collectionId is required." },
        { status: 400 }
      );
    }

    const col = await Collection.findById(collectionId).lean();
    if (!col || !col.isPublic) {
      return NextResponse.json(
        { success: false, message: "Collection not found or not public." },
        { status: 404 }
      );
    }

    if (col.ownerId.toString() === userData.id) {
      return NextResponse.json(
        { success: false, message: "You cannot save your own collection." },
        { status: 400 }
      );
    }

    await SavedCollection.findOneAndUpdate(
      { userId: userData.id, collectionId },
      { userId: userData.id, collectionId },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, saved: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const collectionId = searchParams.get("collectionId");
    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
      return NextResponse.json(
        { success: false, message: "Valid collectionId is required." },
        { status: 400 }
      );
    }

    await SavedCollection.deleteOne({ userId: userData.id, collectionId });
    return NextResponse.json({ success: true, saved: false });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
