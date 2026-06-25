import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ success: false });

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ success: false });

    const user = await User.findById(decoded.id).select("watchedMovies watchlist favorites notInterested favoriteActors");
    if (!user) return NextResponse.json({ success: false });

    return NextResponse.json({
      success: true,
      watchedMovies: user.watchedMovies || [],
      watchlist: user.watchlist || [],
      favorites: user.favorites || [],
      notInterested: user.notInterested || [],
      favoriteActors: user.favoriteActors || [],
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message });
  }
}
