import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

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

    if (!user.watchlist.includes(movieId)) {
      user.watchlist.push(movieId);

      await user.save();
    }

    return NextResponse.json({
      success: true,
      watchlist: user.watchlist,
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

    return NextResponse.json(user.watchlist);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}