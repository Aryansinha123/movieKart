"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { Heart, Star } from "lucide-react";
import { useUserMovies } from "@/components/providers/UserProvider";

export default function FavoriteActorButton({ actorId, actorName, className }) {
  const { favoriteActorIds, refreshStats } = useUserMovies() || { favoriteActorIds: new Set() };
  const [isSaving, setIsSaving] = useState(false);

  const idNum = Number(actorId);
  const isFavorited = favoriteActorIds.has(idNum);

  async function toggleFavorite(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first to favorite actors");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/favorites/actors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ actorId: idNum, actorName }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to update favorites.");
      }

      if (data.isAdded) {
        toast.success(`Added ${actorName} to Favorites ⭐`);
      } else {
        toast.success(`Removed ${actorName} from Favorites`);
      }
      
      // Update global user stats
      window.dispatchEvent(new Event("user-stats-update"));
    } catch (err) {
      toast.error(err?.message || "Failed to update favorites.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={isSaving}
      className={className || `px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg ${
        isFavorited
          ? "bg-amber-500 hover:bg-amber-600 text-black border border-amber-400"
          : "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
      }`}
    >
      {isSaving ? (
        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        <Star size={16} fill={isFavorited ? "currentColor" : "none"} className={isFavorited ? "text-black" : "text-amber-500"} />
      )}
      {isSaving ? "Saving..." : isFavorited ? "Remove Favorite" : "Favorite Actor"}
    </button>
  );
}
