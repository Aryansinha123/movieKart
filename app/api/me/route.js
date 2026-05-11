import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import User from "@/models/User";

function sanitizeUsername(raw) {
  const v = (raw || "").toString().trim();
  // Usernames are used in the `/profile/[username]` URL segment, so disallow `/`.
  // Otherwise, allow any characters.
  if (!v) return "";
  if (v.includes("/")) return "";
  if (v.length > 50) return "";
  return v;
}

export async function GET(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(userData.id).select("-password").lean();
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Invalid body" }, { status: 400 });
    }

    const nextUsername =
      body.username !== undefined ? sanitizeUsername(body.username) : undefined;
    const nextAvatar = body.avatar !== undefined ? (body.avatar || "").toString() : undefined;

    if (body.username !== undefined && !nextUsername) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Username is required, must not contain '/', and must be <= 50 characters.",
        },
        { status: 400 }
      );
    }

    if (nextAvatar !== undefined) {
      // Accept empty string to clear. Otherwise require a small data URL.
      if (nextAvatar && !nextAvatar.startsWith("data:image/")) {
        return NextResponse.json(
          { success: false, message: "Avatar must be an image data URL." },
          { status: 400 }
        );
      }
      // ~350KB limit to avoid huge JWT/db payloads
      if (nextAvatar.length > 350_000) {
        return NextResponse.json(
          { success: false, message: "Avatar image is too large." },
          { status: 400 }
        );
      }
    }

    if (nextUsername) {
      const existing = await User.findOne({
        username: nextUsername,
        _id: { $ne: userData.id },
      }).lean();
      if (existing) {
        return NextResponse.json(
          { success: false, message: "Username already taken." },
          { status: 409 }
        );
      }
    }

    const updates = {};
    if (nextUsername !== undefined) updates.username = nextUsername;
    if (nextAvatar !== undefined) updates.avatar = nextAvatar;

    const user = await User.findByIdAndUpdate(userData.id, updates, { new: true })
      .select("-password")
      .lean();

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || "",
      },
      process.env.NEXTAUTH_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json({ success: true, user, token });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

