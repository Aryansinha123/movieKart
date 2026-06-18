import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import CuratedCollection from "@/models/CuratedCollection";
import UserCuratedCollection from "@/models/UserCuratedCollection";
import User from "@/models/User";
import {
  computeCollectionProgress,
  ensureCuratedCollectionsSeeded,
} from "@/lib/curatedCollections";

export async function GET(req) {
  try {
    await ensureCuratedCollectionsSeeded();
    await connectDB();

    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const saves = await UserCuratedCollection.find({ userId: userData.id })
      .sort({ createdAt: -1 })
      .lean();

    const ids = saves.map((s) => s.curatedCollectionId);
    const collections = await CuratedCollection.find({ _id: { $in: ids } }).lean();
    const byId = new Map(collections.map((c) => [c._id.toString(), c]));

    const ordered = saves
      .map((s) => {
        const col = byId.get(s.curatedCollectionId.toString());
        if (!col) return null;
        return { ...col, savedAt: s.createdAt };
      })
      .filter(Boolean);

    const user = await User.findById(userData.id).select("watchedMovies").lean();
    const watched = user?.watchedMovies || [];

    const enriched = ordered.map((col) => {
      const progress = computeCollectionProgress(watched, col.items || []);
      return {
        ...col,
        id: col._id.toString(),
        saved: true,
        savedAt: col.savedAt,
        ...progress,
      };
    });

    const inProgress = enriched.filter(
      (c) => c.progressPercentage > 0 && c.progressPercentage < 100
    );
    const recentlyUpdated = [...enriched].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );

    return NextResponse.json({
      success: true,
      collections: enriched,
      inProgress,
      recentlyUpdated: recentlyUpdated.slice(0, 6),
    });
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
    const { slug, curatedCollectionId } = body || {};

    let collection;
    if (slug) {
      collection = await CuratedCollection.findOne({ slug }).lean();
    } else if (mongoose.Types.ObjectId.isValid(curatedCollectionId)) {
      collection = await CuratedCollection.findById(curatedCollectionId).lean();
    }

    if (!collection) {
      return NextResponse.json(
        { success: false, message: "Collection not found." },
        { status: 404 }
      );
    }

    await UserCuratedCollection.findOneAndUpdate(
      { userId: userData.id, curatedCollectionId: collection._id },
      { userId: userData.id, curatedCollectionId: collection._id },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, saved: true, collectionId: collection._id.toString() });
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
    const slug = searchParams.get("slug");
    const curatedCollectionId = searchParams.get("curatedCollectionId");

    let collectionId = curatedCollectionId;
    if (slug) {
      const col = await CuratedCollection.findOne({ slug }).lean();
      if (!col) {
        return NextResponse.json({ success: false, message: "Not found." }, { status: 404 });
      }
      collectionId = col._id.toString();
    }

    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
      return NextResponse.json({ success: false, message: "Invalid collection id." }, { status: 400 });
    }

    await UserCuratedCollection.deleteOne({
      userId: userData.id,
      curatedCollectionId: collectionId,
    });

    return NextResponse.json({ success: true, saved: false });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
