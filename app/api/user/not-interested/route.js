import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getUserFromToken } from "@/lib/getUser";

export async function POST(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.movieId !== "number" || !body.title) {
      return NextResponse.json({ success: false, message: "Invalid body parameters" }, { status: 400 });
    }

    const { movieId, title, genres = [] } = body;
    const user = await User.findById(userData.id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Check if already in notInterested
    const exists = user.notInterested.some((item) => item.movieId === movieId);
    if (!exists) {
      user.notInterested.push({
        movieId,
        title,
        genres,
        createdAt: new Date(),
      });

      // Also clean up from watchlist and favorites as the user is not interested
      user.watchlist = (user.watchlist || []).filter((id) => id !== movieId);
      user.favorites = (user.favorites || []).filter((id) => id !== movieId);

      await user.save();
    }

    return NextResponse.json({ success: true, notInterested: user.notInterested });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(userData.id).select("notInterested").lean();
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, notInterested: user.notInterested || [] });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const user = await User.findById(userData.id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    if (body?.clearAll) {
      user.notInterested = [];
    } else {
      const movieId = body?.movieId;
      if (typeof movieId !== "number") {
        return NextResponse.json({ success: false, message: "Invalid movieId" }, { status: 400 });
      }
      user.notInterested = user.notInterested.filter((item) => item.movieId !== movieId);
    }

    await user.save();
    return NextResponse.json({ success: true, notInterested: user.notInterested });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
