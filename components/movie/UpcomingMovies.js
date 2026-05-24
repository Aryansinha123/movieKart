"use client";

import { useEffect, useState, useRef } from "react";
import MovieCard from "./MovieCard";
import { Clock } from "lucide-react";

export default function UpcomingMovies() {
  const [movies, setMovies] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    async function fetchMovies() {
      try {
        const res = await fetch("/api/movies/upcoming");
        const data = await res.json().catch(() => null);

        if (!res.ok || !data || !Array.isArray(data?.results)) {
          setMovies([]);
          return;
        }

        setMovies(data.results);
      } catch {
        setMovies([]);
      }
    }

    fetchMovies();
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth, scrollWidth } = scrollRef.current;
      
      let scrollTo;
      if (direction === "left") {
        if (scrollLeft <= 10) {
          scrollTo = scrollWidth;
        } else {
          scrollTo = scrollLeft - clientWidth;
        }
      } else {
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollTo = 0;
        } else {
          scrollTo = scrollLeft + clientWidth;
        }
      }
      
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (movies.length === 0) return null;

  return (
    <section className="py-10 border-t border-zinc-800/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Clock size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Upcoming Movies</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Exciting films coming to theaters soon</p>
        </div>
      </div>

      <div className="group relative -mx-6 px-6 sm:mx-0 sm:px-0">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/60 hover:bg-black/90 text-white rounded-r-xl border border-zinc-700/50 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-6 pb-6 pt-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {movies.map((movie) => (
            <div key={movie.id} className="w-[45vw] sm:w-[240px] md:w-[260px] flex-shrink-0 snap-start">
              <MovieCard movie={movie} showFullReleaseDate={true} />
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/60 hover:bg-black/90 text-white rounded-l-xl border border-zinc-700/50 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </section>
  );
}
