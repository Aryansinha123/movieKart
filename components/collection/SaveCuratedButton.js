"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export default function SaveCuratedButton({ slug, saved: initialSaved = false, compact = false, onToggle }) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function toggleSave(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const token = getToken();
    if (!token) {
      toast.error("Please login to save collections");
      return;
    }

    setLoading(true);
    try {
      if (saved) {
        const res = await fetch(`/api/curated-collections/saved?slug=${slug}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setSaved(false);
        toast.success("Removed from My Collections");
        onToggle?.(false);
      } else {
        const res = await fetch("/api/curated-collections/saved", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ slug }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setSaved(true);
        toast.success("Saved to My Collections");
        onToggle?.(true);
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={toggleSave}
        disabled={loading}
        aria-label={saved ? "Remove from library" : "Save to library"}
        className={`p-2.5 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
          saved
            ? "bg-green-500/20 border-green-500/40 text-green-400"
            : "bg-black/50 border-white/20 text-white hover:bg-white/10"
        }`}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : saved ? (
          <BookmarkCheck size={16} />
        ) : (
          <Bookmark size={16} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleSave}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
        saved
          ? "bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25"
          : "bg-white/10 border border-white/20 text-white hover:bg-white/20"
      }`}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : saved ? (
        <BookmarkCheck size={16} />
      ) : (
        <Bookmark size={16} />
      )}
      {saved ? "Saved to Library" : "Save to My Collections"}
    </button>
  );
}
