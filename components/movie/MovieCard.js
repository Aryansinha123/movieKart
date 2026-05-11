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

import { getImagePath } from "@/utils/imagePath";

export default function MovieCard({ movie }) {
  return (
    <Link href={`/movie/${movie.id}`}>
      <div className="bg-zinc-900 rounded-xl overflow-hidden hover:scale-105 transition duration-300 cursor-pointer">
        {movie.poster_path ? (
          <Image
            src={getImagePath(movie.poster_path)}
            alt={movie.title}
            width={500}
            height={750}
            className="w-full h-[350px] object-cover"
          />
        ) : (
          <div className="h-[350px] bg-zinc-800 flex items-center justify-center">
            No Image
          </div>
        )}

        <div className="p-4">
          <h2 className="font-bold text-lg">
            {movie.title}
          </h2>

          <p className="text-zinc-400 text-sm mt-2">
            ⭐ {movie.vote_average}
          </p>

          <p className="text-zinc-500 text-sm mt-1">
            {movie.release_date}
          </p>
        </div>
      </div>
    </Link>
  );
}