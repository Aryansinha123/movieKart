"use client";

import { useEffect, useState } from "react";

import MovieCard from "./MovieCard";

export default function TrendingMovies() {
  const [movies, setMovies] = useState([]);

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

  return (
    <section className="p-10">
      <h1 className="text-3xl font-bold mb-8">
        Trending Movies
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {movies?.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
          />
        ))}
      </div>
    </section>
  );
}