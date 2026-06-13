"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import MovieCard from "./MovieCard";
import { useUserMovies } from "../providers/UserProvider";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState([]);
  const { notInterestedIds } = useUserMovies() || { notInterestedIds: new Set() };

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

  const seenIds = new Set();
  const visibleMovies = movies.filter((m) => {
    const id = Number(m.id);
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    return !notInterestedIds.has(id);
  });

  return (
    <section className="py-4">
      <div className="max-w-3xl mx-auto relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-cyan-400 transition-colors">
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder="Search movies, shows, actors, or character names..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-white outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-lg backdrop-blur-sm"
        />
      </div>

      {visibleMovies.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-10">
          {visibleMovies.map((movie, idx) => (
            <MovieCard
              key={`${movie.id}-${idx}`}
              movie={movie}
            />
          ))}
        </div>
      )}
    </section>
  );
}