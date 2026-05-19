"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";

export default function FavoriteButton({ movieId, onSuccess, className, children }) {
  const [isSaving, setIsSaving] = useState(false);

  async function toggleFavorite(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ movieId }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to add to favorites.");
      }

      onSuccess?.();
      toast.success("Added to Favorites ❤️");
      window.dispatchEvent(new Event("user-stats-update"));
    } catch (err) {
      toast.error(err?.message || "Failed to add to favorites.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={isSaving}
      className={className || "bg-pink-600 hover:bg-pink-700 disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition-colors"}
    >
      {isSaving ? "Saving..." : (children || "♥ Favorite")}
    </button>
  );
}
