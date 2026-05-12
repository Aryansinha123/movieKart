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
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";

import { getImagePath } from "@/utils/imagePath";

export default function MovieCard({ movie, priority = false }) {
  return (
    <Link href={`/movie/${movie.id}`}>
      <div className="group relative w-full rounded-xl overflow-hidden border border-zinc-800/50 bg-zinc-900/30 transition-all duration-300 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-1">
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
  );
}