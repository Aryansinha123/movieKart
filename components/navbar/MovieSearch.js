"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Film, User, Clock, Library } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getMovieUrl, getPersonUrl } from "@/utils/slugify";
import { useRecentSearches } from "@/components/providers/RecentSearchesProvider";
import RecentSearchesPanel from "@/components/movie/RecentSearchesPanel";

export default function MovieSearch() {
  const router = useRouter();
  const { recentSearches, addSearch } = useRecentSearches();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [collections, setCollections] = useState([]);
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
      setCollections([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/movies/search?query=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setResults(data.slice(0, 5)); // Limit to 5 results
        }

        // Fetch matching collections
        const colRes = await fetch(`/api/curated-collections?search=${encodeURIComponent(query.trim())}`);
        const colData = await colRes.json().catch(() => null);
        if (colData && Array.isArray(colData.collections)) {
          setCollections(colData.collections.slice(0, 3)); // Limit to 3 collections
        } else {
          setCollections([]);
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
    if (query.trim()) {
      addSearch(query.trim());
    } else {
      addSearch(m.title || m.name);
    }
    setQuery("");
    setResults([]);
    setCollections([]);
    if (m.media_type === "person") {
      router.push(getPersonUrl(m.id, m.title));
    } else {
      console.log(`[Client-MovieSearch] Clicked Movie ID: ${m.id}, Title: "${m.title}"`);
      router.push(getMovieUrl(m.id, m.title));
    }
  }

  function handleSelectRecent(q) {
    setQuery(q);
    addSearch(q);
  }

  const matchingRecents = query.trim().length >= 2
    ? (recentSearches || []).filter(item =>
        item.query.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 3)
    : [];

  const showSuggestions = query.trim().length >= 2;
  const hasResults = results.length > 0 || collections.length > 0 || matchingRecents.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 bg-zinc-800/80 border border-zinc-700 rounded-lg px-3 py-1.5 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/25 transition-all">
        <Search size={14} className="text-zinc-500 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) {
              addSearch(query.trim());
            }
          }}
          placeholder="Search movies..."
          className="bg-transparent text-sm text-white placeholder-zinc-500 outline-none w-36 focus:w-48 transition-all duration-300"
        />
        {loading && (
          <div className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-cyan-500 rounded-full animate-spin flex-shrink-0" />
        )}
      </div>

      {/* Dropdown Overlay */}
      {open && (
        <div className="absolute top-full right-0 md:left-0 mt-2 w-screen max-w-[320px] sm:max-w-[400px] bg-zinc-950/95 border border-zinc-850 rounded-2xl shadow-2xl shadow-black/90 backdrop-blur-xl overflow-hidden z-[100] p-4 space-y-4">
          
          {/* Case 1: Empty Search Input (or < 2 characters typed) -> Show Recent & Popular Searches */}
          {!showSuggestions && (
            <RecentSearchesPanel
              onSelectQuery={handleSelectRecent}
            />
          )}

          {/* Case 2: User is Typing & Has Suggestions */}
          {showSuggestions && hasResults && (
            <div className="space-y-4">
              
              {/* Matching Recent Searches */}
              {matchingRecents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Matching Searches</h4>
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

              {/* Movie & TV Show Suggestions */}
              {results.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Movies & Shows</h4>
                  <div className="grid gap-1.5">
                    {results.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleSelect(m)}
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
                          ) : m.media_type === "person" ? (
                            <User size={14} className="text-zinc-650" />
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

              {/* Collections Suggestions */}
              {collections.length > 0 && (
                <div className="space-y-2 border-t border-zinc-900 pt-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Collections</h4>
                  <div className="grid gap-1">
                    {collections.map((col) => (
                      <Link
                        key={col.slug}
                        href={`/collections/${col.slug}`}
                        onClick={() => {
                          addSearch(query.trim() || col.title);
                          setOpen(false);
                          setQuery("");
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors text-left text-sm text-zinc-300 hover:text-white"
                      >
                        <Library size={12} className="text-purple-400" />
                        <span className="truncate">{col.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Case 3: Typing Suggestions, but NO RESULTS found -> Show No Results, plus Fallback Searches */}
          {showSuggestions && !hasResults && !loading && (
            <div className="space-y-4">
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
  );
}

