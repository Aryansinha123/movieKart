"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Library, Sparkles, TrendingUp, Filter } from "lucide-react";
import { CuratedCollectionRow } from "@/components/collection/CuratedCollectionCard";
import CuratedCollectionCard from "@/components/collection/CuratedCollectionCard";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export default function CollectionsDiscoverPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [mediaType, setMediaType] = useState("all");
  const [sort, setSort] = useState("popularity");

  const fetchCollections = useCallback(async () => {
    setLoading(true);
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
      if (json.success) setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [search, category, mediaType, sort]);

  useEffect(() => {
    const timer = setTimeout(fetchCollections, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchCollections, search]);

  const filtered = data?.collections || [];

  return (
    <main className="min-h-screen bg-black text-white pb-20">
      {/* Hero header */}
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
                Discover Collections
              </h1>
              <p className="text-zinc-400 mt-3 max-w-xl text-sm md:text-base">
                Curated playlists of movies and TV shows — save any collection to your library and track your progress.
              </p>
            </div>
            <Link
              href="/collections/my"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all"
            >
              <Library size={16} />
              My Collections
            </Link>
          </div>

          {/* Search & filters */}
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
                {(data?.categories || []).map((c) => (
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

      {loading && !data ? (
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
        </div>
      ) : (
        <>
          {!search && category === "all" && mediaType === "all" && (
            <>
              <CuratedCollectionRow
                title="Featured Collections"
                subtitle="Hand-picked by MovieKart"
                collections={data?.featuredCollections}
                variant="featured"
              />
              <CuratedCollectionRow
                title="Trending Collections"
                subtitle="Most popular right now"
                collections={data?.trendingCollections}
              />
              <CuratedCollectionRow
                title="Recommended For You"
                subtitle="Explore more curated picks"
                collections={data?.recommendedCollections}
              />
            </>
          )}

          <section className="px-6 md:px-10 mt-4">
            <div className="flex items-center gap-2 mb-6">
              <Filter size={18} className="text-zinc-500" />
              <h2 className="text-xl font-bold text-white">
                {search ? `Results for "${search}"` : "All Collections"}
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
        </>
      )}
    </main>
  );
}
