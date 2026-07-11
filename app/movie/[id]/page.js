import Image from "next/image";
import Link from "next/link";
import { redirect, permanentRedirect, notFound } from "next/navigation";
import { cache } from "react";

import { getImagePath } from "@/utils/imagePath";
import WatchlistButton from "@/components/movie/WatchListButton";
import WatchedButton from "@/components/movie/WatchedButton";
import FavoriteButton from "@/components/movie/FavoriteButton";
import ReviewsSection from "@/components/movie/ReviewsSection";
import CollectionPicker from "@/components/collection/CollectionPicker";
import WhereToWatch from "@/components/movie/WhereToWatch";
import { parseWatchProviders } from "@/lib/ottProviders";
import { Star, Check, Heart, ArrowDown } from "lucide-react";
import { getPersonUrl, getMovieUrl, slugify, parseMovieSlug } from "@/utils/slugify";
import Recommendations from "@/components/movie/Recommendations";
import SeasonsList from "@/components/movie/SeasonsList";
import ExpandableOverview from "@/components/movie/ExpandableOverview";
import Breadcrumbs from "@/components/movie/Breadcrumbs";
import ScrollToCastButton from "@/components/movie/ScrollToCastButton";
import { SITE_URL, SITE_NAME } from "@/lib/seo.config";
import JsonLd from "@/components/JsonLd";

// ISR: Revalidate pages every hour
export const revalidate = 3600;

// Dynamic fetching with retry helper
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

// Fetch raw details directly by numeric TMDB ID
async function fetchDetailsDirectly(id) {
  if (!process.env.TMDB_API_KEY) return null;
  try {
    const numericId = parseInt(id, 10);
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
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data) return null;
    
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
    console.error(`Failed to fetch movie details by ID ${id}:`, err);
    return null;
  }
}

// Resolve slug or numeric ID to TMDB movie/TV metadata
const getMovieOrTv = cache(async (rawId) => {
  if (!rawId) return null;
  const { id } = parseMovieSlug(rawId);
  if (id !== null) {
    return fetchDetailsDirectly(id);
  }
  return null;
});

// Additional credits, videos, and watch providers fetchers
async function getVideos(idStr) {
  if (!process.env.TMDB_API_KEY) return null;
  try {
    const numericId = parseInt(idStr, 10);
    const isTv = numericId < 0;
    const realId = isTv ? -numericId : numericId;
    const path = isTv ? `/tv/${realId}/videos` : `/movie/${realId}/videos`;

    const res = await fetchWithRetry(`https://api.themoviedb.org/3${path}`, {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}`, accept: "application/json" },
      next: { revalidate: 3600 },
    });
    return res.ok ? await res.json() : null;
  } catch (err) {
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
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}`, accept: "application/json" },
      next: { revalidate: 3600 },
    });
    return res.ok ? await res.json() : null;
  } catch (err) {
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
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}`, accept: "application/json" },
      next: { revalidate: 3600 },
    });
    return res.ok ? await res.json() : null;
  } catch (err) {
    return null;
  }
}

// Generate static params to pre-render highly popular routes
export async function generateStaticParams() {
  if (!process.env.TMDB_API_KEY) return [];

  try {
    // Fetch popular/trending movies and popular TV series
    const [moviesRes, tvRes] = await Promise.all([
      fetchWithRetry(`https://api.themoviedb.org/3/trending/movie/week`, {
        headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}`, accept: "application/json" },
        cache: "no-store",
      }),
      fetchWithRetry(`https://api.themoviedb.org/3/tv/popular`, {
        headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}`, accept: "application/json" },
        cache: "no-store",
      }),
    ]);

    const movies = moviesRes.ok ? await moviesRes.json() : { results: [] };
    const tvShows = tvRes.ok ? await tvRes.json() : { results: [] };

    const paths = [];

    // Add trending movies
    movies.results?.slice(0, 15).forEach(m => {
      const slug = slugify(m.title);
      if (slug) paths.push({ id: `${slug}-${m.id}` });
    });

    // Add popular TV shows
    tvShows.results?.slice(0, 10).forEach(tv => {
      const slug = slugify(tv.name);
      if (slug) paths.push({ id: `${slug}-${tv.id}` });
    });

    return paths;
  } catch (e) {
    console.error("Failed to generate static params:", e);
    return [];
  }
}

// Metadata Generator
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const rawId = resolvedParams?.id;
  const movie = await getMovieOrTv(rawId);

  if (!movie) {
    return {
      title: "Movie Not Found | MovieKart",
      description: "Discover ratings, reviews, and trailers for thousands of movies and TV shows on MovieKart.",
      robots: { index: false, follow: true },
    };
  }

  const year = movie.release_date?.substring(0, 4) || "TBA";
  const title = `${movie.title} (${year}) | MovieKart`;
  const description = movie.overview 
    ? `Watch trailer, ratings, cast, overview, genres, runtime and recommendations for ${movie.title} on MovieKart.`
    : `Explore ${movie.title} (${year}) cast, reviews, trailers, and stream information on MovieKart.`;

  const canonicalUrl = getMovieUrl(movie.id, movie.title);
  const pageUrl = `${SITE_URL}${canonicalUrl}`;
  const ogImageUrl = `${SITE_URL}/movie/${rawId}/opengraph-image`;

  return {
    title,
    description,
    keywords: [
      movie.title,
      `${movie.title} movie`,
      `${movie.title} trailer`,
      `${movie.title} cast`,
      `${movie.title} review`,
      ...(movie.genres?.map(g => g.name) || []),
      SITE_NAME,
    ],
    alternates: {
      canonical: pageUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
    other: {
      "theme-color": "#111827",
    },
    creator: "Aryan Sinha",
    publisher: SITE_NAME,
    authors: [{ name: "Aryan Sinha" }],
    openGraph: {
      type: movie.media_type === "tv" ? "video.tv_show" : "video.movie",
      title,
      description,
      url: pageUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${movie.title} Poster Backdrop`,
        },
      ],
      releaseDate: movie.release_date,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function MoviePage({ params }) {
  const resolvedParams = await params;
  const rawId = resolvedParams?.id;
  const movie = await getMovieOrTv(rawId);

  // If movie exists, and the current route is not the canonical slug, redirect (308)
  if (movie) {
    const canonicalUrl = getMovieUrl(movie.id, movie.title);
    const canonicalSlug = canonicalUrl.split("/").pop();
    if (rawId !== canonicalSlug) {
      permanentRedirect(canonicalUrl);
    }
  }

  if (!movie) {
    notFound();
  }

  const credits = await getCredits(movie.id);
  const watchProvidersRes = await getWatchProviders(movie.id);
  const videosRes = await getVideos(movie.id);

  const youtubeVideos = Array.isArray(videosRes?.results)
    ? videosRes.results
        .filter(v => v.site === "YouTube")
        .sort((a, b) => {
          const aIsTrailer = a.type === "Trailer" ? 1 : 0;
          const bIsTrailer = b.type === "Trailer" ? 1 : 0;
          return bIsTrailer - aIsTrailer;
        })
    : [];

  const { providers, watchLink } = parseWatchProviders(watchProvidersRes, movie.title);
  const director = credits?.crew?.find((c) => c.job === "Director");
  const topActors = credits?.cast?.slice(0, 12) || [];

  // ─── JSON-LD Structured Data ──────────────────────────────────
  const mainSchema = movie.media_type === "tv" ? {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "name": movie.title,
    "description": movie.overview,
    "datePublished": movie.release_date,
    "genre": movie.genres?.map(g => g.name),
    "numberOfSeasons": movie.number_of_seasons || 1,
    "numberOfEpisodes": movie.number_of_episodes || 0,
    ...(movie.poster_path && {
      "image": `https://image.tmdb.org/t/p/w780${movie.poster_path}`,
    }),
    ...(movie.vote_average > 0 && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": movie.vote_average.toFixed(1),
        "bestRating": 10,
        "ratingCount": movie.vote_count || 1,
      },
    }),
  } : {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": movie.title,
    "description": movie.overview,
    "datePublished": movie.release_date,
    "genre": movie.genres?.map((g) => g.name),
    ...(movie.poster_path && {
      "image": `https://image.tmdb.org/t/p/w780${movie.poster_path}`,
    }),
    ...(director && {
      "director": {
        "@type": "Person",
        "name": director.name,
        "url": `${SITE_URL}${getPersonUrl(director.id, director.name)}`,
      },
    }),
    ...(topActors.length > 0 && {
      "actor": topActors.slice(0, 5).map((a) => ({
        "@type": "Person",
        "name": a.name,
        "url": `${SITE_URL}${getPersonUrl(a.id, a.name)}`,
      })),
    }),
    ...(movie.vote_average > 0 && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": movie.vote_average.toFixed(1),
        "bestRating": 10,
        "ratingCount": movie.vote_count || 1,
      },
    }),
    "url": `${SITE_URL}${getMovieUrl(movie.id, movie.title)}`,
  };

  const breadcrumbsList = [
    { label: movie.media_type === "tv" ? "TV Shows" : "Movies", href: "/" },
    { label: movie.title, href: getMovieUrl(movie.id, movie.title) }
  ];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": SITE_URL,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": movie.media_type === "tv" ? "TV Shows" : "Movies",
        "item": SITE_URL,
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": movie.title,
        "item": `${SITE_URL}${getMovieUrl(movie.id, movie.title)}`,
      },
    ],
  };

  return (
    <main className="min-h-screen bg-black text-white pb-10">
      <JsonLd data={mainSchema} />
      <JsonLd data={breadcrumbSchema} />

      {/* <Breadcrumbs items={breadcrumbsList} /> */}

      {/* Backdrop Banner */}
      <div className="relative h-[35vh] sm:h-[50vh] md:h-[60vh] lg:h-[65vh] w-full overflow-hidden">
        {movie.backdrop_path ? (
          <Image
            src={getImagePath(movie.backdrop_path)}
            alt={`${movie.title} Backdrop Banner`}
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
                alt={`${movie.title} Poster Art`}
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

            <ExpandableOverview overview={movie.overview} />

            {/* Director / Creator links */}
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
            ) : director ? (
              <div className="mt-4 text-sm md:text-base">
                <span className="text-zinc-500 font-semibold uppercase tracking-wider text-xs">Director:</span>
                <Link 
                  href={getPersonUrl(director.id, director.name)}
                  className="ml-2 text-white font-bold hover:text-red-500 transition-colors"
                >
                  {director.name}
                </Link>
              </div>
            ) : null}

            {/* Metadata Stats */}
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

            {/* Genres Tag List */}
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

      {/* Videos Section */}
      {youtubeVideos.length > 0 && (
        <section id="videos-section" className="max-w-6xl mx-auto px-6 md:px-10 mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              Videos <span className="text-zinc-500 text-sm font-normal">({youtubeVideos.length})</span>
            </h2>
            {youtubeVideos.length > 7 && (
              <>
                <a
                  href="#cast"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all text-xs font-bold text-white border border-zinc-700 shadow-lg shadow-black/20 self-start sm:self-auto"
                >
                  <ArrowDown size={14} className="animate-bounce" />
                  Scroll to Cast
                </a>
                <ScrollToCastButton />
              </>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {youtubeVideos.map((video) => (
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

      {/* Cast Section with structured profile links */}
      {topActors.length > 0 ? (
        <section id="cast" className="max-w-6xl mx-auto px-6 md:px-10 pt-10 scroll-mt-20">
          <h2 className="text-2xl font-bold">Cast</h2>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {topActors.map((p) => (
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

      {/* Seasons list (TV Shows only) */}
      {movie.media_type === "tv" && movie.seasons?.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 md:px-10 pt-10">
          <h2 className="text-2xl font-bold mb-6">Seasons</h2>
          <SeasonsList seasons={movie.seasons} seriesId={movie.id} />
        </section>
      )}

      {/* Gallery/Screenshots */}
      {movie.images?.backdrops?.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 md:px-10 pt-10">
          <h2 className="text-2xl font-bold mb-6">Gallery</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {movie.images.backdrops.slice(0, 6).map((img, idx) => (
              <div key={idx} className="aspect-video relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 group">
                <Image
                  src={`https://image.tmdb.org/t/p/w780${img.file_path}`}
                  alt={`${movie.title} Backdrop Screenshot ${idx + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Crawl depth footer panel for internal links */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 pt-10 mt-10 border-t border-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">Discover More</h2>
        <div className="flex flex-wrap gap-4 text-xs font-semibold text-zinc-400">
          <Link href="/" className="hover:text-red-500 transition-colors">Trending Movies</Link>
          <span>•</span>
          <Link href="/" className="hover:text-red-500 transition-colors">Popular TV Shows</Link>
          <span>•</span>
          <Link href="/" className="hover:text-red-500 transition-colors">Latest Releases</Link>
        </div>
      </section>

      {/* Recommendations & Reviews */}
      <Recommendations movieId={movie.id} />
      <ReviewsSection movieId={movie.id} />
    </main>
  );
}