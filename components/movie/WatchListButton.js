"use client";
import { toast } from "react-hot-toast";

export default function WatchlistButton({ movieId, className, children }) {
  async function addToWatchlist(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first");
      return;
    }

    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        movieId,
      }),
    });

    const data = await res.json();

    if (data.success) {
      toast.success("Added to Watchlist");
      window.dispatchEvent(new Event("user-stats-update"));
    } else {
      toast.error(data.message);
    }
  }

  return (
    <button
      onClick={addToWatchlist}
      className={className || "bg-red-500 px-6 py-3 rounded-lg font-semibold hover:bg-red-600"}
    >
      {children || "+ Watchlist"}
    </button>
  );
}