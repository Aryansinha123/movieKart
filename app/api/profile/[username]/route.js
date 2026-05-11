import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

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

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}