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
      }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const actorId = Number(body?.actorId);

    if (!actorId || isNaN(actorId)) {
      return NextResponse.json({
        success: false,
        message: "Valid TMDB actorId is required",
      }, { status: 400 });
    }

    const user = await User.findById(userData.id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    if (!user.favoriteActors) {
      user.favoriteActors = [];
    }

    const index = user.favoriteActors.indexOf(actorId);
    let isAdded = false;

    if (index === -1) {
      user.favoriteActors.push(actorId);
      isAdded = true;
      
      // Log activity (optional, using type similar to favorite_add or new type)
      await Activity.create({
        userId: user._id,
        username: user.username,
        userAvatar: user.avatar || "",
        type: "favorite_add", // or "favorite_actor_add"
        movieId: actorId, // Store actor ID in movieId for simplicity/compatibility
        meta: {
          isActor: true,
          actorName: body?.actorName || "Actor",
        },
      });
    } else {
      user.favoriteActors.splice(index, 1);
    }

    await user.save();

    return NextResponse.json({
      success: true,
      favoriteActors: user.favoriteActors,
      isAdded,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    }, { status: 500 });
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
      }, { status: 401 });
    }

    const user = await User.findById(userData.id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      favoriteActors: user.favoriteActors || [],
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    }, { status: 500 });
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
    const actorId = Number(body?.actorId);

    if (!actorId || isNaN(actorId)) {
      return NextResponse.json({ success: false, message: "actorId must be a number." }, { status: 400 });
    }

    const user = await User.findById(userData.id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    user.favoriteActors = (user.favoriteActors || []).filter((id) => id !== actorId);
    await user.save();

    return NextResponse.json({ success: true, favoriteActors: user.favoriteActors });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
