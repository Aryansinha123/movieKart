"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Film, User, Clock, Library, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import MovieCard from "./MovieCard";
import { useUserMovies } from "../providers/UserProvider";
import { useRecentSearches } from "@/components/providers/RecentSearchesProvider";
import RecentSearchesPanel from "./RecentSearchesPanel";
import { getMovieUrl, getPersonUrl } from "@/utils/slugify";

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState([]);
  const [collections, setCollections] = useState([]);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const { notInterestedIds } = useUserMovies() || { notInterestedIds: new Set() };
  const { recentSearches, addSearch } = useRecentSearches();

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    async function searchMovies() {
      if (query.trim().length < 2) {
        setMovies([]);
        setCollections([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/movies/search?query=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setMovies(data);
        }

        // Fetch matching collections
        const colRes = await fetch(`/api/curated-collections?search=${encodeURIComponent(query.trim())}`);
        const colData = await colRes.json().catch(() => null);
        if (colData && Array.isArray(colData.collections)) {
          setCollections(colData.collections.slice(0, 3));
        } else {
          setCollections([]);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }

    const timeout = setTimeout(() => {
      searchMovies();
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  const seenIds = new Set();
  const visibleMovies = movies.filter((m) => {
    const id = Number(m.id);
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    return !notInterestedIds.has(id);
  });

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim()) {
      addSearch(query.trim());
      setFocused(false);
    }
  };

  function handleSelectRecent(q) {
    setQuery(q);
    addSearch(q);
  }

  function handleSelectMovie(m) {
    addSearch(query.trim() || m.title || m.name);
    setFocused(false);
    setQuery("");
    if (m.media_type === "person") {
      router.push(getPersonUrl(m.id, m.title));
    } else {
      router.push(getMovieUrl(m.id, m.title));
    }
  }

  const matchingRecents = query.trim().length >= 2
    ? (recentSearches || []).filter(item =>
        item.query.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 3)
    : [];

  const showSuggestions = query.trim().length >= 2;
  const hasSuggestions = visibleMovies.length > 0 || collections.length > 0 || matchingRecents.length > 0;

  return (
    <section className="py-4">
      <div className="max-w-3xl mx-auto relative group" ref={containerRef}>
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-cyan-400 transition-colors">
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder="Search movies, shows, actors, or character names..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-12 pr-12 py-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-white outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-lg backdrop-blur-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setMovies([]);
              setCollections([]);
            }}
            className="absolute inset-y-0 right-4 flex items-center text-zinc-500 hover:text-white"
          >
            <X size={20} />
          </button>
        )}

        {/* Focused suggestions dropdown */}
        {focused && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-950/95 border border-zinc-850 rounded-2xl shadow-2xl shadow-black/90 backdrop-blur-xl overflow-hidden z-[100] p-5 space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin">
            
            {/* Case 1: Empty or short query -> Show Recent searches + popular searches */}
            {!showSuggestions && (
              <RecentSearchesPanel
                onSelectQuery={handleSelectRecent}
              />
            )}

            {/* Case 2: Suggestions available */}
            {showSuggestions && hasSuggestions && (
              <div className="space-y-4 text-left">
                
                {/* Matching Recent Searches */}
                {matchingRecents.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Matching Recent Searches</h4>
                    <div className="grid gap-1">
                      {matchingRecents.map((item, idx) => (
                        <button
                          key={`${item.query}-${idx}`}
                          onClick={() => handleSelectRecent(item.query)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors text-left text-sm text-zinc-300 hover:text-white"
                        >
                          <Clock size={12} className="text-zinc-500" />
                          <span>{item.query}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Movie suggestions list */}
                {visibleMovies.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Suggested Movies & Shows</h4>
                    <div className="grid gap-2">
                      {visibleMovies.slice(0, 5).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => handleSelectMovie(m)}
                          className="w-full flex items-center gap-3 px-2 py-1.5 hover:bg-zinc-900 rounded-xl transition-colors text-left"
                        >
                          <div className="w-8 h-11 rounded bg-zinc-850 flex items-center justify-center text-xs text-white overflow-hidden flex-shrink-0">
                            {m.poster_path ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                                alt={m.title}
                                width={32}
                                height={44}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Film size={14} className="text-zinc-650" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate hover:text-cyan-400 transition-colors">
                              {m.title}
                            </p>
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                              {m.media_type === "person"
                                ? (m.known_for_department || "Person")
                                : (m.release_date ? m.release_date.split("-")[0] : "N/A")}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collections suggestions */}
                {collections.length > 0 && (
                  <div className="space-y-2 border-t border-zinc-900 pt-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Suggested Collections</h4>
                    <div className="grid gap-1">
                      {collections.map((col) => (
                        <Link
                          key={col.slug}
                          href={`/collections/${col.slug}`}
                          onClick={() => {
                            addSearch(query.trim() || col.title);
                            setFocused(false);
                            setQuery("");
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors text-left text-sm text-zinc-300 hover:text-white"
                        >
                          <Library size={12} className="text-purple-400 font-bold" />
                          <span className="truncate">{col.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Case 3: No matches found -> Show fallback Searches */}
            {showSuggestions && !hasSuggestions && !loading && (
              <div className="space-y-4 text-left">
                <div className="text-center py-2 text-sm text-zinc-500">
                  No results found for <span className="text-zinc-300 font-semibold">"{query}"</span>
                </div>
                <div className="border-t border-zinc-900 pt-4">
                  <RecentSearchesPanel
                    onSelectQuery={handleSelectRecent}
                  />
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Grid search results (only visible when not focused or when enter pressed) */}
      {!focused && visibleMovies.length > 0 && (
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