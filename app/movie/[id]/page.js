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
import CollectionPicker from "@/components/collection/CollectionPicker";

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

      const isAbort = err?.name === "AbortError" || err?.cause?.name === "AbortError";
      const isConnReset = err?.cause?.code === "ECONNRESET" || err?.code === "ECONNRESET";
      const isTypeError = err?.name === "TypeError";
      const isRetryable = isAbort || isConnReset || isTypeError;

      if (!isRetryable || attempt === retries) break;
      const backoffMs = 250 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  throw lastError;
}

async function getMovie(id) {
  if (!process.env.TMDB_API_KEY) return null;

  try {
    const res = await fetchWithRetry(`https://api.themoviedb.org/3/movie/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (err) {
    console.error(`Failed to fetch movie ${id}:`, err?.message || err);
    return null;
  }
}

async function getCredits(id) {
  if (!process.env.TMDB_API_KEY) return null;

  try {
    const res = await fetchWithRetry(`https://api.themoviedb.org/3/movie/${id}/credits`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (err) {
    console.error(`Failed to fetch credits for ${id}:`, err?.message || err);
    return null;
  }
}

async function getWatchProviders(id) {
  if (!process.env.TMDB_API_KEY) return null;

  try {
    const res = await fetchWithRetry(`https://api.themoviedb.org/3/movie/${id}/watch/providers`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (err) {
    console.error(`Failed to fetch watch providers for ${id}:`, err?.message || err);
    return null;
  }
}

export default async function MoviePage({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;
  const movie = id ? await getMovie(id) : null;
  const credits = id ? await getCredits(id) : null;
  const watchProvidersRes = id ? await getWatchProviders(id) : null;

  let providers = [];
  let watchLink = null;
  if (watchProvidersRes?.results) {
    const country =
      watchProvidersRes.results["US"] ||
      watchProvidersRes.results["IN"] ||
      watchProvidersRes.results["GB"] ||
      Object.values(watchProvidersRes.results)[0];
    
    if (country) {
      providers = country.flatrate || country.rent || country.buy || [];
      // Remove duplicates by provider_id
      providers = Array.from(new Map(providers.map(p => [p.provider_id, p])).values());
      watchLink = country.link;
    }
  }

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
                  className="bg-zinc-800 px-4 py-2 rounded-full text-sm font-medium"
                >
                  {genre.name}
                </span>
              ))}
            </div>

            {providers.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm text-zinc-400 font-semibold mb-3">Where to Watch</h3>
                <div className="flex flex-wrap items-center gap-3">
                  {providers.slice(0, 5).map((provider) => (
                    <div
                      key={provider.provider_id}
                      className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-700/50"
                      title={provider.provider_name}
                    >
                      <Image
                        src={`https://image.tmdb.org/t/p/w200${provider.logo_path}`}
                        alt={provider.provider_name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {watchLink && (
                    <a
                      href={watchLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 bg-cyan-400/10 px-3 py-1.5 rounded-full border border-cyan-400/20"
                    >
                      Watch Now ↗
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <WatchlistButton movieId={movie.id} />

              <CollectionPicker movieId={movie.id} />

              <button className="bg-zinc-800 px-6 py-3 rounded-lg font-semibold hover:bg-zinc-700">
                ✓ Watched
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cast */}
      {Array.isArray(credits?.cast) && credits.cast.length > 0 ? (
        <section className="max-w-6xl mx-auto px-10 pt-10">
          <h2 className="text-2xl font-bold">Cast</h2>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {credits.cast.slice(0, 12).map((p) => (
              <div
                key={p.cast_id ?? p.credit_id ?? p.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden"
              >
                {p.profile_path ? (
                  <Image
                    src={getImagePath(p.profile_path)}
                    alt={p.name}
                    width={300}
                    height={450}
                    className="w-full h-[210px] object-cover"
                  />
                ) : (
                  <div className="w-full h-[210px] bg-zinc-800 flex items-center justify-center text-zinc-400 text-sm">
                    No Image
                  </div>
                )}
                <div className="p-3">
                  <p className="font-semibold text-sm truncate">{p.name}</p>
                  <p className="text-xs text-zinc-400 mt-1 truncate">{p.character}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <ReviewsSection movieId={movie.id} />
    </main>
  );
}