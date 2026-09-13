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
    if (!body?.subscription || !body.subscription.endpoint || !body.subscription.keys) {
      return NextResponse.json(
        { success: false, message: "Invalid push subscription object." },
        { status: 400 }
      );
    }

    const { endpoint, keys } = body.subscription;
    const userAgent = req.headers.get("user-agent") || "";

    const subscriptionDoc = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: userData.id,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        userAgent,
      },
      { upsert: true, new: true }
    );

    // Ensure push is enabled in user preferences
    await User.findByIdAndUpdate(userData.id, {
      $set: { "notificationPreferences.pushEnabled": true },
    });

    return NextResponse.json({
      success: true,
      message: "Push subscription saved successfully.",
      subscriptionId: subscriptionDoc._id,
    });
  } catch (error) {
    console.error("[Push /api/push/subscribe] Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
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
    const endpoint = body?.endpoint;

    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint, userId: userData.id });
    } else {
      await PushSubscription.deleteMany({ userId: userData.id });
    }

    return NextResponse.json({
      success: true,
      message: "Push subscription removed.",
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
