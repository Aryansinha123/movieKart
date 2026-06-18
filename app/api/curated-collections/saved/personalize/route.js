import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import UserCuratedCollection from "@/models/UserCuratedCollection";
import CuratedCollection from "@/models/CuratedCollection";

/** Personalize a saved curated collection (personal order, banner). */
export async function PATCH(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const { slug, curatedCollectionId, personalItems, personalBannerUrl, bannerStyle } = body || {};

    let collectionId = curatedCollectionId;
    if (slug) {
      const col = await CuratedCollection.findOne({ slug }).lean();
      if (!col) {
        return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
      }
      collectionId = col._id.toString();
    }

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

    const save = await UserCuratedCollection.findOneAndUpdate(
      { userId: userData.id, curatedCollectionId: collectionId },
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

/** Reorder personal items for saved curated collection. */
export async function PUT(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const { slug, movies } = body || {};

    let collectionId;
    if (slug) {
      const col = await CuratedCollection.findOne({ slug }).lean();
      if (!col) {
        return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
      }
      collectionId = col._id;
    } else {
      return NextResponse.json({ success: false, message: "slug is required." }, { status: 400 });
    }

    const curated = await CuratedCollection.findById(collectionId).lean();
    const baseItems = curated?.items || [];
    const validIds = (movies || []).map(Number).filter((n) => Number.isFinite(n));

    const save = await UserCuratedCollection.findOne({
      userId: userData.id,
      curatedCollectionId: collectionId,
    });

    if (!save) {
      return NextResponse.json({ success: false, message: "Collection not saved." }, { status: 404 });
    }

    const currentItems =
      save.personalItems?.length > 0 ? save.personalItems : [...baseItems];
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

/** Add/remove movie from personal copy of saved curated collection. */
export async function POST(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const { slug, movieId, action } = body || {};
    const id = Number(movieId);

    if (!slug || !Number.isFinite(id)) {
      return NextResponse.json({ success: false, message: "slug and movieId required." }, { status: 400 });
    }

    const curated = await CuratedCollection.findOne({ slug }).lean();
    if (!curated) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }

    const save = await UserCuratedCollection.findOne({
      userId: userData.id,
      curatedCollectionId: curated._id,
    });

    if (!save) {
      return NextResponse.json({ success: false, message: "Collection not saved." }, { status: 404 });
    }

    let items =
      save.personalItems?.length > 0 ? [...save.personalItems] : [...(curated.items || [])];

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
