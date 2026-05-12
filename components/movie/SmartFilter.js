"use client";

import { useState, useEffect, useMemo } from "react";
import { Sparkles, X, Wand2 } from "lucide-react";
import { parseAdvancedMoodPrompt, MOODS } from "@/lib/mood";

export default function SmartFilter({ items, onFilter }) {
  const [prompt, setPrompt] = useState("");
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!prompt.trim()) {
      onFilter(items);
      return;
    }

    const filters = parseAdvancedMoodPrompt(prompt);
    const lowercasePrompt = prompt.toLowerCase();

    const filtered = items.filter((item) => {
      // 1. Title/Overview Keyword Match
      const matchesText =
        item.title?.toLowerCase().includes(lowercasePrompt) ||
        item.overview?.toLowerCase().includes(lowercasePrompt);

      // 2. Genre Match (from Moods)
      let matchesMood = false;
      if (filters.matchedMoods.length > 0) {
        const targetGenres = new Set();
        filters.matchedMoods.forEach((m) => {
          MOODS[m]?.genres.forEach((g) => targetGenres.add(g));
        });
        
        matchesMood = item.genre_ids?.some((id) => targetGenres.has(id));
      }

      // 3. Year Match
      let matchesYear = true;
      const year = item.release_date ? new Date(item.release_date).getFullYear() : null;
      if (year) {
        if (filters.yearRange) {
          matchesYear = year >= filters.yearRange.from && year <= filters.yearRange.to;
        } else if (filters.minYear) {
          matchesYear = year >= filters.minYear;
        } else if (filters.maxYear) {
          matchesYear = year <= filters.maxYear;
        }
      }

      // 4. Media Type Match
      let matchesType = true;
      if (filters.includeTV && !filters.preferMovies) {
        matchesType = item.media_type === "tv";
      } else if (filters.preferMovies && !filters.includeTV) {
        matchesType = item.media_type === "movie" || !item.media_type;
      }

      // 5. Language Match
      let matchesLang = true;
      if (filters.language && item.original_language) {
        matchesLang = item.original_language === filters.language;
      }

      // Combine: either text match OR mood match, AND year/type/lang if specified
      const primaryMatch = matchesText || matchesMood || (filters.matchedMoods.length === 0 && !prompt.trim());
      
      return primaryMatch && matchesYear && matchesType && matchesLang;
    });

    onFilter(filtered);
  }, [prompt, items, onFilter]);

  return (
    <div className="relative w-full max-w-xl group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl blur opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
      <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-1">
        <Wand2 size={18} className="text-purple-400 mr-3" />
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Smart Filter: '90s thrillers', 'anime', 'comforting tv'..."
          className="w-full bg-transparent border-none outline-none text-white text-sm py-2.5 placeholder:text-zinc-500"
          onFocus={() => setIsActive(true)}
        />
        {prompt && (
          <button
            onClick={() => setPrompt("")}
            className="p-1 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
      
      {/* Helper text when focused and empty */}
      {isActive && !prompt && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Try typing:</p>
          <div className="flex flex-wrap gap-2">
            {["80s horror", "sci-fi movies", "korean drama", "feel good"].map(s => (
              <button
                key={s}
                onClick={() => setPrompt(s)}
                className="text-[11px] px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 hover:text-white hover:bg-purple-500/20 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
