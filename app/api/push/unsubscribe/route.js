import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import PushSubscription from "@/models/PushSubscription";
import User from "@/models/User";

export async function POST(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const endpoint = body?.endpoint;

    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint, userId: userData.id });
    } else {
      await PushSubscription.deleteMany({ userId: userData.id });
    }

    await User.findByIdAndUpdate(userData.id, {
      $set: { "notificationPreferences.pushEnabled": false },
    });

    return NextResponse.json({
      success: true,
      message: "Push notification subscription removed successfully.",
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
