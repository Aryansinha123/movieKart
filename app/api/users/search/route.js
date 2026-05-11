import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        users: [],
      });
    }

    const users = await User.find({
      username: { $regex: query, $options: "i" },
    })
      .select("username avatar bio followers following watchedMovies")
      .limit(20)
      .lean();

    const mapped = users.map((u) => ({
      _id: u._id,
      username: u.username,
      avatar: u.avatar || "",
      bio: u.bio || "",
      followersCount: u.followers?.length || 0,
      followingCount: u.following?.length || 0,
      watchedCount: u.watchedMovies?.length || 0,
    }));

    return NextResponse.json({ success: true, users: mapped });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
