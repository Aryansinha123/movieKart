"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Search, SlidersHorizontal, Film, Tv } from "lucide-react";
import { getMovieUrl } from "@/utils/slugify";
import { getImagePath } from "@/utils/imagePath";

export default function PersonFilmography({ initialDirected, initialActing }) {
  const [query, setQuery] = useState("");
  const [mediaType, setMediaType] = useState("all"); // "all" | "movie" | "tv"
  const [sortBy, setSortBy] = useState("release"); // "release" | "popularity" | "rating" | "title"

  // Process list helper
  const processList = (list) => {
    let result = [...list];

    // 1. Text Search Filter
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (m) =>
          m.title?.toLowerCase().includes(q) ||
          m.name?.toLowerCase().includes(q) ||
          m.overview?.toLowerCase().includes(q)
      );
    }

    // 2. Media Type Filter
    if (mediaType !== "all") {
      result = result.filter((m) => m.media_type === mediaType);
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === "release") {
        const dateA = a.release_date || a.first_air_date || "";
        const dateB = b.release_date || b.first_air_date || "";
        return dateB.localeCompare(dateA); // Newest first
      }
      if (sortBy === "popularity") {
        return (b.popularity || 0) - (a.popularity || 0);
      }
      if (sortBy === "rating") {
        return (b.vote_average || 0) - (a.vote_average || 0);
      }
      if (sortBy === "title") {
        const titleA = a.title || a.name || "";
        const titleB = b.title || b.name || "";
        return titleA.localeCompare(titleB);
      }
      return 0;
    });

    return result;
  };

  const directedMovies = useMemo(() => processList(initialDirected), [initialDirected, query, mediaType, sortBy]);
  const actingMovies = useMemo(() => processList(initialActing), [initialActing, query, mediaType, sortBy]);

  const totalResults = directedMovies.length + actingMovies.length;

  return (
    <div className="space-y-8">
      {/* Search, Sort and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
        {/* Search Input */}
        <div className="relative w-full md:max-w-md group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search filmography..."
            className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 outline-none focus:border-cyan-500/50 transition-all text-sm"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Media Type Filter */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1">
            <button
              onClick={() => setMediaType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mediaType === "all" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setMediaType("movie")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                mediaType === "movie" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Film size={12} />
              Movies
            </button>
            <button
              onClick={() => setMediaType("tv")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                mediaType === "tv" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Tv size={12} />
              TV Shows
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-zinc-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-cyan-500/50 cursor-pointer transition-colors"
            >
              <option value="release">Release Date</option>
              <option value="popularity">Popularity</option>
              <option value="rating">Rating</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Rendering */}
      {totalResults === 0 ? (
        <div className="text-center py-12 bg-zinc-900/20 border border-zinc-800/50 rounded-2xl">
          <p className="text-zinc-500 text-sm">No filmography matches found for your filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Directed Movies */}
          {directedMovies.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-3 text-cyan-400">
                Directed Movies <span className="text-zinc-500 text-sm font-normal">({directedMovies.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {directedMovies.map((m) => (
                  <PersonMovieCard 
                    key={m.id}
                    movie={{
                      ...m,
                      title: m.title || m.name,
                      release_date: m.release_date || m.first_air_date
                    }} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Acting Movies */}
          {actingMovies.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-3 text-cyan-400">
                Acting Filmography <span className="text-zinc-500 text-sm font-normal">({actingMovies.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {actingMovies.map((m) => (
                  <PersonMovieCard 
                    key={m.id}
                    movie={{
                      ...m,
                      title: m.title || m.name,
                      release_date: m.release_date || m.first_air_date
                    }} 
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PersonMovieCard({ movie }) {
  return (
    <Link 
      href={getMovieUrl(movie.id, movie.title)}
      className="group relative block rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/40 hover:border-cyan-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10"
    >
      <div className="aspect-[16/9] relative overflow-hidden">
        {movie.backdrop_path ? (
          <Image
            src={getImagePath(movie.backdrop_path)}
            alt={movie.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">
            No Backdrop
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
        
        {/* Rating Badge */}
        <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-bold text-amber-400 flex items-center gap-1">
          <Star size={10} fill="currentColor" />
          {movie.vote_average?.toFixed(1) || "N/A"}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-1">
        <h3 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors truncate">
          {movie.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
            {movie.media_type === "tv" ? "TV Series" : "Movie"}
          </span>
          <span className="w-1 h-1 rounded-full bg-zinc-800" />
          <span className="text-[10px] font-medium text-zinc-400">
            {movie.release_date?.substring(0, 4) || "N/A"}
          </span>
        </div>
      </div>
    </Link>
  );
}
