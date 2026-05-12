import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Collection from "@/models/Collection";

export async function GET(req, context) {
  try {
    await connectDB();
    const params = await context.params;
    const token = params?.token;
    if (!token || typeof token !== "string") {
      return NextResponse.json({ success: false, message: "Invalid token." }, { status: 400 });
    }

    const collection = await Collection.findOne({
      shareToken: token,
      shareEnabled: true,
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
