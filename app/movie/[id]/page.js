// import Image from "next/image";

// import { getImagePath } from "@/utils/imagePath";

// async function getMovie(id) {
//   const res = await fetch(
//     `${process.env.NEXT_PUBLIC_BASE_URL}/api/movies/${id}`,
//     {
//       cache: "no-store",
//     }
//   );

//   return res.json();
// }

// export default async function MoviePage({ params }) {
//   const movie = await getMovie(params.id);

//   return (
//     <main className="min-h-screen bg-black text-white">
//       {/* Backdrop */}
//       <div className="relative h-[70vh]">
//         <Image
//           src={getImagePath(movie.backdrop_path)}
//           alt={movie.title}
//           fill
//           className="object-cover opacity-40"
//         />

//         <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />

//         <div className="absolute bottom-10 left-10 flex gap-8">
//           <Image
//             src={getImagePath(movie.poster_path)}
//             alt={movie.title}
//             width={300}
//             height={450}
//             className="rounded-xl"
//           />

//           <div className="max-w-2xl">
//             <h1 className="text-6xl font-bold">
//               {movie.title}
//             </h1>

//             <p className="text-zinc-300 mt-4">
//               {movie.overview}
//             </p>

//             <div className="flex gap-6 mt-6 text-zinc-400">
//               <p>⭐ {movie.vote_average}</p>

//               <p>{movie.release_date}</p>

//               <p>
//                 {movie.runtime} mins
//               </p>
//             </div>

//             <div className="flex flex-wrap gap-3 mt-6">
//               {movie.genres?.map((genre) => (
//                 <span
//                   key={genre.id}
//                   className="bg-zinc-800 px-4 py-2 rounded-full"
//                 >
//                   {genre.name}
//                 </span>
//               ))}
//             </div>

//             <div className="flex gap-4 mt-8">
//               <button className="bg-red-500 px-6 py-3 rounded-lg font-semibold hover:bg-red-600">
//                 + Watchlist
//               </button>

//               <button className="bg-zinc-800 px-6 py-3 rounded-lg font-semibold hover:bg-zinc-700">
//                 ✓ Watched
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </main>
//   );
// }
import Image from "next/image";

import { getImagePath } from "@/utils/imagePath";

async function getMovie(id) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/movies/${id}`,
    {
      cache: "no-store",
    }
  );

  return res.json();
}

export default async function MoviePage(context) {
  const params = await context.params;

  const movie = await getMovie(params.id);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Backdrop */}
      <div className="relative h-[70vh]">
        {movie.backdrop_path && (
          <Image
            src={getImagePath(movie.backdrop_path)}
            alt={movie.title || "Movie Backdrop"}
            fill
            className="object-cover opacity-40"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />

        <div className="absolute bottom-10 left-10 flex gap-8">
          {movie.poster_path && (
            <Image
              src={getImagePath(movie.poster_path)}
              alt={movie.title || "Movie Poster"}
              width={300}
              height={450}
              className="rounded-xl"
            />
          )}

          <div className="max-w-2xl">
            <h1 className="text-6xl font-bold">
              {movie.title}
            </h1>

            <p className="text-zinc-300 mt-4">
              {movie.overview}
            </p>

            <div className="flex gap-6 mt-6 text-zinc-400">
              <p>⭐ {movie.vote_average}</p>

              <p>{movie.release_date}</p>

              <p>
                {movie.runtime} mins
              </p>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              {movie.genres?.map((genre) => (
                <span
                  key={genre.id}
                  className="bg-zinc-800 px-4 py-2 rounded-full"
                >
                  {genre.name}
                </span>
              ))}
            </div>

            <div className="flex gap-4 mt-8">
              <button className="bg-red-500 px-6 py-3 rounded-lg font-semibold hover:bg-red-600">
                + Watchlist
              </button>

              <button className="bg-zinc-800 px-6 py-3 rounded-lg font-semibold hover:bg-zinc-700">
                ✓ Watched
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}