"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Library, Play, Trash2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import CuratedCollectionCard from "@/components/collection/CuratedCollectionCard";
import { getMovieUrl } from "@/utils/slugify";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export default function MyCollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    const token = getToken();
    if (!token) {
      setError("Please login to view your collections.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/curated-collections/saved", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setCollections(data.collections || []);
      setInProgress(data.inProgress || []);
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function removeCollection(slug, e) {
    e.preventDefault();
    e.stopPropagation();
    const token = getToken();
    try {
      const res = await fetch(`/api/curated-collections/saved?slug=${slug}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Removed from library");
      load();
    } catch (err) {
      toast.error(err.message || "Failed to remove");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-zinc-400">{error}</p>
        <Link href="/login" className="text-purple-400 hover:underline text-sm">Login</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white pb-20">
      <div className="border-b border-zinc-800/50 bg-gradient-to-br from-purple-900/20 via-black to-black">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 pt-10 pb-8">
          <Link
            href="/collections"
            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft size={14} />
            Discover Collections
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <Library size={20} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">My Collections</h1>
          </div>
          <p className="text-zinc-500 text-sm">
            {collections.length} saved collection{collections.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-10 pt-8">
        {collections.length === 0 ? (
          <div className="text-center py-20">
            <Library size={48} className="mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-400 mb-2">No saved collections yet</p>
            <p className="text-zinc-600 text-sm mb-6">Browse curated collections and save them to your library.</p>
            <Link
              href="/collections"
              className="inline-flex px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold transition-colors"
            >
              Discover Collections
            </Link>
          </div>
        ) : (
          <>
            {/* Continue watching */}
            {inProgress.length > 0 && (
              <section className="mb-12">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Play size={18} className="text-green-400" />
                  Continue Watching
                </h2>
                <div className="grid gap-4">
                  {inProgress.map((col) => (
                    <Link
                      key={col.slug}
                      href={`/collections/${col.slug}`}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/50 hover:border-zinc-700 transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{col.title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {col.watchedCount} of {col.totalCount} watched · {col.progressPercentage}% complete
                        </p>
                        <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden max-w-xs">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${col.progressPercentage}%` }}
                          />
                        </div>
                      </div>
                      {col.nextUnwatched && (
                        <Link
                          href={getMovieUrl(col.nextUnwatched, "")}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 px-4 py-2 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold hover:bg-green-500/25 transition-colors"
                        >
                          Continue
                        </Link>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* All saved */}
            <section>
              <h2 className="text-lg font-bold mb-6">Saved Collections</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {collections.map((col) => (
                  <div key={col.slug} className="relative group">
                    <CuratedCollectionCard collection={{ ...col, saved: true }} showProgress />
                    <button
                      onClick={(e) => removeCollection(col.slug, e)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-black/60 border border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-500/30 opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10"
                      aria-label="Remove from library"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
