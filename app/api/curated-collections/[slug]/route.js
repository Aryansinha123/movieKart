import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import CuratedCollection from "@/models/CuratedCollection";
import { enrichCollectionDetail, ensureCuratedCollectionsSeeded } from "@/lib/curatedCollections";

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
    const enriched = await enrichCollectionDetail(collection, userData?.id);

    return NextResponse.json({ success: true, collection: enriched });
  } catch (error) {
    console.error("Curated collection detail error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load collection." },
      { status: 500 }
    );
  }
}
