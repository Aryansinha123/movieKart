import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Collection from "@/models/Collection";
import SavedCollection from "@/models/SavedCollection";
import UserCuratedCollection from "@/models/UserCuratedCollection";
import CuratedCollection from "@/models/CuratedCollection";
import User from "@/models/User";
import {
  ensureCuratedCollectionsSeeded,
  computeCollectionProgress,
  enrichCollectionList,
} from "@/lib/curatedCollections";
import { buildTmdbImageUrl } from "@/lib/curatedCollections";

/** Unified library data for the Collections page. */
export async function GET(req) {
  try {
    await ensureCuratedCollectionsSeeded();
    await connectDB();

    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(userData.id).select("watchedMovies").lean();
    const watched = user?.watchedMovies || [];

    // User-created collections
    const myCollections = await Collection.find({ ownerId: userData.id })
      .sort({ updatedAt: -1 })
      .lean();

    for (const c of myCollections) {
      if (!c.imageUrl && c.movies?.length > 0) {
        try {
          const tmdbRes = await fetch(
            `https://api.themoviedb.org/3/movie/${c.movies[0]}?api_key=${process.env.TMDB_API_KEY}`
          );
          if (tmdbRes.ok) {
            const tmdbData = await tmdbRes.json();
            c.firstMoviePoster = tmdbData.poster_path;
          }
        } catch {
          // ignore
        }
      }
      const progress = computeCollectionProgress(watched, c.movies || []);
      Object.assign(c, progress, {
        type: "user",
        href: `/collection/view/${c._id}`,
      });
    }

    // Saved official curated collections
    const curatedSaves = await UserCuratedCollection.find({ userId: userData.id })
      .sort({ createdAt: -1 })
      .lean();
    const curatedIds = curatedSaves.map((s) => s.curatedCollectionId);
    const curatedDocs = await CuratedCollection.find({ _id: { $in: curatedIds } }).lean();
    const curatedById = new Map(curatedDocs.map((c) => [c._id.toString(), c]));

    const savedCurated = curatedSaves
      .map((save) => {
        const col = curatedById.get(save.curatedCollectionId.toString());
        if (!col) return null;
        const items =
          save.personalItems?.length > 0 ? save.personalItems : col.items || [];
        const progress = computeCollectionProgress(watched, items);
        return {
          ...col,
          id: col._id.toString(),
          type: "curated-saved",
          saved: true,
          savedAt: save.createdAt,
          isPersonalized: Boolean(save.personalItems?.length || save.personalBannerUrl),
          href: `/collections/${col.slug}`,
          ...progress,
        };
      })
      .filter(Boolean);

    // Saved community collections
    const communitySaves = await SavedCollection.find({ userId: userData.id })
      .sort({ createdAt: -1 })
      .lean();
    const communityIds = communitySaves.map((s) => s.collectionId);
    const communityDocs = await Collection.find({ _id: { $in: communityIds } })
      .populate({ path: "ownerId", select: "username avatar" })
      .lean();
    const communityById = new Map(communityDocs.map((c) => [c._id.toString(), c]));

    const savedCommunity = communitySaves
      .map((save) => {
        const col = communityById.get(save.collectionId.toString());
        if (!col) return null;
        const items =
          save.personalItems?.length > 0 ? save.personalItems : col.movies || [];
        const progress = computeCollectionProgress(watched, items);
        return {
          ...col,
          type: "community-saved",
          saved: true,
          savedAt: save.createdAt,
          isPersonalized: Boolean(save.personalItems?.length || save.personalBannerUrl),
          owner: col.ownerId,
          href: `/collection/view/${col._id}`,
          ...progress,
        };
      })
      .filter(Boolean);

    const savedCollections = [...savedCurated, ...savedCommunity].sort(
      (a, b) => new Date(b.savedAt) - new Date(a.savedAt)
    );

    const inProgress = savedCollections.filter(
      (c) => c.progressPercentage > 0 && c.progressPercentage < 100
    );

    // Discover sections
    const allCurated = await enrichCollectionList(
      await CuratedCollection.find().sort({ popularity: -1 }).lean(),
      userData.id
    );

    const featuredCollections = allCurated.filter((c) => c.featured);
    const trendingCollections = [...allCurated]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 8);
    const recommendedCollections = allCurated.filter((c) => !c.featured).slice(0, 8);

  // Community trending
    const communityTrending = await Collection.aggregate([
      {
        $match: {
          isPublic: true,
          movies: { $exists: true, $type: "array", $not: { $size: 0 } },
        },
      },
      {
        $lookup: {
          from: "collectionlikes",
          localField: "_id",
          foreignField: "collectionId",
          as: "likes",
        },
      },
      {
        $lookup: {
          from: "savedcollections",
          localField: "_id",
          foreignField: "collectionId",
          as: "saves",
        },
      },
      {
        $addFields: {
          likesCount: { $size: "$likes" },
          savesCount: { $size: "$saves" },
          movieCount: { $size: "$movies" },
        },
      },
      {
        $addFields: {
          score: {
            $add: [
              "$likesCount",
              { $multiply: ["$savesCount", 1.5] },
              { $multiply: ["$movieCount", 0.15] },
            ],
          },
        },
      },
      { $sort: { score: -1, updatedAt: -1 } },
      { $limit: 12 },
      {
        $lookup: {
          from: "users",
          localField: "ownerId",
          foreignField: "_id",
          as: "ownerArr",
        },
      },
      {
        $addFields: {
          owner: { $arrayElemAt: ["$ownerArr", 0] },
        },
      },
      {
        $project: {
          likes: 0,
          saves: 0,
          ownerArr: 0,
          owner: { password: 0, email: 0 },
        },
      },
    ]);

    const communityCollections = communityTrending.map((c) => ({
      ...c,
      type: "community",
      href: `/collection/view/${c._id}`,
      totalItems: c.movies?.length || 0,
      title: c.name,
      coverImage: c.imageUrl || (c.firstMoviePoster ? buildTmdbImageUrl(c.firstMoviePoster, "w500") : ""),
    }));

    const categories = [...new Set(allCurated.map((c) => c.category))].sort();

    return NextResponse.json({
      success: true,
      myCollections,
      savedCollections,
      inProgress,
      featuredCollections,
      trendingCollections,
      recommendedCollections,
      communityCollections,
      categories,
    });
  } catch (error) {
    console.error("collections/library error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
