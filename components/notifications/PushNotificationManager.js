"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotification() {
  const [permission, setPermission] = useState("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, []);

  async function checkExistingSubscription() {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      } catch (err) {
        console.warn("[PushManager] Failed to check subscription:", err);
      }
    }
  }

  async function registerSW() {
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        return reg;
      } catch (err) {
        console.error("[PushManager] SW registration failed:", err);
        throw err;
      }
    }
    throw new Error("Service Workers not supported in this browser.");
  }

  async function enablePush() {
    try {
      setLoading(true);
      if (!("Notification" in window)) {
        toast.error("Browser notifications are not supported.");
        return false;
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        toast.error("Notification permission denied.");
        return false;
      }

      const reg = await registerSW();
      const res = await fetch("/api/push/vapid-public-key");
      const data = await res.json();

      if (!data.success || !data.publicKey) {
        toast.error("VAPID public key not configured on server.");
        return false;
      }

      const convertedKey = urlBase64ToUint8Array(data.publicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      const token = localStorage.getItem("token");
      const subRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription }),
      });

      const subData = await subRes.json();
      if (subData.success) {
        setIsSubscribed(true);
        toast.success("Push notifications enabled!");
        return true;
      } else {
        toast.error(subData.message || "Failed to save subscription.");
        return false;
      }
    } catch (err) {
      console.error("[PushManager] Enable push error:", err);
      toast.error(err.message || "Error enabling push notifications.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function disablePush() {
    try {
      setLoading(true);
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
        }
      }

      const token = localStorage.getItem("token");
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      setIsSubscribed(false);
      toast.success("Push notifications disabled.");
      return true;
    } catch (err) {
      console.error("[PushManager] Disable push error:", err);
      toast.error("Error disabling push notifications.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function sendTestPush(payload = {}) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Test notification sent!");
        return true;
      } else {
        toast.error(data.message || "Test push failed.");
        return false;
      }
    } catch (err) {
      toast.error("Failed to trigger test push.");
      return false;
    }
  }

  return {
    permission,
    isSubscribed,
    loading,
    enablePush,
    disablePush,
    sendTestPush,
  };
}

export default function PushNotificationRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
