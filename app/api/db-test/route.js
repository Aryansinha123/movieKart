import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    console.log("DB Test: Connecting to DB...");
    await connectDB();
    console.log("DB Test: Connected. Fetching user count...");
    const count = await User.countDocuments();
    console.log("DB Test: User count:", count);
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("DB Test Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
