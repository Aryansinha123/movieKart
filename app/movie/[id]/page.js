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
import Link from "next/link";

import { getImagePath } from "@/utils/imagePath";
import WatchlistButton from "@/components/movie/WatchListButton";
import WatchedButton from "@/components/movie/WatchedButton";
import FavoriteButton from "@/components/movie/FavoriteButton";
import ReviewsSection from "@/components/movie/ReviewsSection";
import CollectionPicker from "@/components/collection/CollectionPicker";
import WhereToWatch from "@/components/movie/WhereToWatch";
import { parseWatchProviders } from "@/lib/ottProviders";
import { Star, Check, Heart } from "lucide-react";
import { getPersonUrl, getMovieUrl } from "@/utils/slugify";
import Recommendations from "@/components/movie/Recommendations";
import SeasonsList from "@/components/movie/SeasonsList";

export const dynamic = "force-dynamic";

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

async function getMovie(idStr) {
  if (!process.env.TMDB_API_KEY) return null;

  try {
    const numericId = parseInt(idStr, 10);
    const isTv = numericId < 0;
    const realId = isTv ? -numericId : numericId;
    const path = isTv 
      ? `/tv/${realId}?append_to_response=images,keywords,credits` 
      : `/movie/${realId}?append_to_response=images,keywords,credits`;

    const res = await fetchWithRetry(`https://api.themoviedb.org/3${path}`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data) return null;
    
    // Inline mapping logic to support TV shows on this page
    return {
      ...data,
      id: isTv ? -realId : realId,
      title: data.name || data.title,
      release_date: data.first_air_date || data.release_date,
      media_type: isTv ? "tv" : "movie",
      runtime: isTv ? (data.episode_run_time?.[0] || 0) : data.runtime,
      spoken_languages: data.spoken_languages,
      adult: data.adult,
      number_of_seasons: data.number_of_seasons,
      number_of_episodes: data.number_of_episodes,
      seasons: data.seasons,
      networks: data.networks,
      status: data.status,
      tagline: data.tagline,
      created_by: data.created_by,
      images: data.images,
    };
  } catch (err) {
    console.error(`Failed to fetch movie ${idStr}:`, err?.message || err);
    return null;
  }
}


async function getVideos(idStr) {
  if (!process.env.TMDB_API_KEY) return null;

  try {
    const numericId = parseInt(idStr, 10);
    const isTv = numericId < 0;
    const realId = isTv ? -numericId : numericId;
    const path = isTv ? `/tv/${realId}/videos` : `/movie/${realId}/videos`;

    const res = await fetchWithRetry(`https://api.themoviedb.org/3${path}`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (err) {
    console.error(`Failed to fetch videos for ${idStr}:`, err?.message || err);
    return null;
  }
}

async function getCredits(idStr) {
  if (!process.env.TMDB_API_KEY) return null;

  try {
    const numericId = parseInt(idStr, 10);
    const isTv = numericId < 0;
    const realId = isTv ? -numericId : numericId;
    const path = isTv ? `/tv/${realId}/credits` : `/movie/${realId}/credits`;

    const res = await fetchWithRetry(`https://api.themoviedb.org/3${path}`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (err) {
    console.error(`Failed to fetch credits for ${idStr}:`, err?.message || err);
    return null;
  }
}

async function getWatchProviders(idStr) {
  if (!process.env.TMDB_API_KEY) return null;

  try {
    const numericId = parseInt(idStr, 10);
    const isTv = numericId < 0;
    const realId = isTv ? -numericId : numericId;
    const path = isTv ? `/tv/${realId}/watch/providers` : `/movie/${realId}/watch/providers`;

    const res = await fetchWithRetry(`https://api.themoviedb.org/3${path}`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (err) {
    console.error(`Failed to fetch watch providers for ${idStr}:`, err?.message || err);
    return null;
  }
}

import { SITE_URL, SITE_NAME } from "@/lib/seo.config";
import JsonLd from "@/components/JsonLd";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const rawId = resolvedParams?.id;
  let id = null;
  if (rawId && /^-?\d+/.test(rawId)) {
    id = parseInt(rawId, 10);
  }

  console.log(`[Server-Metadata] Received route parameter rawId: "${rawId}", Parsed Movie ID: ${id}`);

  const movie = id ? await getMovie(id) : null;

  if (movie) {
    console.log(`[Server-Metadata] Fetched Movie ID: ${movie.id}, Title: "${movie.title}"`);
    if (movie.id !== id) {
      console.warn(`[Server-Metadata] WARNING: Parsed ID (${id}) does not match fetched ID (${movie.id})!`);
    }
  } else {
    console.log(`[Server-Metadata] No movie found for ID: ${id}`);
  }

  if (!movie) return { title: "Movie not found" };

  const year = movie.release_date?.substring(0, 4) || "TBA";
  const title = `${movie.title} (${year})`;
  const description =
    movie.overview?.substring(0, 160) ||
    `Watch ${movie.title} — discover details, trailers, cast, and where to stream on MovieKart.`;
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
    : undefined;
  const pageUrl = movie ? `${SITE_URL}${getMovieUrl(movie.id, movie.title)}` : `${SITE_URL}/movie/${rawId}`;

  return {
    title,
    description,
    keywords: [
      movie.title,
      ...(movie.genres?.map((g) => g.name) || []),
      "movie",
      "watch",
      "stream",
      "review",
      SITE_NAME,
    ],
    openGraph: {
      type: "video.movie",
      title: `${title} | ${SITE_NAME}`,
      description,
      url: pageUrl,
      siteName: SITE_NAME,
      ...(posterUrl && {
        images: [
          {
            url: posterUrl,
            width: 780,
            height: 1170,
            alt: `${movie.title} poster`,
          },
        ],
      }),
      releaseDate: movie.release_date,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      ...(posterUrl && { images: [posterUrl] }),
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

export default async function MoviePage({ params }) {
  const resolvedParams = await params;
  const rawId = resolvedParams?.id;
  let id = null;
  if (rawId && /^-?\d+/.test(rawId)) {
    id = parseInt(rawId, 10);
  }

  console.log(`[Server-MoviePage] Received route parameter rawId: "${rawId}", Parsed Movie ID: ${id}`);

  const movie = id ? await getMovie(id) : null;

  if (movie) {
    console.log(`[Server-MoviePage] Fetched Movie ID: ${movie.id}, Title: "${movie.title}"`);
    if (movie.id !== id) {
      console.warn(`[Server-MoviePage] WARNING: Parsed ID (${id}) does not match fetched ID (${movie.id})!`);
    }
  } else {
    console.log(`[Server-MoviePage] No movie found for ID: ${id}`);
  }

  const credits = id ? await getCredits(id) : null;
  const watchProvidersRes = id ? await getWatchProviders(id) : null;
  const videosRes = id ? await getVideos(id) : null;

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

  const { providers, watchLink } = parseWatchProviders(watchProvidersRes, movie.title);

  const director = credits?.crew?.find((c) => c.job === "Director");
  const topActors = credits?.cast?.slice(0, 5) || [];

  const movieJsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.overview,
    datePublished: movie.release_date,
    genre: movie.genres?.map((g) => g.name),
    ...(movie.poster_path && {
      image: `https://image.tmdb.org/t/p/w780${movie.poster_path}`,
    }),
    ...(director && {
      director: {
        "@type": "Person",
        name: director.name,
        url: `${SITE_URL}${getPersonUrl(director.id, director.name)}`,
      },
    }),
    ...(topActors.length > 0 && {
      actor: topActors.map((a) => ({
        "@type": "Person",
        name: a.name,
        url: `${SITE_URL}${getPersonUrl(a.id, a.name)}`,
      })),
    }),
    ...(movie.vote_average > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: movie.vote_average?.toFixed(1),
        bestRating: 10,
        ratingCount: movie.vote_count || 0,
      },
    }),
    url: `${SITE_URL}/movie/${id}`,
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <JsonLd data={movieJsonLd} />
      {/* Backdrop */}
      <div className="relative h-[35vh] sm:h-[50vh] md:h-[60vh] lg:h-[65vh] w-full overflow-hidden">
        {movie.backdrop_path ? (
          <Image
            src={getImagePath(movie.backdrop_path)}
            alt={movie.title || "Movie Backdrop"}
            fill
            className="object-cover opacity-50"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent z-10" />
      </div>

      {/* Movie Details Wrapper */}
      <div className="w-full max-w-6xl mx-auto px-6 md:px-10 pb-10 -mt-20 sm:-mt-28 md:-mt-36 lg:-mt-44 relative z-20">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          {movie.poster_path && (
            <div className="shrink-0 w-48 sm:w-56 md:w-64 lg:w-[300px] aspect-[2/3] relative shadow-2xl shadow-black/85 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
              <Image
                src={getImagePath(movie.poster_path)}
                alt={movie.title || "Movie Poster"}
                fill
                sizes="(max-width: 640px) 192px, (max-width: 768px) 224px, (max-width: 1024px) 256px, 300px"
                className="object-cover"
                priority
              />
            </div>
          )}

          <div className="flex-1 text-center md:text-left pt-4 md:pt-12 lg:pt-16">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight">
                {movie.title}
              </h1>

              {movie.tagline && (
                <p className="text-zinc-400 italic text-sm md:text-base lg:text-lg mt-2 font-medium">
                  &ldquo;{movie.tagline}&rdquo;
                </p>
              )}

              <p className="text-zinc-300 mt-4 text-sm md:text-base lg:text-lg max-w-2xl line-clamp-3 md:line-clamp-none">
                {movie.overview}
              </p>

              {movie.media_type === "tv" && movie.created_by?.length > 0 ? (
                <div className="mt-4 text-sm md:text-base">
                  <span className="text-zinc-500 font-semibold uppercase tracking-wider text-xs">Created By:</span>
                  {movie.created_by.map((creator, index) => (
                    <Link 
                      key={creator.id}
                      href={getPersonUrl(creator.id, creator.name)}
                      className="ml-2 text-white font-bold hover:text-red-500 transition-colors"
                    >
                      {creator.name}{index < movie.created_by.length - 1 ? ", " : ""}
                    </Link>
                  ))}
                </div>
              ) : credits?.crew?.find(c => c.job === "Director") ? (
                <div className="mt-4 text-sm md:text-base">
                  <span className="text-zinc-500 font-semibold uppercase tracking-wider text-xs">Director:</span>
                  <Link 
                    href={getPersonUrl(credits.crew.find(c => c.job === "Director").id, credits.crew.find(c => c.job === "Director").name)}
                    className="ml-2 text-white font-bold hover:text-red-500 transition-colors"
                  >
                    {credits.crew.find(c => c.job === "Director").name}
                  </Link>
                </div>
              ) : null}

              <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6 mt-6 text-zinc-400 text-sm md:text-base font-medium">
                <p className="flex items-center gap-1.5 text-amber-400">
                  <Star size={16} fill="currentColor" /> {movie.vote_average?.toFixed(1)}
                </p>

                <p>{movie.release_date?.substring(0, 4)}</p>

                {movie.media_type === "tv" ? (
                  <>
                    <p>{movie.number_of_seasons} Seasons</p>
                    <p>{movie.number_of_episodes} Episodes</p>
                    {movie.runtime > 0 && <p>{movie.runtime} mins per episode</p>}
                  </>
                ) : (
                  <p>{movie.runtime} mins</p>
                )}

                {movie.adult && (
                  <span className="px-1.5 py-0.5 rounded border border-red-500/50 text-red-500 text-[10px] font-bold">
                    18+
                  </span>
                )}

                {movie.media_type === "tv" && movie.status && (
                  <span className="px-2 py-0.5 rounded border border-cyan-500/50 text-cyan-400 text-[10px] font-bold uppercase tracking-wider bg-cyan-950/20">
                    Status: {movie.status}
                  </span>
                )}
              </div>

              {movie.spoken_languages?.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span>Languages:</span>
                    <span className="text-zinc-300">
                      {movie.spoken_languages.map(l => l.english_name || l.name).join(", ")}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-6">
                {movie.genres?.map((genre) => (
                  <span
                    key={genre.id}
                    className="bg-zinc-800/80 backdrop-blur-md px-3 py-1 md:px-4 md:py-1.5 rounded-full text-xs md:text-sm font-medium border border-zinc-700/50"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>

              {movie.networks?.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center md:justify-start items-center gap-3">
                  <span className="text-zinc-500 font-semibold uppercase tracking-wider text-xs">Networks:</span>
                  <div className="flex flex-wrap gap-2">
                    {movie.networks.map(net => (
                      <span key={net.id} className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        {net.logo_path ? (
                          <div className="relative w-12 h-4">
                            <Image
                              src={`https://image.tmdb.org/t/p/h30${net.logo_path}`}
                              alt={net.name}
                              fill
                              className="object-contain filter invert"
                            />
                          </div>
                        ) : net.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {movie.production_companies?.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center md:justify-start items-center gap-3">
                  <span className="text-zinc-500 font-semibold uppercase tracking-wider text-xs">Production:</span>
                  <div className="flex flex-wrap gap-2">
                    {movie.production_companies.slice(0, 3).map(company => (
                      <span key={company.id} className="px-2 py-0.5 rounded bg-zinc-900/60 border border-zinc-800/80 text-[10px] font-medium text-zinc-400">
                        {company.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <WhereToWatch providers={providers} watchLink={watchLink} variant="desktop" />

              <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-8">
                <WatchlistButton movieId={movie.id} />
                <CollectionPicker movieId={movie.id} />
                <WatchedButton
                  movieId={movie.id}
                  className="bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 border border-zinc-700"
                >
                  <Check size={18} />
                  Watched
                </WatchedButton>
                <FavoriteButton
                  movieId={movie.id}
                  className="bg-pink-600/90 hover:bg-pink-600 px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 border border-pink-500/30 shadow-lg shadow-pink-500/10"
                >
                  <Heart size={18} />
                  Favorite
                </FavoriteButton>
              </div>
            </div>
          </div>
        </div>

      <WhereToWatch providers={providers} watchLink={watchLink} variant="mobile" />

      {/* Videos / Trailers */}
      {Array.isArray(videosRes?.results) && videosRes.results.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 md:px-10 mt-10">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            Videos <span className="text-zinc-500 text-sm font-normal">({videosRes.results.length})</span>
          </h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {videosRes.results
              .filter(v => v.site === "YouTube")
              .slice(0, 4)
              .map((video) => (
                <div key={video.id} className="space-y-3">
                  <div className="aspect-video rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${video.key}`}
                      title={video.name}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    ></iframe>
                  </div>
                  <div className="px-2">
                    <h3 className="font-semibold text-sm truncate">{video.name}</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                      {video.type}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Cast */}
      {Array.isArray(credits?.cast) && credits.cast.length > 0 ? (
        <section className="max-w-6xl mx-auto px-6 md:px-10 pt-10">
          <h2 className="text-2xl font-bold">Cast</h2>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {credits.cast.slice(0, 12).map((p) => (
              <Link
                key={p.cast_id ?? p.credit_id ?? p.id}
                href={getPersonUrl(p.id, p.name)}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden hover:border-red-500/50 transition-colors group"
              >
                {p.profile_path ? (
                  <Image
                    src={getImagePath(p.profile_path)}
                    alt={p.name}
                    width={300}
                    height={450}
                    className="w-full h-[210px] object-cover group-hover:scale-105 transition-transform duration-500"
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
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Seasons List (TV only) */}
      {movie.media_type === "tv" && movie.seasons?.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 md:px-10 pt-10">
          <h2 className="text-2xl font-bold mb-6">Seasons</h2>
          <SeasonsList seasons={movie.seasons} seriesId={movie.id} />
        </section>
      )}

      {/* Gallery Section */}
      {movie.images?.backdrops?.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 md:px-10 pt-10">
          <h2 className="text-2xl font-bold mb-6">Gallery</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {movie.images.backdrops.slice(0, 6).map((img, idx) => (
              <div key={idx} className="aspect-video relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 group">
                <Image
                  src={`https://image.tmdb.org/t/p/w780${img.file_path}`}
                  alt={`${movie.title} Backdrop ${idx + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations */}
      <Recommendations movieId={movie.id} />

      <ReviewsSection movieId={movie.id} />
    </main>
  );
}