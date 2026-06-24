"use client";

import { useEffect, useState } from "react";
import { Search, X, Trash2, TrendingUp, Clock, Film } from "lucide-react";
import Image from "next/image";
import { getMovieUrl } from "@/utils/slugify";
import { useRecentSearches } from "@/components/providers/RecentSearchesProvider";

export default function RecentSearchesPanel({ onSelectQuery, isMobileDropdown = false }) {
  const { recentSearches, removeSearch, clearSearchHistory } = useRecentSearches();
  const [popularMovies, setPopularMovies] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(false);

  useEffect(() => {
    async function fetchPopular() {
      setLoadingPopular(true);
      try {
        const res = await fetch("/api/movies/trending");
        const data = await res.json().catch(() => null);
        if (data && Array.isArray(data.results)) {
          setPopularMovies(data.results.slice(0, 5)); // Keep top 5 trending
        }
      } catch (e) {
        console.error("Failed to load trending movies", e);
      } finally {
        setLoadingPopular(false);
      }
    }
    fetchPopular();
  }, []);

  function formatTime(timestamp) {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  }

  return (
    <div className={`text-left space-y-6 ${isMobileDropdown ? "p-4" : ""}`}>
      {/* Recent Searches Section */}
      {recentSearches && recentSearches.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
              <Clock size={12} />
              Recent Searches
            </h3>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearSearchHistory();
              }}
              className="text-[10px] font-extrabold uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <Trash2 size={10} />
              Clear All
            </button>
          </div>
          
          <div className="grid gap-1.5">
            {recentSearches.map((item, idx) => (
              <div
                key={`${item.query}-${idx}`}
                className="group flex items-center justify-between rounded-lg hover:bg-zinc-800/40 p-2.5 transition-colors border border-transparent hover:border-zinc-800/30 cursor-pointer"
                onClick={() => onSelectQuery(item.query)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Search size={14} className="text-zinc-500 group-hover:text-cyan-400 transition-colors shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors truncate">
                      {item.query}
                    </p>
                    {item.timestamp && (
                      <span className="text-[10px] text-zinc-600 block mt-0.5">
                        {formatTime(item.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeSearch(item.query);
                  }}
                  className="p-1 rounded-full text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/80 transition-all cursor-pointer opacity-80 md:opacity-0 group-hover:opacity-100 shrink-0"
                  aria-label="Remove search query"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Popular Movies Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
          <TrendingUp size={12} className="text-amber-400 animate-pulse" />
          Popular Searches
        </h3>
        
        {loadingPopular ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid gap-3">
            {popularMovies.map((movie) => {
              const url = getMovieUrl(movie.id, movie.title);
              return (
                <a
                  key={movie.id}
                  href={url}
                  className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900/30 border border-zinc-800/40 hover:border-amber-400/20 hover:bg-zinc-900/60 transition-all group cursor-pointer"
                  onClick={() => onSelectQuery(movie.title)}
                >
                  {movie.poster_path ? (
                    <div className="relative w-10 h-14 rounded-lg overflow-hidden shrink-0 bg-zinc-800 border border-zinc-850">
                      <Image
                        src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                        alt={movie.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-14 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <Film size={16} className="text-zinc-650" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
                      {movie.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {movie.release_date ? movie.release_date.split("-")[0] : "N/A"} · ⭐ {Number(movie.vote_average || 0).toFixed(1)}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
