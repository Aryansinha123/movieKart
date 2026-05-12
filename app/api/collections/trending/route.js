import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Collection from "@/models/Collection";

/**
 * Trending public collections (engagement-weighted).
 */
export async function GET() {
  try {
    await connectDB();

    const rows = await Collection.aggregate([
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
      { $limit: 15 },
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

    const safe = rows.map((r) => ({
      ...r,
      owner: r.owner
        ? {
            _id: r.owner._id,
            username: r.owner.username,
            avatar: r.owner.avatar,
          }
        : null,
    }));

    return NextResponse.json({ success: true, collections: safe });
  } catch (error) {
    console.error("collections/trending", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
