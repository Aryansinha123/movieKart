"use client";

import { useEffect, useState } from "react";
import MovieCard from "./MovieCard";
import { useUserMovies } from "../providers/UserProvider";

export default function TrendingMovies() {
  const [movies, setMovies] = useState([]);
  const { notInterestedIds } = useUserMovies() || { notInterestedIds: new Set() };

  useEffect(() => {
    async function fetchMovies() {
      try {
        const res = await fetch("/api/movies/trending");
        const data = await res.json().catch(() => null);

        if (!res.ok || !data || !Array.isArray(data?.results)) {
          setMovies([]);
          return;
        }

        setMovies(data.results);
      } catch {
        setMovies([]);
      }
    }

    fetchMovies();
  }, []);

  const seenIds = new Set();
  const visibleMovies = movies.filter((m) => {
    const id = Number(m.id);
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    return !notInterestedIds.has(id);
  });

  return (
    <section className="py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Trending Globally</h2>
          <p className="text-sm text-zinc-500 mt-0.5">The most popular movies around the world right now</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {visibleMovies?.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
          />
        ))}
      </div>
    </section>
  );
}