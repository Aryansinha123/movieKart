"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Film, Plus, Check } from "lucide-react";
import Image from "next/image";

export default function CollectionSearchBar({ onAddMovie, existingMovieIds = [], autoFocus = false }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const existingSet = new Set(existingMovieIds.map(Number));

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (query.trim().length < 2) {
      // If it's a number, we don't clear results because it might be a TMDB ID
      if (!/^\d+$/.test(query.trim())) {
        setResults([]);
        return;
      }
    }

    // If query is a TMDB ID (numeric, optionally negative)
    if (/^-?\d+$/.test(query.trim())) {
      const parsedId = Number(query.trim());
      const isTv = parsedId < 0;
      setResults([
        {
          id: parsedId,
          title: `${isTv ? "TV Show" : "Movie"} with TMDB ID: ${Math.abs(parsedId)}`,
          isTmdbIdInput: true,
          release_date: "Custom ID Search",
          vote_average: 0
        }
      ]);
      setHighlightedIndex(0);
      return;
    }

    setLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/movies/search?query=${encodeURIComponent(query.trim())}`);
        const data = await res.json().catch(() => []);
        // Filter out people from results for collection selection
        const moviesOnly = (Array.isArray(data) ? data : []).filter(item => item.media_type !== "person");
        setResults(moviesOnly);
        setHighlightedIndex(moviesOnly.length > 0 ? 0 : -1);
      } catch (err) {
        console.error("Collection search failed", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleSelect = (movie) => {
    if (existingSet.has(Number(movie.id)) && !movie.isTmdbIdInput) return;
    onAddMovie(movie.id);
    setQuery("");
    setResults([]);
    setFocused(false);
  };

  const handleKeyDown = (e) => {
    if (!focused || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        handleSelect(results[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto z-50" ref={containerRef}>
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-purple-400 transition-colors">
          <Search size={18} />
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search movie by title or enter TMDB ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-12 pr-12 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/5 transition-all text-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute inset-y-0 right-4 flex items-center text-zinc-500 hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {focused && (query.trim().length >= 2 || /^\d+$/.test(query.trim())) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-[350px] overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="p-4 text-center text-sm text-zinc-500 flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
              Searching TMDB...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500">
              No movies found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {results.map((movie, index) => {
                const isAdded = existingSet.has(Number(movie.id));
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={movie.id}
                    onClick={() => handleSelect(movie)}
                    disabled={isAdded && !movie.isTmdbIdInput}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                      isHighlighted ? "bg-zinc-800/80" : "hover:bg-zinc-900/50"
                    } ${isAdded && !movie.isTmdbIdInput ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {/* Poster */}
                    <div className="w-9 h-12 rounded bg-zinc-900 flex items-center justify-center text-zinc-700 overflow-hidden shrink-0 relative border border-zinc-800">
                      {movie.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                          alt={movie.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <Film size={14} />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-white truncate">{movie.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {movie.isTmdbIdInput
                          ? "Press Enter or Click to Add directly"
                          : `${movie.release_date?.substring(0, 4) || "N/A"} · Rating: ${movie.vote_average?.toFixed(1) || "N/A"}`}
                      </p>
                    </div>

                    {/* Action State */}
                    <div>
                      {isAdded && !movie.isTmdbIdInput ? (
                        <span className="text-xs font-bold text-green-400 flex items-center gap-1 bg-green-500/10 px-2.5 py-1 rounded-full">
                          <Check size={12} />
                          Already Added
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-purple-400 flex items-center gap-1 bg-purple-500/10 px-2.5 py-1 rounded-full hover:bg-purple-500/20">
                          <Plus size={12} />
                          Add
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
