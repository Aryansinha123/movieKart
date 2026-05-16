"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Film } from "lucide-react";
import Image from "next/image";
import { getMovieUrl } from "@/utils/slugify";

export default function MovieSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/movies/search?query=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setResults(data.slice(0, 5)); // Limit to 5 results
          setOpen(true);
        }
      } catch (err) {
        console.error("Movie search failed", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleSelect(m) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(getMovieUrl(m.id, m.title));
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 bg-zinc-800/80 border border-zinc-700 rounded-lg px-3 py-1.5 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/25 transition-all">
        <Search size={14} className="text-zinc-500 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder="Search movies..."
          className="bg-transparent text-sm text-white placeholder-zinc-500 outline-none w-36 focus:w-48 transition-all duration-300"
        />
        {loading && (
          <div className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-cyan-500 rounded-full animate-spin flex-shrink-0" />
        )}
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-[100]">
          <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2 text-xs text-zinc-500">
            <Film size={12} />
            {results.length} movie{results.length !== 1 ? "s" : ""} found
          </div>
          <div className="max-h-64 overflow-y-auto">
            {results.map((m) => (
              <button
                key={m.id}
                onClick={() => handleSelect(m)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 transition-colors text-left"
              >
                <div className="w-9 h-12 rounded-sm bg-zinc-800 flex items-center justify-center text-xs text-white overflow-hidden flex-shrink-0">
                  {m.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                      alt={m.title}
                      width={36}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Film size={16} className="text-zinc-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {m.title}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {m.release_date ? m.release_date.split("-")[0] : "N/A"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {open && query.trim().length >= 2 && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-[100]">
          <div className="px-4 py-6 text-center text-sm text-zinc-500">
            No movies found for "{query}"
          </div>
        </div>
      )}
    </div>
  );
}
