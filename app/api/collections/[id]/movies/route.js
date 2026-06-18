import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Collection from "@/models/Collection";
import User from "@/models/User";
import Activity from "@/models/Activity";

export async function POST(req, context) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const id = params?.id;
    const body = await req.json().catch(() => null);
    const movieId = Number(body?.movieId);

    if (!Number.isFinite(movieId)) {
      return NextResponse.json(
        { success: false, message: "movieId must be a number." },
        { status: 400 }
      );
    }

    const collection = await Collection.findOne({ _id: id, ownerId: userData.id });
    if (!collection) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }

    if (!collection.movies.includes(movieId)) {
      collection.movies.push(movieId);
      await collection.save();

      // Log activity
      const user = await User.findById(userData.id).select("username avatar").lean();
      await Activity.create({
        userId: userData.id,
        username: user?.username || userData.username || "User",
        userAvatar: user?.avatar || "",
        type: "collection_add",
        movieId,
        meta: {
          collectionName: collection.name,
          collectionId: collection._id.toString(),
        },
      });
    }

    return NextResponse.json({ success: true, collection });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req, context) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const id = params?.id;
    const body = await req.json().catch(() => null);
    const movieId = Number(body?.movieId);

    if (!Number.isFinite(movieId)) {
      return NextResponse.json(
        { success: false, message: "movieId must be a number." },
        { status: 400 }
      );
    }

    const collection = await Collection.findOne({ _id: id, ownerId: userData.id });
    if (!collection) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }

    collection.movies = collection.movies.filter((m) => m !== movieId);
    await collection.save();

    return NextResponse.json({ success: true, collection });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** Reorder movies in a collection. */
export async function PUT(req, context) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const id = params?.id;
    const body = await req.json().catch(() => null);
    const movies = body?.movies;

    if (!Array.isArray(movies)) {
      return NextResponse.json(
        { success: false, message: "movies array is required." },
        { status: 400 }
      );
    }

    const collection = await Collection.findOne({ _id: id, ownerId: userData.id });
    if (!collection) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }

    const validIds = movies.map(Number).filter((n) => Number.isFinite(n));
    const existingSet = new Set(collection.movies);
    const reordered = validIds.filter((id) => existingSet.has(id));
    const missing = collection.movies.filter((id) => !reordered.includes(id));
    collection.movies = [...reordered, ...missing];
    await collection.save();

    return NextResponse.json({ success: true, collection });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
