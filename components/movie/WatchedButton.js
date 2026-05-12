"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";

export default function WatchedButton({ movieId, onSuccess, className, children }) {
  const [isSaving, setIsSaving] = useState(false);

  async function markWatched(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/watched", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ movieId }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to mark as watched.");
      }

      onSuccess?.();
      toast.success("Added to watched movies!");
    } catch (err) {
      toast.error(err?.message || "Failed to mark as watched.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={markWatched}
      disabled={isSaving}
      className={className || "w-full mt-3 bg-emerald-600/90 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-semibold transition-colors"}
    >
      {isSaving ? "Saving..." : (children || "Watched")}
    </button>
  );
}

