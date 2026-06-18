import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import CuratedCollection from "@/models/CuratedCollection";
import UserCuratedCollection from "@/models/UserCuratedCollection";
import User from "@/models/User";
import { ensureCuratedCollectionsSeeded } from "@/lib/curatedCollections";
import { enrichCuratedWithPersonalization } from "@/lib/collectionUtils";

export async function GET(req, { params }) {
  try {
    await ensureCuratedCollectionsSeeded();
    await connectDB();

    const resolved = await params;
    const slug = resolved?.slug;
    if (!slug) {
      return NextResponse.json({ success: false, message: "Slug required." }, { status: 400 });
    }

    const collection = await CuratedCollection.findOne({ slug }).lean();
    if (!collection) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }

    const userData = getUserFromToken(req);
    let personalization = null;
    let watched = [];

    if (userData) {
      personalization = await UserCuratedCollection.findOne({
        userId: userData.id,
        curatedCollectionId: collection._id,
      }).lean();
      const user = await User.findById(userData.id).select("watchedMovies").lean();
      watched = user?.watchedMovies || [];
    }

    const enriched = await enrichCuratedWithPersonalization(collection, personalization, watched);

    return NextResponse.json({
      success: true,
      collection: {
        ...enriched,
        slug: collection.slug,
        title: collection.title,
        description: collection.description,
        category: collection.category,
        tags: collection.tags,
        plannedTitles: collection.plannedTitles,
        saved: Boolean(personalization),
        isOwner: false,
        canPersonalize: Boolean(personalization),
      },
    });
  } catch (error) {
    console.error("Curated collection detail error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load collection." },
      { status: 500 }
    );
  }
}
