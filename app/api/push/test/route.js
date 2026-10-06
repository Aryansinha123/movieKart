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

    const body = await req.json().catch(() => ({}));
    
    // Preset Notification Examples architecture
    let notificationPayload = {
      title: body.title || "MovieKart 🎬",
      body: body.body || "Push notifications are working perfectly on MovieKart!",
      icon: body.icon || "/icon.png",
      image: body.image || null,
      url: body.url || "/",
      tag: body.tag || `test-${Date.now()}`,
    };

    if (body.type === "new_movie") {
      notificationPayload = {
        title: "🎬 New Movie Added",
        body: "Check out the latest addition to MovieKart! Dune: Part Two is now streaming.",
        icon: "/icon.png",
        image: "https://image.tmdb.org/t/p/w780/1pdfLPoLViEFiRpAuvvFgIMChM1.jpg",
        url: "/movie/693134",
        tag: "new-movie-693134",
      };
    } else if (body.type === "trending") {
      notificationPayload = {
        title: "🔥 Trending Now",
        body: "Don't miss the movies everyone is watching on MovieKart right now.",
        icon: "/icon.png",
        image: "https://image.tmdb.org/t/p/w780/xOMo8ScSuBm2vAHA725kgOG9Z9E.jpg",
        url: "/collections",
        tag: "trending-movies",
      };
    } else if (body.type === "recommended") {
      notificationPayload = {
        title: "⭐ Recommended for You",
        body: "We found Oppenheimer based on your top watched movies.",
        icon: "/icon.png",
        image: "https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGvCiqA1Wl.jpg",
        url: "/movie/872585",
        tag: "recommended-872585",
      };
    } else if (body.type === "new_release") {
      notificationPayload = {
        title: "🎥 New Release",
        body: "A new movie Interstellar (4K IMAX Remaster) has been added to MovieKart.",
        icon: "/icon.png",
        image: "https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        url: "/movie/157336",
        tag: "new-release-157336",
      };
    }

    const res = await sendPushToUser(userData.id, notificationPayload);

    if (res.sent > 0) {
      return NextResponse.json({
        success: true,
        message: `Push notification ("${notificationPayload.title}") sent to your device panel! 📲`,
        result: res,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message:
            res.reason ||
            "No active push subscription found for this account. Please click 'Enable Push Alerts' first.",
          result: res,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[Push Test Route Error]", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
