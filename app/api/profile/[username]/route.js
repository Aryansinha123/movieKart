import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Collection from "@/models/Collection";

export async function GET(req, context) {
  try {
    await connectDB();

    const params = await context.params;

    const user = await User.findOne({
      username: params.username,
    }).select("-password");

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "User not found",
      });
    }

    const publicCollections = await Collection.find({
      ownerId: user._id,
      isPublic: true,
    })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({
      ...user.toObject(),
      publicCollections,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}