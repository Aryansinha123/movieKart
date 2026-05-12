import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Collection from "@/models/Collection";

/** Read a single public collection (for discovery / trending deep links). */
export async function GET(req, context) {
  try {
    await connectDB();
    const params = await context.params;
    const id = params?.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid id." }, { status: 400 });
    }

    const collection = await Collection.findOne({
      _id: id,
      isPublic: true,
    })
      .populate({ path: "ownerId", select: "username avatar" })
      .lean();

    if (!collection) {
      return NextResponse.json({ success: false, message: "Not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, collection });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
