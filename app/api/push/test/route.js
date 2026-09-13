import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import { sendPushToUser } from "@/lib/pushNotifications";

export async function POST(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const res = await sendPushToUser(userData.id, {
      title: "MovieKart Test Notification 🍿",
      body: "Push notifications are working perfectly on MovieKart!",
      icon: "/icon.png",
      url: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Test push notification dispatched.",
      result: res,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
