import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import User from "@/models/User";

/** Remove watched status for all items in a collection (restart progress). */
export async function POST(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const items = body?.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "items array is required." },
        { status: 400 }
      );
    }

    const itemSet = new Set(items.map(Number).filter((n) => Number.isFinite(n)));
    const user = await User.findById(userData.id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    user.watchedMovies = (user.watchedMovies || []).filter((id) => !itemSet.has(id));
    await user.save();

    return NextResponse.json({ success: true, watchedMovies: user.watchedMovies });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
