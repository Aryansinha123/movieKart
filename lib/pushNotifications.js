import webpush from "web-push";
import PushSubscription from "@/models/PushSubscription";

let vapidConfigured = false;

function initVapid() {
  if (vapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@moviekart.com";

  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      vapidConfigured = true;
      return true;
    } catch (err) {
      console.error("[WebPush] Failed to initialize VAPID details:", err.message);
      return false;
    }
  }
  return false;
}

export async function sendPushToUser(userId, payload) {
  if (!initVapid()) {
    console.log("[WebPush] VAPID keys not configured. Skipping Web Push notification.");
    return { sent: 0, failed: 0, reason: "VAPID not configured" };
  }

  try {
    const subscriptions = await PushSubscription.find({ userId });
    if (!subscriptions || subscriptions.length === 0) {
      return { sent: 0, failed: 0, reason: "No active push subscriptions" };
    }

    const pushPayload = JSON.stringify({
      title: payload.title || "MovieKart 🎬",
      body: payload.body || payload.message || "New release available!",
      icon: payload.icon || "/icon.png",
      badge: payload.badge || "/icon.png",
      // Large hero image shown in the notification (movie poster)
      ...(payload.image ? { image: payload.image } : {}),
      // Tag used for deduplication on the device
      tag: payload.tag || `moviekart-${payload.movieId || "release"}`,
      data: {
        url: payload.url || "/",
        movieId: payload.movieId || null,
        mediaType: payload.mediaType || null,
        ...payload.data,
      },
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSub, pushPayload);
        sent++;
      } catch (err) {
        failed++;
        console.warn(`[WebPush] Push failed for endpoint (${err.statusCode || err.message})`);
        
        // Clean up invalid or expired subscriptions (404 Not Found or 410 Gone)
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[WebPush] Removing expired push subscription: ${sub.endpoint}`);
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    }

    return { sent, failed };
  } catch (error) {
    console.error("[WebPush] Error sending push to user:", error);
    return { sent: 0, failed: 1, error: error.message };
  }
}
