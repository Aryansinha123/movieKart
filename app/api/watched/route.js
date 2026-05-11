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
    const movieId = body?.movieId;

    if (typeof movieId !== "number") {
      return NextResponse.json(
        { success: false, message: "movieId must be a number." },
        { status: 400 }
      );
    }

    const user = await User.findById(userData.id);

    if (!user.watchedMovies.includes(movieId)) {
      user.watchedMovies.push(movieId);
    }

    // Optional: if a movie is marked watched, remove from watchlist.
    user.watchlist = user.watchlist.filter((id) => id !== movieId);

    await user.save();

    return NextResponse.json({
      success: true,
      watchedMovies: user.watchedMovies,
    });
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

    const user = await User.findById(userData.id);
    return NextResponse.json(user.watchedMovies || []);
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
    const movieId = body?.movieId;

    if (typeof movieId !== "number") {
      return NextResponse.json(
        { success: false, message: "movieId must be a number." },
        { status: 400 }
      );
    }

    const user = await User.findById(userData.id);
    user.watchedMovies = (user.watchedMovies || []).filter((id) => id !== movieId);
    await user.save();

    return NextResponse.json({ success: true, watchedMovies: user.watchedMovies });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

