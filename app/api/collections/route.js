import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Collection from "@/models/Collection";

export async function GET(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const collections = await Collection.find({ ownerId: userData.id })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, collections });
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
    const name = (body?.name || "").toString().trim();
    const isPublic = Boolean(body?.isPublic);

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Collection name is required." },
        { status: 400 }
      );
    }

    const collection = await Collection.create({
      ownerId: userData.id,
      name,
      isPublic,
      movies: [],
    });

    return NextResponse.json({ success: true, collection });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

