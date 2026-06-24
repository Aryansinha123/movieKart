"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Compass, 
  Globe, 
  Sparkles, 
  Layers, 
  Users, 
  Clapperboard, 
  Smile, 
  Hourglass 
} from "lucide-react";
import MovieCard from "./MovieCard";
import SkeletonRow from "./SkeletonRow";
import { getPersonUrl } from "@/utils/slugify";
import { getImagePath } from "@/utils/imagePath";

function LazyCarouselRow({ title, icon, subtitle, movies, renderItem }) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px" } // Pre-render when within 250px of the viewport
    );
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const scrollRef = useRef(null);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth, scrollWidth } = scrollRef.current;
      let scrollTo;
      if (direction === "left") {
        scrollTo = scrollLeft <= 10 ? scrollWidth : scrollLeft - clientWidth;
      } else {
        scrollTo = scrollLeft + clientWidth >= scrollWidth - 10 ? 0 : scrollLeft + clientWidth;
      }
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section ref={elementRef} className="py-10 border-t border-zinc-800/40">
      <div className="flex items-center gap-3 mb-6">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/10 text-white">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="group/row relative -mx-6 px-6 sm:mx-0 sm:px-0">
        {movies.length > 4 && (
          <button
            onClick={() => handleScroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 p-2.5 bg-black/80 hover:bg-cyan-600/90 text-white rounded-r-xl border border-zinc-800/80 hover:border-cyan-500/30 opacity-0 group-hover/row:opacity-100 transition-all duration-300 shadow-xl backdrop-blur-md hidden sm:block cursor-pointer hover:scale-105"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-6 pb-6 pt-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-zinc-800"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {isVisible ? (
            movies.map((item, idx) => (
              <div key={item.id || idx} className="w-[45vw] sm:w-[240px] md:w-[260px] flex-shrink-0 snap-start">
                {renderItem(item)}
              </div>
            ))
          ) : (
            Array.from({ length: Math.min(movies.length, 5) }).map((_, i) => (
              <div key={i} className="w-[45vw] sm:w-[240px] md:w-[260px] flex-shrink-0 snap-start">
                <div className="w-full h-[350px] bg-zinc-900/40 animate-pulse rounded-xl border border-zinc-800/40" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-zinc-900/50 rounded w-3/4 animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-3.5 bg-zinc-900/40 rounded-full w-12 animate-pulse" />
                    <div className="h-3.5 bg-zinc-900/40 rounded-full w-10 animate-pulse" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {movies.length > 4 && (
          <button
            onClick={() => handleScroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 p-2.5 bg-black/80 hover:bg-cyan-600/90 text-white rounded-l-xl border border-zinc-800/80 hover:border-cyan-500/30 opacity-0 group-hover/row:opacity-100 transition-all duration-300 shadow-xl backdrop-blur-md hidden sm:block cursor-pointer hover:scale-105"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        )}
      </div>
    </section>
  );
}

export default function Recommendations({ movieId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadRecommendations() {
      try {
        setLoading(true);
        setError(false);
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await fetch(`/api/movies/${movieId}/recommendations`, { headers });
        if (!res.ok) throw new Error("Failed to load recommendations");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("[Recommendations-UI] Error loading:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    if (movieId) {
      loadRecommendations();
    }
  }, [movieId]);

  if (loading) {
    return (
      <div className="space-y-6 mt-10">
        <SkeletonRow title="More Like This" />
        <SkeletonRow title="Similar Movies" />
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const renderMovieItem = (movie) => {
    return (
      <div className={`relative w-full transition-all duration-300 ${movie.isCurrent ? "border-2 border-cyan-500 rounded-xl shadow-lg shadow-cyan-500/10 scale-95 brightness-90 cursor-default" : ""}`}>
        {movie.isCurrent && (
          <div className="absolute inset-0 bg-cyan-500/5 rounded-xl border border-cyan-500/35 pointer-events-none z-10" />
        )}
        {movie.isCurrent && (
          <div className="absolute top-3 left-3 z-30 bg-cyan-500 text-black font-extrabold text-[9px] tracking-wider px-2 py-0.5 rounded-md shadow-md border border-cyan-400">
            NOW VIEWING
          </div>
        )}
        <MovieCard movie={movie} />
      </div>
    );
  };

  return (
    <div className="space-y-4 mt-10 max-w-6xl mx-auto px-6 md:px-10">
      {/* 1. More Like This */}
      <LazyCarouselRow
        title="More Like This"
        icon={<Compass size={20} />}
        subtitle="Explore titles with similar genres, themes, and styles"
        movies={data.moreLikeThis}
        renderItem={renderMovieItem}
      />

      {/* 2. From This Collection */}
      {data.collectionMovies && data.collectionMovies.length > 0 && (
        <LazyCarouselRow
          title="From This Collection"
          icon={<Layers size={20} />}
          subtitle="Explore the entire franchise or film collection"
          movies={data.collectionMovies}
          renderItem={renderMovieItem}
        />
      )}

      {/* 3. Same Cast (Grouped by Actor) */}
      {data.sameCast && data.sameCast.length > 0 && data.sameCast.map((group) => (
        <LazyCarouselRow
          key={group.actor.id}
          title={`More from ${group.actor.name}`}
          icon={
            group.actor.profile_path ? (
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-700">
                <Image
                  src={getImagePath(group.actor.profile_path)}
                  alt={group.actor.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <Users size={16} />
            )
          }
          subtitle={`Popular titles starring ${group.actor.name}`}
          movies={group.movies}
          renderItem={renderMovieItem}
        />
      ))}

      {/* 4. Same Director */}
      {data.sameDirector && data.sameDirector.length > 0 && (
        <LazyCarouselRow
          title="Same Director"
          icon={<Clapperboard size={20} />}
          subtitle="Discover other works directed by the same filmmaker"
          movies={data.sameDirector}
          renderItem={renderMovieItem}
        />
      )}



      {/* 7. Similar Mood */}
      {data.similarMood && data.similarMood.movies && data.similarMood.movies.length > 0 && (
        <LazyCarouselRow
          title={`More ${data.similarMood.mood} Movies`}
          icon={<Smile size={20} />}
          subtitle={`Similar tone, atmosphere, and mood`}
          movies={data.similarMood.movies}
          renderItem={renderMovieItem}
        />
      )}

    </div>
  );
}
