"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Sparkles, TrendingUp, Filter, Plus, Users, Play } from "lucide-react";
import toast from "react-hot-toast";
import { CuratedCollectionRow } from "@/components/collection/CuratedCollectionCard";
import CuratedCollectionCard from "@/components/collection/CuratedCollectionCard";
import { CollectionCardRow } from "@/components/collection/UserCollectionCard";
import { getMovieUrl } from "@/utils/slugify";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export default function CollectionsDiscoverPage() {
  const [library, setLibrary] = useState(null);
  const [discover, setDiscover] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [mediaType, setMediaType] = useState("all");
  const [sort, setSort] = useState("popularity");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchDiscover = useCallback(async () => {
    try {
      const params = new URLSearchParams({ sort });
      if (search) params.set("search", search);
      if (category !== "all") params.set("category", category);
      if (mediaType !== "all") params.set("mediaType", mediaType);

      const headers = {};
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/curated-collections?${params}`, { headers });
      const json = await res.json();
      if (json.success) setDiscover(json);
    } catch {
      setDiscover(null);
    }
  }, [search, category, mediaType, sort]);

  const fetchLibrary = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLibrary(null);
      return;
    }
    try {
      const res = await fetch("/api/collections/library", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setLibrary(json);
    } catch {
      setLibrary(null);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(async () => {
      await Promise.all([fetchLibrary(), fetchDiscover()]);
      setLoading(false);
    }, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchLibrary, fetchDiscover, search]);

  async function removeSavedCurated(col) {
    const token = getToken();
    try {
      const res = await fetch(`/api/curated-collections/saved?slug=${col.slug}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Removed from library");
      fetchLibrary();
    } catch (e) {
      toast.error(e.message || "Failed to remove");
    }
  }

  async function removeSavedCommunity(col) {
    const token = getToken();
    try {
      const res = await fetch(`/api/saved-collections?collectionId=${col._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Removed from library");
      fetchLibrary();
    } catch (e) {
      toast.error(e.message || "Failed to remove");
    }
  }

  async function createCollection() {
    if (!newName.trim()) {
      toast.error("Name is required");
      return;
    }
    const token = getToken();
    if (!token) {
      toast.error("Please login");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Collection created!");
      setNewName("");
      setShowCreate(false);
      fetchLibrary();
    } catch (e) {
      toast.error(e.message || "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  const filtered = discover?.collections || [];
  const isFiltering = search || category !== "all" || mediaType !== "all";
  const myCollections = library?.myCollections || [];
  const savedCollections = library?.savedCollections || [];
  const inProgress = library?.inProgress || [];

  return (
    <main className="min-h-screen bg-black text-white pb-20">
      <div className="relative overflow-hidden border-b border-zinc-800/50">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-black to-cyan-900/20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="relative max-w-[1600px] mx-auto px-6 md:px-10 pt-12 pb-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-widest">
                <Sparkles size={12} />
                MovieKart Collections
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-purple-100 to-cyan-200 bg-clip-text text-transparent">
                Collections
              </h1>
              <p className="text-zinc-400 mt-3 max-w-xl text-sm md:text-base">
                Curated playlists and your personal lists — track progress, customize order, and watch in sequence.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:opacity-90 text-sm font-semibold transition-all cursor-pointer"
            >
              <Plus size={16} />
              New Collection
            </button>
          </div>

          <div className="mt-8 flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search collections..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {(discover?.categories || library?.categories || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value)}
                className="px-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Media</option>
                <option value="movie">Movies</option>
                <option value="tv">TV Shows</option>
                <option value="mixed">Mixed</option>
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="popularity">Popularity</option>
                <option value="title">Title A–Z</option>
                <option value="newest">Newest</option>
                <option value="size">Most Titles</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading && !discover ? (
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Row 1: My Collections + Saved Collections */}
          {!isFiltering && (
            <>
              {inProgress.length > 0 && (
                <section className="px-6 md:px-10 pt-8 mb-8">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Play size={18} className="text-green-400" />
                    Continue Watching
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {inProgress.map((col) => (
                      <Link
                        key={col.slug || col._id}
                        href={col.href || `/collections/${col.slug}`}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/50 hover:border-green-500/30 transition-all group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{col.title || col.name}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {col.watchedCount} of {col.totalCount} watched · {col.progressPercentage}%
                          </p>
                          <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${col.progressPercentage}%` }}
                            />
                          </div>
                        </div>
                        {col.nextUnwatched && (
                          <Link
                            href={getMovieUrl(col.nextUnwatched, "")}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 px-4 py-2 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold hover:bg-green-500/25"
                          >
                            Continue
                          </Link>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <CollectionCardRow
                title="My Collections"
                subtitle="Collections you created"
                collections={myCollections}
                showProgress
              />

              <CollectionCardRow
                title="Saved Collections"
                subtitle="Official and community collections in your library"
                collections={savedCollections}
                showProgress
                cardType="mixed"
                onRemove={(col) => {
                  if (col.type === "curated-saved") removeSavedCurated(col);
                  else removeSavedCommunity(col);
                }}
              />

              {myCollections.length === 0 && savedCollections.length === 0 && getToken() && (
                <div className="px-6 md:px-10 py-8 text-center text-zinc-500 text-sm">
                  Create a collection or save one from below to build your library.
                </div>
              )}
            </>
          )}

          {/* Discover sections */}
          {!isFiltering && (
            <>
              <CuratedCollectionRow
                title="Featured Collections"
                subtitle="Hand-picked by MovieKart"
                collections={discover?.featuredCollections || library?.featuredCollections}
                variant="featured"
              />
              <CuratedCollectionRow
                title="Trending Collections"
                subtitle="Most popular right now"
                collections={discover?.trendingCollections || library?.trendingCollections}
              />
              <CollectionCardRow
                title="Community Collections"
                subtitle="Lists created by MovieKart users"
                collections={library?.communityCollections}
                cardType="user"
              />
              <CuratedCollectionRow
                title="Recommended Collections"
                subtitle="Explore more curated picks"
                collections={discover?.recommendedCollections || library?.recommendedCollections}
              />
            </>
          )}

          {isFiltering && (
            <section className="px-6 md:px-10 mt-4">
              <div className="flex items-center gap-2 mb-6">
                <Filter size={18} className="text-zinc-500" />
                <h2 className="text-xl font-bold text-white">
                  {search ? `Results for "${search}"` : "Filtered Collections"}
                </h2>
                <span className="text-zinc-500 text-sm">({filtered.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((col) => (
                  <CuratedCollectionCard key={col.slug} collection={col} />
                ))}
              </div>
              {filtered.length === 0 && (
                <p className="text-zinc-500 text-center py-16">No collections match your filters.</p>
              )}
            </section>
          )}
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-4">Create Collection</h2>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Collection name..."
              className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-purple-500/50 mb-4"
              onKeyDown={(e) => e.key === "Enter" && createCollection()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-semibold text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={createCollection}
                disabled={creating}
                className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 font-semibold text-sm cursor-pointer"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
