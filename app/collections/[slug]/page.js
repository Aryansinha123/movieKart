"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, Film, CheckCircle2, Play } from "lucide-react";
import SaveCuratedButton from "@/components/collection/SaveCuratedButton";
import CollectionCoverBanner from "@/components/collection/CollectionCoverBanner";
import MovieCard from "@/components/movie/MovieCard";
import { getMovieUrl } from "@/utils/slugify";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export default function CollectionDetailPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const headers = {};
        const token = getToken();
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`/api/curated-collections/${slug}`, { headers });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        setCollection(data.collection);
        if (data.collection?.title) {
          document.title = `${data.collection.title} | MovieKart Collections`;
        }
      } catch (e) {
        setError(e.message || "Failed to load collection");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
      </main>
    );
  }

  if (error || !collection) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Collection not found"}</p>
          <Link href="/collections" className="text-purple-400 hover:underline text-sm">
            ← Back to Collections
          </Link>
        </div>
      </main>
    );
  }

  const continueHref = collection.nextUnwatched
    ? getMovieUrl(collection.nextUnwatched, collection.movies?.find((m) => m.id === collection.nextUnwatched)?.title)
    : null;

  return (
    <main className="min-h-screen bg-black text-white pb-20">
      {/* Banner */}
      <div className="relative h-[45vh] md:h-[55vh] overflow-hidden">
        <CollectionCoverBanner src={collection.coverImage} alt={collection.title} />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <div className="relative h-full max-w-[1600px] mx-auto px-6 md:px-10 flex flex-col justify-end pb-10">
          <Link
            href="/collections"
            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-6 transition-colors w-fit"
          >
            <ArrowLeft size={14} />
            All Collections
          </Link>

          <span className="inline-block w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 border border-white/15 text-zinc-300 mb-3">
            {collection.category}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 max-w-3xl">
            {collection.title}
          </h1>
          <p className="text-zinc-300 max-w-2xl text-sm md:text-base leading-relaxed mb-6">
            {collection.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Film size={14} />
              {collection.totalCount} titles
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} />
              {collection.totalRuntimeFormatted} total
            </span>
            {collection.watchedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-green-400">
                <CheckCircle2 size={14} />
                {collection.watchedCount} of {collection.totalCount} watched
              </span>
            )}
          </div>

          {/* Progress bar */}
          {collection.totalCount > 0 && (
            <div className="max-w-md mb-6">
              <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                <span>{collection.progressPercentage}% Complete</span>
                <span>{collection.watchedCount}/{collection.totalCount}</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${collection.progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <SaveCuratedButton slug={collection.slug} saved={collection.saved} />
            {continueHref && collection.progressPercentage < 100 && (
              <Link href={continueHref}>
                <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer">
                  <Play size={16} className="fill-white" />
                  Continue Watching
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      {collection.tags?.length > 0 && (
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-4 flex flex-wrap gap-2">
          {collection.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-xs bg-zinc-900 border border-zinc-800 text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Movies grid */}
      <section className="max-w-[1600px] mx-auto px-6 md:px-10 pt-8">
        <h2 className="text-xl font-bold mb-6">
          Watch Order
          <span className="text-zinc-500 font-normal text-sm ml-2">({collection.movies?.length || 0})</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {collection.movies?.map((movie) => (
            <div key={`${movie.orderIndex}-${movie.id}`} className="relative">
              <div className="absolute top-2 left-2 z-10 min-w-[1.5rem] h-6 px-1.5 rounded-full bg-black/70 backdrop-blur-sm text-[11px] font-bold text-white flex items-center justify-center border border-white/10">
                {(movie.orderIndex ?? 0) + 1}
              </div>
              {movie.watched && (
                <div className="absolute top-2 right-2 z-10 p-1 rounded-full bg-green-500/90 text-black">
                  <CheckCircle2 size={14} />
                </div>
              )}
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      </section>

      {collection.plannedTitles?.length > 0 && (
        <section className="max-w-[1600px] mx-auto px-6 md:px-10 pt-10 pb-4">
          <h2 className="text-xl font-bold mb-4">
            Upcoming / TBD
            <span className="text-zinc-500 font-normal text-sm ml-2">({collection.plannedTitles.length})</span>
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {collection.plannedTitles.map((title) => (
              <li
                key={title}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
              >
                <span className="h-2 w-2 rounded-full bg-amber-500/80 shrink-0" />
                {title}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
