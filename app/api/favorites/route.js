import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Activity from "@/models/Activity";

import { getUserFromToken } from "@/lib/getUser";

export async function POST(req) {
  try {
    await connectDB();

    const userData = getUserFromToken(req);

    if (!userData) {
      return NextResponse.json({
        success: false,
        message: "Unauthorized",
      });
    }

    const body = await req.json();

    const { movieId } = body;

    const user = await User.findById(userData.id);

    if (!user.favorites.includes(movieId)) {
      user.favorites.push(movieId);

      await user.save();

      // Log activity
      await Activity.create({
        userId: user._id,
        username: user.username,
        userAvatar: user.avatar || "",
        type: "favorite_add",
        movieId,
        meta: {},
      });
    }

    return NextResponse.json({
      success: true,
      favorites: user.favorites,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}

export async function GET(req) {
  try {
    await connectDB();

    const userData = getUserFromToken(req);

    if (!userData) {
      return NextResponse.json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(userData.id);

    return NextResponse.json(user.favorites || []);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    });
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
    user.favorites = (user.favorites || []).filter((id) => id !== movieId);
    await user.save();

    return NextResponse.json({ success: true, favorites: user.favorites });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
