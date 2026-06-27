import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Notification from "@/models/Notification";

export async function GET(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const notifications = await Notification.find({ recipientId: userData.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return NextResponse.json({ success: true, notifications });
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
    const notificationIds = body?.notificationIds; // array of ids, or omit to mark all as read

    const filter = { recipientId: userData.id };
    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      filter._id = { $in: notificationIds };
    }

    await Notification.updateMany(filter, { $set: { read: true } });

    return NextResponse.json({ success: true, message: "Notifications marked as read." });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
