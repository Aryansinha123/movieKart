import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import CollectionActivity from "@/models/CollectionActivity";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const collectionId = searchParams.get("collectionId");

    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
      return NextResponse.json({ success: false, message: "Invalid collectionId." }, { status: 400 });
    }

    const activities = await CollectionActivity.find({ collectionId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ success: true, activities });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
