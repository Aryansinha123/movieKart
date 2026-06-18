"use client";

import Link from "next/link";
import { Play, CheckCircle2, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { getMovieUrl } from "@/utils/slugify";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export default function WatchNowButton({
  collection,
  items,
  nextUnwatched,
  progressPercentage = 0,
  watchedCount = 0,
  totalCount = 0,
  onRestart,
  size = "default",
}) {
  const isComplete = totalCount > 0 && progressPercentage >= 100;
  const nextMovie = collection?.movies?.find((m) => m.id === nextUnwatched);
  const watchHref = nextUnwatched
    ? getMovieUrl(nextUnwatched, nextMovie?.title || "")
    : null;

  async function handleRestart() {
    if (onRestart) {
      onRestart();
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Please login to restart");
      return;
    }

    try {
      const res = await fetch("/api/collections/restart-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: items || collection?.items || [] }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Collection restarted!");
      window.location.reload();
    } catch (e) {
      toast.error(e.message || "Failed to restart");
    }
  }

  const btnClass =
    size === "large"
      ? "px-6 py-3 text-base"
      : "px-5 py-2.5 text-sm";

  if (isComplete) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-semibold">
          <CheckCircle2 size={16} />
          Collection Completed
        </span>
        <button
          onClick={handleRestart}
          className={`inline-flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-semibold transition-all cursor-pointer ${btnClass}`}
        >
          <RotateCcw size={16} />
          Restart Collection
        </button>
      </div>
    );
  }

  if (!watchHref) return null;

  return (
    <Link href={watchHref}>
      <button
        className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 font-semibold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg shadow-purple-500/20 ${btnClass}`}
      >
        <Play size={size === "large" ? 18 : 16} className="fill-white" />
        {watchedCount > 0 ? "Watch Now" : "Start Watching"}
        {nextMovie?.title && (
          <span className="text-white/70 font-normal hidden sm:inline">
            · {nextMovie.title}
          </span>
        )}
      </button>
    </Link>
  );
}
