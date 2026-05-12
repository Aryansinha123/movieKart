"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Wand2, Loader2, Play } from "lucide-react";
import MovieCard from "@/components/movie/MovieCard";

export default function MoodDiscoverySection() {
  const [prompt, setPrompt] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [moodCategories, setMoodCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [languageFilter, setLanguageFilter] = useState("any");
  const [originFilter, setOriginFilter] = useState("any");

  useEffect(() => {
    // Fetch available mood categories
    fetch("/api/mood")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMoodCategories(data.moods);
        }
      });
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsSearching(true);
    setResults(null);
    setActiveCategory(null);

    try {
      const res = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, language: languageFilter, origin: originFilter }),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const loadCategory = async (moodName) => {
    setIsSearching(true);
    setResults(null);
    setActiveCategory(moodName);
    setPrompt("");

    try {
      const res = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: moodName, language: languageFilter, origin: originFilter }),
      });
      const data = await res.json();
      if (data.success) {
        setResults({
          movies: data.movies,
          matchedMoods: [moodName],
          message: `Explore ${moodName} cinema`,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  // Re-trigger search when filters change
  useEffect(() => {
    if (results && !isSearching) {
      if (activeCategory) {
        loadCategory(activeCategory);
      } else if (prompt.trim()) {
        handleSearch({ preventDefault: () => {} });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageFilter, originFilter]);

  return (
    <div className="space-y-10">
      {/* Search Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-4">
          <Wand2 size={16} />
          AI Mood Discovery
        </div>
        <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 text-transparent bg-clip-text">
          How do you want to feel?
        </h2>
        <p className="text-zinc-400 text-lg">
          Describe the vibe, emotion, or situation. Our AI will find the perfect movies.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 outline-none"
          >
            <option value="any">Language: Any (balanced mix)</option>
            <option value="english">English</option>
            <option value="hindi">Hindi</option>
            <option value="korean">Korean</option>
            <option value="japanese">Japanese</option>
            <option value="spanish">Spanish</option>
            <option value="french">French</option>
            <option value="tamil">Tamil</option>
            <option value="telugu">Telugu</option>
          </select>
          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 outline-none"
          >
            <option value="any">Origin preset: Any</option>
            <option value="hindi">India-focused</option>
            <option value="english">Hollywood/English</option>
            <option value="korean">Korean</option>
            <option value="japanese">Japanese</option>
            <option value="spanish">Spanish/LatAm</option>
          </select>
        </div>
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
          <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl p-2 shadow-2xl">
            <div className="pl-4 pr-2 text-zinc-400">
              <Search size={24} />
            </div>
            <input
              type="text"
              value={prompt}
              onChange={(e) => {
                const val = e.target.value;
                setPrompt(val);
                // Auto-detect language from prompt to sync dropdown
                const lower = val.toLowerCase();
                if (lower.includes("hindi") || lower.includes("bollywood")) setLanguageFilter("hindi");
                if (lower.includes("korean") || lower.includes("k-drama")) setLanguageFilter("korean");
                if (lower.includes("japanese") || lower.includes("anime")) setLanguageFilter("japanese");
                if (lower.includes("spanish")) setLanguageFilter("spanish");
                if (lower.includes("french")) setLanguageFilter("french");
                if (lower.includes("tamil")) setLanguageFilter("tamil");
                if (lower.includes("telugu")) setLanguageFilter("telugu");
              }}
              placeholder="e.g., movies for lonely nights, epic space operas, uplifting comfort..."
              className="w-full bg-transparent border-none outline-none text-white text-lg py-3 placeholder:text-zinc-600"
            />
            <button
              type="submit"
              disabled={isSearching || !prompt.trim()}
              className="ml-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSearching ? <Loader2 size={20} className="animate-spin" /> : "Discover"}
            </button>
          </div>
        </form>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold mr-2">
            Try:
          </span>
          {[
            "mind-bending thrillers",
            "cozy rainy day films",
            "existential sci-fi",
            "laugh out loud comedy",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setPrompt(suggestion)}
              className="text-xs px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:border-purple-500/50 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Mood Categories Matrix */}
      {!results && !isSearching && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-10 border-t border-zinc-800/50"
        >
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="text-amber-400" />
            <h3 className="text-xl font-bold text-white">Browse by Mood</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {moodCategories.map((mood, i) => (
              <motion.button
                key={mood.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => loadCategory(mood.name)}
                className="relative overflow-hidden group rounded-xl aspect-[3/2] flex flex-col items-center justify-center text-center p-4 border border-zinc-800 bg-zinc-900/40 hover:border-purple-500/50 transition-colors"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                {/* Background colored glow based on index */}
                <div
                  className={`absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity bg-gradient-to-br ${
                    i % 3 === 0
                      ? "from-purple-500 to-indigo-500"
                      : i % 3 === 1
                      ? "from-pink-500 to-rose-500"
                      : "from-amber-500 to-orange-500"
                  }`}
                />
                <div className="relative z-20">
                  <h4 className="font-bold text-white mb-1 group-hover:scale-110 transition-transform">
                    {mood.name}
                  </h4>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-8"
          >
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">
                {results.message || "Your AI Curated Picks"}
              </h3>
              {results.matchedMoods && results.matchedMoods.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-zinc-500 text-sm">Detected vibes:</span>
                  <div className="flex gap-2">
                    {results.matchedMoods.map((m) => (
                      <span
                        key={m}
                        className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {results.movies?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {results.movies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                <p className="text-zinc-400 text-lg">
                  We couldn't find an exact match, try adjusting your mood.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
