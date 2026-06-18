import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Collection from "@/models/Collection";

export async function POST(req, context) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const id = params?.id;

    const original = await Collection.findOne({ _id: id, ownerId: userData.id }).lean();
    if (!original) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }

    const copy = await Collection.create({
      ownerId: userData.id,
      name: `${original.name} (Copy)`,
      imageUrl: original.imageUrl,
      bannerUrl: original.bannerUrl,
      description: original.description,
      category: original.category,
      bannerStyle: original.bannerStyle || {},
      isPublic: false,
      movies: [...(original.movies || [])],
    });

    return NextResponse.json({ success: true, collection: copy });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
