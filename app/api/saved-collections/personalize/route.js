import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import SavedCollection from "@/models/SavedCollection";
import Collection from "@/models/Collection";

/** Personalize a saved community collection. */
export async function PATCH(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const { collectionId, personalItems, personalBannerUrl, bannerStyle } = body || {};

    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
      return NextResponse.json({ success: false, message: "Invalid collection id." }, { status: 400 });
    }

    const updates = {};
    if (personalItems !== undefined) {
      updates.personalItems = Array.isArray(personalItems)
        ? personalItems.map(Number).filter((n) => Number.isFinite(n))
        : [];
    }
    if (personalBannerUrl !== undefined) updates.personalBannerUrl = (personalBannerUrl || "").toString();
    if (bannerStyle !== undefined) updates.bannerStyle = bannerStyle || {};

    const save = await SavedCollection.findOneAndUpdate(
      { userId: userData.id, collectionId },
      { $set: updates },
      { new: true, upsert: false }
    );

    if (!save) {
      return NextResponse.json(
        { success: false, message: "Save this collection first to personalize it." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, personalization: save });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const { collectionId, movies } = body || {};

    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
      return NextResponse.json({ success: false, message: "Invalid collection id." }, { status: 400 });
    }

    const col = await Collection.findById(collectionId).lean();
    if (!col) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }

    const save = await SavedCollection.findOne({ userId: userData.id, collectionId });
    if (!save) {
      return NextResponse.json({ success: false, message: "Collection not saved." }, { status: 404 });
    }

    const currentItems =
      save.personalItems?.length > 0 ? save.personalItems : [...(col.movies || [])];
    const validIds = (movies || []).map(Number).filter((n) => Number.isFinite(n));
    const existingSet = new Set(currentItems);
    const reordered = validIds.filter((id) => existingSet.has(id));
    const missing = currentItems.filter((id) => !reordered.includes(id));
    save.personalItems = [...reordered, ...missing];
    await save.save();

    return NextResponse.json({ success: true, personalItems: save.personalItems });
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
    const { collectionId, movieId, action } = body || {};
    const id = Number(movieId);

    if (!mongoose.Types.ObjectId.isValid(collectionId) || !Number.isFinite(id)) {
      return NextResponse.json({ success: false, message: "collectionId and movieId required." }, { status: 400 });
    }

    const col = await Collection.findById(collectionId).lean();
    if (!col) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }

    const save = await SavedCollection.findOne({ userId: userData.id, collectionId });
    if (!save) {
      return NextResponse.json({ success: false, message: "Collection not saved." }, { status: 404 });
    }

    let items =
      save.personalItems?.length > 0 ? [...save.personalItems] : [...(col.movies || [])];

    if (action === "remove") {
      items = items.filter((m) => m !== id);
    } else {
      if (!items.includes(id)) items.push(id);
    }

    save.personalItems = items;
    await save.save();

    return NextResponse.json({ success: true, personalItems: save.personalItems });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
