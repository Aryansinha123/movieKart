"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import MovieCard from "@/components/movie/MovieCard";
import WatchedButton from "@/components/movie/WatchedButton";

export default function WatchlistPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return movies;
    const q = searchQuery.toLowerCase();
    return movies.filter((m) =>
      m?.title?.toLowerCase().includes(q) ||
      m?.overview?.toLowerCase().includes(q)
    );
  }, [movies, searchQuery]);

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("token") || "";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setError("");

        if (!token) {
          setMovies([]);
          setError("Please login to view your watchlist.");
          return;
        }

        const idsRes = await fetch("/api/watchlist", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const idsData = await idsRes.json().catch(() => null);

        if (!idsRes.ok || !idsData || idsData?.success === false) {
          throw new Error(idsData?.message || "Failed to load watchlist.");
        }

        const ids = Array.isArray(idsData) ? idsData : [];
        if (!ids.length) {
          setMovies([]);
          return;
        }

        const movieResults = await Promise.all(
          ids.map(async (id) => {
            const res = await fetch(`/api/movies/${id}`, { cache: "no-store" });
            if (!res.ok) return null;
            return await res.json().catch(() => null);
          })
        );

        const normalized = movieResults.filter(Boolean);
        if (!cancelled) setMovies(normalized);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Something went wrong.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function handleMarkedWatched(movieId) {
    setMovies((prev) => prev.filter((m) => m?.id !== movieId));
  }

  async function handleRemove(movieId) {
    if (!token) return;
    try {
      const res = await fetch("/api/watchlist", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ movieId }),
      });
      if (res.ok) {
        setMovies((prev) => prev.filter((m) => m?.id !== movieId));
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-8 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-3xl font-bold">My Watchlist</h1>
              {!isLoading && !error && (
                <span className="text-sm text-zinc-400">Total: {movies.length}</span>
              )}
            </div>
            <p className="text-zinc-400 mt-1">
              Movies you’ve saved to watch later.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-zinc-300 hover:text-white transition-colors"
          >
            Back to Home
          </Link>
        </div>

        {!isLoading && !error && movies.length > 0 && (
          <div className="mt-6">
            <input
              type="text"
              placeholder="Search your watchlist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 transition-all shadow-lg"
            />
          </div>
        )}

        <div className="mt-8">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[420px] rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <p className="text-zinc-200">{error}</p>
            </div>
          ) : filteredMovies.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <p className="text-zinc-300">
                {searchQuery ? `No results for "${searchQuery}"` : "Your watchlist is empty. Open a movie and click “+ Watchlist”."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {filteredMovies.map((movie, i) => (
                <div key={movie?.id ?? movie?.tmdbId ?? movie?.movieId ?? i} className="relative group">
                  <MovieCard movie={movie} priority={i < 2} />
                  <WatchedButton
                    movieId={movie?.id}
                    onSuccess={() => handleMarkedWatched(movie?.id)}
                  />
                  <button
                    onClick={() => handleRemove(movie?.id)}
                    className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Remove from watchlist"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

