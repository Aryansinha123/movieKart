// import Image from "next/image";
// import { getImagePath } from "@/utils/imagePath";

// export default function MovieCard({ movie }) {
//   return (
//     <div className="bg-zinc-900 rounded-xl overflow-hidden hover:scale-105 transition duration-300">
//       <Image
//         src={getImagePath(movie.poster_path)}
//         alt={movie.title}
//         width={500}
//         height={750}
//         className="w-full h-[350px] object-cover"
//       />

//       <div className="p-4">
//         <h2 className="font-bold text-lg">
//           {movie.title}
//         </h2>

//         <p className="text-zinc-400 text-sm mt-2">
//           ⭐ {movie.vote_average}
//         </p>

//         <p className="text-zinc-500 text-sm mt-1">
//           {movie.release_date}
//         </p>
//       </div>
//     </div>
//   );
// }
"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Bookmark, Check, ListPlus, Eye } from "lucide-react";

import { getImagePath } from "@/utils/imagePath";
import WatchlistButton from "./WatchListButton";
import WatchedButton from "./WatchedButton";
import CollectionPicker from "../collection/CollectionPicker";
import { useUserMovies } from "../providers/UserProvider";

export default function MovieCard({ movie, priority = false }) {
  const { watchedIds, watchlistIds } = useUserMovies() || { watchedIds: new Set(), watchlistIds: new Set() };
  const isWatched = watchedIds.has(Number(movie.id));
  const isWatchlist = watchlistIds.has(Number(movie.id));

  return (
    <div className="group relative w-full rounded-xl overflow-hidden border border-zinc-800/50 bg-zinc-900/30 transition-all duration-300 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-1">
      <Link href={`/movie/${movie.id}`}>
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
              {movie.release_date ? (
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
        <WatchlistButton
          movieId={movie.id}
          className="p-2.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-red-500 hover:border-red-500/50 hover:bg-zinc-800 transition-all shadow-xl backdrop-blur-md"
        >
          <Bookmark size={18} />
        </WatchlistButton>
        
        <WatchedButton
          movieId={movie.id}
          className="p-2.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-zinc-800 transition-all shadow-xl backdrop-blur-md"
        >
          <Check size={18} />
        </WatchedButton>

        <CollectionPicker
          movieId={movie.id}
          className="p-2.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-cyan-500 hover:border-cyan-500/50 hover:bg-zinc-800 transition-all shadow-xl backdrop-blur-md"
        >
          <ListPlus size={18} />
        </CollectionPicker>
      </div>
    </div>
  );
}