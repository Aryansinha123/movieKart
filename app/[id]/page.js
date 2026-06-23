import Image from "next/image";
import Link from "next/link";
import { getImagePath } from "@/utils/imagePath";
import { MapPin, Cake, User, Film } from "lucide-react";
import { getPersonUrl } from "@/utils/slugify";
import PersonFilmography from "@/components/profile/PersonFilmography";

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
  const pageUrl = person ? `${SITE_URL}${getPersonUrl(id, person.name)}` : `${SITE_URL}/${rawId}`;

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

  // Helper to deduplicate movies/TV shows by ID
  const uniqueCredits = (arr) => {
    const seen = new Set();
    return arr.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  };

  // Get directed movies (crew credits with job === "Director")
  const directedMovies = uniqueCredits(
    credits?.crew?.filter(m => m.job === "Director" && m.poster_path) || []
  );

  // Get acting roles (cast credits)
  const actingMovies = uniqueCredits(
    credits?.cast?.filter(m => m.poster_path) || []
  );

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
          {/* Profile Image & Personal Info */}
          <div className="shrink-0 w-64 lg:w-80 mx-auto md:mx-0 md:sticky md:top-24 h-fit">
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

            {(directedMovies.length > 0 || actingMovies.length > 0) && (
              <div className="pt-10 border-t border-zinc-900">
                <PersonFilmography 
                  initialDirected={directedMovies} 
                  initialActing={actingMovies} 
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

