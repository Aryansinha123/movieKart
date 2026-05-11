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
import WatchlistButton from "@/components/movie/WatchListButton";
import ReviewsSection from "@/components/movie/ReviewsSection";

async function fetchWithRetry(url, init, { retries = 2, timeoutMs = 8000 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      const isAbort = err?.name === "AbortError";
      const isConnReset = err?.cause?.code === "ECONNRESET" || err?.code === "ECONNRESET";
      const isRetryable = isAbort || isConnReset;

      if (!isRetryable || attempt === retries) break;
      const backoffMs = 250 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  throw lastError;
}

async function getMovie(id) {
  if (!process.env.TMDB_API_KEY) return null;

  const res = await fetchWithRetry(`https://api.themoviedb.org/3/movie/${id}`, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return await res.json().catch(() => null);
}

export default async function MoviePage({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;
  const movie = id ? await getMovie(id) : null;

  if (!movie) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-xl text-center">
          <h1 className="text-3xl font-bold">Movie not found</h1>
          <p className="text-zinc-400 mt-3">
            We couldn’t load this movie right now. Please refresh and try again.
          </p>
        </div>
      </main>
    );
  }

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
              <WatchlistButton movieId={movie.id} />

              <button className="bg-zinc-800 px-6 py-3 rounded-lg font-semibold hover:bg-zinc-700">
                ✓ Watched
              </button>
            </div>
          </div>
        </div>
      </div>

      <ReviewsSection movieId={movie.id} />
    </main>
  );
}