"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MovieCard from "@/components/movie/MovieCard";
import SmartFilter from "@/components/movie/SmartFilter";

export default function FavoritesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [movies, setMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [sortBy, setSortBy] = useState("added");

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
          setError("Please login to view your favorites.");
          return;
        }

        const idsRes = await fetch("/api/favorites", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const idsData = await idsRes.json().catch(() => null);

        if (!idsRes.ok || !idsData || idsData?.success === false) {
          throw new Error(idsData?.message || "Failed to load favorites.");
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

  async function handleRemove(movieId) {
    if (!token) return;
    try {
      const res = await fetch("/api/favorites", {
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

  const sortedMovies = useMemo(() => {
    const list = [...filteredMovies];
    if (sortBy === "added") return list;

    return list.sort((a, b) => {
      if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortBy === "language") {
        return (a.original_language || "").localeCompare(b.original_language || "");
      }
      if (sortBy === "country") {
        const ca = a.origin_country?.[0] || a.production_countries?.[0]?.iso_3166_1 || "??";
        const cb = b.origin_country?.[0] || b.production_countries?.[0]?.iso_3166_1 || "??";
        return ca.localeCompare(cb);
      }
      if (sortBy === "release") {
        return new Date(b.release_date || 0) - new Date(a.release_date || 0);
      }
      if (sortBy === "rating") {
        return (b.vote_average || 0) - (a.vote_average || 0);
      }
      return 0;
    });
  }, [filteredMovies, sortBy]);

  return (
    <main className="min-h-screen bg-black text-white px-8 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-3xl font-bold">My Favorites</h1>
              {!isLoading && !error && (
                <span className="text-sm text-zinc-400">Total: {movies.length}</span>
              )}
            </div>
            <p className="text-zinc-400 mt-1">
              Your all-time favorite movies. ❤️
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
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[300px]">
              <SmartFilter 
                items={movies} 
                onFilter={setFilteredMovies} 
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-pink-500/50 transition-colors cursor-pointer"
              >
                <option value="added">Recently Added</option>
                <option value="title">Title (A-Z)</option>
                <option value="language">Language</option>
                <option value="country">Country</option>
                <option value="release">Release Date</option>
                <option value="rating">Rating</option>
              </select>
            </div>
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
                {movies.length > 0 ? "No items match your smart filter." : "No favorite movies yet. Open a movie and click \"♥ Favorite\"."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {sortedMovies.map((movie, i) => (
                <div key={movie?.id ?? movie?.tmdbId ?? movie?.movieId ?? i}>
                  <MovieCard 
                    movie={movie} 
                    priority={i < 2} 
                    mode="favorites"
                    onRemove={handleRemove}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
