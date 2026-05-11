"use client";

import { useEffect, useState } from "react";
import MovieCard from "./MovieCard";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    async function searchMovies() {
      if (!query) {
        setMovies([]);
        return;
      }

      const res = await fetch(
        `/api/movies/search?query=${query}`
      );

      const data = await res.json();

      setMovies(data);
    }

    const timeout = setTimeout(() => {
      searchMovies();
    }, 500);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <section className="px-10 pb-10">
      <div className="max-w-3xl mx-auto">
        <input
          type="text"
          placeholder="Search movies..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-white outline-none"
        />
      </div>

      {movies.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-10">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
            />
          ))}
        </div>
      )}
    </section>
  );
}