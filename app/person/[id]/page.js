import Image from "next/image";
import Link from "next/link";
import { getImagePath } from "@/utils/imagePath";
import { Star, MapPin, Cake, User, Film } from "lucide-react";
import MovieCard from "@/components/movie/MovieCard";
import { getMovieUrl, getPersonUrl } from "@/utils/slugify";

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
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
    }
  }
  throw lastError;
}

async function getPerson(id) {
  if (!process.env.TMDB_API_KEY) return null;
  try {
    const res = await fetchWithRetry(`https://api.themoviedb.org/3/person/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch person ${id}:`, err);
    return null;
  }
}

async function getCredits(id) {
  if (!process.env.TMDB_API_KEY) return null;
  try {
    const res = await fetchWithRetry(`https://api.themoviedb.org/3/person/${id}/combined_credits`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch credits for person ${id}:`, err);
    return null;
  }
}

async function getPersonIdByName(nameSlug) {
  if (!process.env.TMDB_API_KEY) return null;
  try {
    const query = nameSlug.replace(/-/g, " ");
    const res = await fetchWithRetry(`https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].id;
    }
    return null;
  } catch (err) {
    console.error(`Failed to search person by name ${nameSlug}:`, err);
    return null;
  }
}

import { SITE_URL, SITE_NAME } from "@/lib/seo.config";
import JsonLd from "@/components/JsonLd";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const rawId = resolvedParams?.id;
  let id = null;
  if (rawId) {
    if (/^\d+$/.test(rawId)) {
      id = parseInt(rawId, 10);
    } else {
      id = await getPersonIdByName(rawId);
    }
  }
  const person = id ? await getPerson(id) : null;

  if (!person) return { title: "Person not found" };

  const description =
    person.biography?.substring(0, 160) ||
    `Explore ${person.name}'s filmography, biography, and career on MovieKart.`;
  const profileImageUrl = person.profile_path
    ? `https://image.tmdb.org/t/p/w780${person.profile_path}`
    : undefined;
  const pageUrl = person ? `${SITE_URL}${getPersonUrl(id, person.name)}` : `${SITE_URL}/person/${rawId}`;

  return {
    title: person.name,
    description,
    keywords: [
      person.name,
      person.known_for_department,
      "actor",
      "director",
      "filmography",
      SITE_NAME,
    ].filter(Boolean),
    openGraph: {
      type: "profile",
      title: `${person.name} | ${SITE_NAME}`,
      description,
      url: pageUrl,
      siteName: SITE_NAME,
      ...(profileImageUrl && {
        images: [
          {
            url: profileImageUrl,
            width: 780,
            height: 1170,
            alt: person.name,
          },
        ],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: `${person.name} | ${SITE_NAME}`,
      description,
      ...(profileImageUrl && { images: [profileImageUrl] }),
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

export default async function PersonPage({ params }) {
  const resolvedParams = await params;
  const rawId = resolvedParams?.id;
  let id = null;
  if (rawId) {
    if (/^\d+$/.test(rawId)) {
      id = parseInt(rawId, 10);
    } else {
      id = await getPersonIdByName(rawId);
    }
  }
  const person = id ? await getPerson(id) : null;
  const credits = id ? await getCredits(id) : null;

  if (!person) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Person not found</h1>
          <Link href="/" className="text-red-500 mt-4 inline-block hover:underline">Return Home</Link>
        </div>
      </main>
    );
  }

  // Sort and filter filmography
  const filmography = credits?.cast
    ?.filter(m => m.poster_path)
    ?.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    ?.slice(0, 18) || [];

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    ...(person.biography && { description: person.biography.substring(0, 300) }),
    ...(person.birthday && { birthDate: person.birthday }),
    ...(person.place_of_birth && { birthPlace: person.place_of_birth }),
    ...(person.known_for_department && { jobTitle: person.known_for_department }),
    ...(person.profile_path && {
      image: `https://image.tmdb.org/t/p/w780${person.profile_path}`,
    }),
    url: `${SITE_URL}${getPersonUrl(id, person.name)}`,
  };

  return (
    <main className="min-h-screen bg-black text-white pb-20">
      <JsonLd data={personJsonLd} />
      {/* Header / Backdrop Area */}
      <div className="relative h-[40vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-600/20 to-black z-0" />
        <div className="absolute inset-0 backdrop-blur-3xl z-0" />
        <div className="absolute inset-0 bg-black/40 z-10" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 -mt-40 relative z-20">
        <div className="flex flex-col md:flex-row gap-10">
          {/* Profile Image */}
          <div className="shrink-0 w-64 lg:w-80 mx-auto md:mx-0">
            <div className="rounded-2xl overflow-hidden border-4 border-zinc-900 shadow-2xl shadow-black shadow-inner bg-zinc-900 aspect-[2/3] relative">
              {person.profile_path ? (
                <Image
                  src={getImagePath(person.profile_path)}
                  alt={person.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
                  <User size={80} />
                </div>
              )}
            </div>

            {/* Personal Info Sidebar */}
            <div className="mt-8 space-y-6 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Personal Info</h3>
              
              {person.birthday && (
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500 font-medium">Birthday</p>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Cake size={14} className="text-red-500" />
                    {new Date(person.birthday).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}

              {person.place_of_birth && (
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500 font-medium">Place of Birth</p>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <MapPin size={14} className="text-red-500" />
                    {person.place_of_birth}
                  </p>
                </div>
              )}

              {person.known_for_department && (
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500 font-medium">Known For</p>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Film size={14} className="text-red-500" />
                    {person.known_for_department}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Biography and Filmography */}
          <div className="flex-1 space-y-12">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">{person.name}</h1>
              {person.biography ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-zinc-300">Biography</h2>
                  <p className="text-zinc-400 leading-relaxed text-sm md:text-base whitespace-pre-line line-clamp-[12] md:line-clamp-none">
                    {person.biography}
                  </p>
                </div>
              ) : (
                <p className="text-zinc-500 italic">No biography available for this person.</p>
              )}
            </div>

            {filmography.length > 0 && (
              <div className="space-y-6 pt-10 border-t border-zinc-900">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  Known For <span className="text-zinc-500 text-sm font-normal">({credits.cast.length} credits)</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filmography.map((m) => (
                    <PersonMovieCard 
                      key={m.id}
                      movie={{
                        ...m,
                        title: m.title || m.name,
                        release_date: m.release_date || m.first_air_date
                      }} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function PersonMovieCard({ movie }) {
  return (
    <Link 
      href={getMovieUrl(movie.id, movie.title)}
      className="group relative block rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/40 hover:border-red-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-red-500/10"
    >
      <div className="aspect-[16/9] relative overflow-hidden">
        {movie.backdrop_path ? (
          <Image
            src={getImagePath(movie.backdrop_path)}
            alt={movie.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">
            No Backdrop
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
        
        {/* Rating Badge */}
        <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-bold text-amber-400 flex items-center gap-1">
          <Star size={10} fill="currentColor" />
          {movie.vote_average?.toFixed(1) || "N/A"}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-1">
        <h3 className="font-bold text-sm text-white group-hover:text-red-500 transition-colors truncate">
          {movie.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
            {movie.media_type === "tv" ? "TV Series" : "Movie"}
          </span>
          <span className="w-1 h-1 rounded-full bg-zinc-800" />
          <span className="text-[10px] font-medium text-zinc-400">
            {movie.release_date?.substring(0, 4)}
          </span>
        </div>
      </div>
    </Link>
  );
}

