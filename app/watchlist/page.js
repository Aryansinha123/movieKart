"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import MovieCard from "@/components/movie/MovieCard";

export default function WatchlistPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [movies, setMovies] = useState([]);

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

  return (
    <main className="min-h-screen bg-black text-white px-8 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Watchlist</h1>
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
          ) : movies.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <p className="text-zinc-300">
                Your watchlist is empty. Open a movie and click “+ Watchlist”.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

