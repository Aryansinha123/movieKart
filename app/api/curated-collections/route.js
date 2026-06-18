import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/getUser";
import {
  queryCuratedCollections,
  enrichCollectionList,
  ensureCuratedCollectionsSeeded,
} from "@/lib/curatedCollections";

export async function GET(req) {
  try {
    await ensureCuratedCollectionsSeeded();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const mediaType = searchParams.get("mediaType") || "";
    const sort = searchParams.get("sort") || "popularity";
    const featured = searchParams.get("featured");

    const userData = getUserFromToken(req);
    const collections = await queryCuratedCollections({
      search,
      category,
      mediaType,
      sort,
      featured,
    });

    const enriched = await enrichCollectionList(collections, userData?.id);

    const featuredCollections = enriched.filter((c) => c.featured);
    const trendingCollections = [...enriched]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 8);
    const recommendedCollections = enriched
      .filter((c) => !c.featured)
      .slice(0, 8);

    const categories = [...new Set(enriched.map((c) => c.category))].sort();

    return NextResponse.json({
      success: true,
      collections: enriched,
      featuredCollections,
      trendingCollections,
      recommendedCollections,
      categories,
    });
  } catch (error) {
    console.error("Curated collections error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load collections." },
      { status: 500 }
    );
  }
}
