"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Bookmark, Check, ListPlus, Eye, Trash2, Heart, Calendar, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

import { getImagePath } from "@/utils/imagePath";
import WatchlistButton from "./WatchListButton";
import WatchedButton from "./WatchedButton";
import FavoriteButton from "./FavoriteButton";
import CollectionPicker from "../collection/CollectionPicker";
import { useUserMovies } from "../providers/UserProvider";
import { getMovieUrl } from "@/utils/slugify";
import ShatterEffect from "@/components/ui/ShatterEffect";

const formatDate = (dateString) => {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;
  const [year, month, day] = parts;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = parseInt(month, 10) - 1;
  const monthName = months[monthIndex] || month;
  return `${monthName} ${parseInt(day, 10)}, ${year}`;
};

export default function MovieCard({ 
  movie, 
  priority = false, 
  mode = "default", // "default", "watchlist", "watched", "favorites"
  onRemove,
  onWatchedSuccess,
  showFullReleaseDate = false
}) {
  const { 
    watchedIds, 
    watchlistIds, 
    favoriteIds, 
    notInterestedIds, 
    hideTitle, 
    restoreTitle 
  } = useUserMovies() || { 
    watchedIds: new Set(), 
    watchlistIds: new Set(), 
    favoriteIds: new Set(), 
    notInterestedIds: new Set() 
  };

  const [shatterState, setShatterState] = useState("idle"); // "idle" | "shattering" | "shattered" | "reversing"
  const [cardRect, setCardRect] = useState(null);
  const cardRef = useRef(null);
  const undoTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        hideTitle?.(movie);
      }
    };
  }, [movie, hideTitle]);

  const isWatched = watchedIds.has(Number(movie.id));
  const isWatchlist = watchlistIds.has(Number(movie.id));
  const isFavorite = favoriteIds.has(Number(movie.id));
  const isHiddenGlobal = notInterestedIds.has(Number(movie.id));

  const handleNotInterested = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (cardRef.current) {
      setCardRect(cardRef.current.getBoundingClientRect());
    }
    setShatterState("shattering");

    // Commit the action after 5 seconds if not undone
    undoTimerRef.current = setTimeout(() => {
      undoTimerRef.current = null;
      hideTitle?.(movie);
    }, 5000);

    const toastId = toast((t) => (
      <div className="flex items-center justify-between gap-6 bg-zinc-950/90 border border-zinc-800/80 backdrop-blur-xl px-5 py-3.5 rounded-2xl shadow-2xl text-white min-w-[320px]">
        <span className="text-sm font-semibold text-zinc-200">We'll show you fewer titles like this.</span>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            if (undoTimerRef.current) {
              clearTimeout(undoTimerRef.current);
              undoTimerRef.current = null;
            }
            setShatterState("reversing");
          }}
          className="text-xs font-extrabold uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-800/60 shadow-lg shadow-cyan-500/10 cursor-pointer"
        >
          Undo
        </button>
      </div>
    ), {
      duration: 5000,
      position: "bottom-center",
      style: {
        background: "transparent",
        border: "none",
        boxShadow: "none",
        padding: 0,
      }
    });
  };

  if (isHiddenGlobal && shatterState === "idle") {
    return null;
  }

  const isAnimating = shatterState !== "idle";
  const contentOpacityClass = (shatterState === "shattering" || shatterState === "shattered")
    ? "opacity-0 scale-95 pointer-events-none transition-all duration-700 ease-out"
    : "opacity-100 scale-100 transition-all duration-700 ease-out";

  return (
    <div 
      ref={cardRef}
      className={`group relative w-full rounded-xl border border-zinc-800/50 bg-zinc-900/30 transition-all duration-300 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-1 ${
        isAnimating ? "pointer-events-none" : "overflow-hidden"
      }`}
    >
      <div className={contentOpacityClass}>
        <Link href={getMovieUrl(movie.id, movie.title)}>
          <div className="relative">
            {movie.poster_path ? (
              <Image
                src={getImagePath(movie.poster_path)}
                alt={movie.title || "Movie"}
                width={500}
                height={750}
                priority={priority}
                className="w-full h-[350px] object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-[350px] bg-zinc-800 flex items-center justify-center text-zinc-500 text-sm">
                No Image
              </div>
            )}
            
            {/* Badges Overlay */}
            <div className="absolute top-0 left-0 z-10 flex flex-col gap-1">
              {isWatched && (
                <div className="px-3 py-1 bg-emerald-500/90 text-white text-[10px] font-bold tracking-wider rounded-br-lg shadow-lg backdrop-blur-md flex items-center gap-1 border-b border-r border-white/20">
                  <Check size={10} strokeWidth={3} />
                  WATCHED
                </div>
              )}
              {isWatchlist && (
                <div className="px-3 py-1 bg-rose-600/90 text-white text-[10px] font-bold tracking-wider rounded-br-lg shadow-lg backdrop-blur-md flex items-center gap-1 border-b border-r border-white/20 self-start">
                  <Bookmark size={10} fill="currentColor" />
                  WATCHLIST
                </div>
              )}
            </div>

            {/* Top-Right Favorite Indicator */}
            {isFavorite && (
              <div className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full bg-zinc-950/70 border border-pink-500/30 text-pink-500 shadow-md shadow-pink-500/10 backdrop-blur-md transition-all duration-300 group-hover:opacity-0 group-hover:scale-75 pointer-events-none">
                <Heart size={14} fill="currentColor" />
              </div>
            )}
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />

            <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col justify-end">
              <h2 className="font-bold text-lg text-white leading-tight line-clamp-2">
                {movie.title}
              </h2>

              <div className="flex items-center gap-3 mt-2">
                {movie.vote_average ? (
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                    <Star size={12} fill="currentColor" />
                    {Number(movie.vote_average).toFixed(1)}
                  </span>
                ) : null}
                {showFullReleaseDate && movie.release_date ? (
                  <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1 bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-500/30">
                    <Calendar size={12} className="stroke-[2.5px]" />
                    {formatDate(movie.release_date)}
                  </span>
                ) : movie.release_date ? (
                  <span className="text-xs font-medium text-zinc-300 bg-zinc-800/80 px-2 py-0.5 rounded-full">
                    {movie.release_date.substring(0, 4)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </Link>

        {/* Hover Actions */}
        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 z-20">
          <button
            onClick={handleNotInterested}
            className="p-2.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-red-500 hover:border-red-500/50 hover:bg-zinc-800 transition-all shadow-xl backdrop-blur-md"
            title="Not Interested"
          >
            <EyeOff size={18} />
          </button>

          {mode === "watchlist" ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove?.(movie.id);
              }}
              className="p-2.5 rounded-full bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xl backdrop-blur-md"
              title="Remove from watchlist"
            >
              <Trash2 size={18} />
            </button>
          ) : (
            <WatchlistButton
              movieId={movie.id}
              className="p-2.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-red-500 hover:border-red-500/50 hover:bg-zinc-800 transition-all shadow-xl backdrop-blur-md"
            >
              <Bookmark size={18} />
            </WatchlistButton>
          )}
          
          {mode === "watched" ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove?.(movie.id);
              }}
              className="p-2.5 rounded-full bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xl backdrop-blur-md"
              title="Remove from watched"
            >
              <Trash2 size={18} />
            </button>
          ) : (
            <WatchedButton
              movieId={movie.id}
              onSuccess={onWatchedSuccess}
              className="p-2.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-zinc-800 transition-all shadow-xl backdrop-blur-md"
            >
              <Check size={18} />
            </WatchedButton>
          )}

          {mode === "favorites" ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove?.(movie.id);
              }}
              className="p-2.5 rounded-full bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xl backdrop-blur-md"
              title="Remove from favorites"
            >
              <Trash2 size={18} />
            </button>
          ) : (
            <FavoriteButton
              movieId={movie.id}
              className="p-2.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-pink-500 hover:border-pink-500/50 hover:bg-zinc-800 transition-all shadow-xl backdrop-blur-md"
            >
              <Heart size={18} />
            </FavoriteButton>
          )}

          <CollectionPicker
            movieId={movie.id}
            className="p-2.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-cyan-500 hover:border-cyan-500/50 hover:bg-zinc-800 transition-all shadow-xl backdrop-blur-md"
          >
            <ListPlus size={18} />
          </CollectionPicker>
        </div>
      </div>

      {/* Glass Shatter Physics Simulation overlay */}
      {isAnimating && cardRect && (
        <ShatterEffect
          rect={cardRect}
          imageUrl={movie.poster_path ? getImagePath(movie.poster_path) : null}
          isReversing={shatterState === "reversing"}
          onComplete={() => setShatterState("shattered")}
          onReverseComplete={() => {
            setShatterState("idle");
            restoreTitle?.(movie.id);
          }}
        />
      )}
    </div>
  );
}