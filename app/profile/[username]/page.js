import Image from "next/image";
import Link from "next/link";
import { fetchMovieDetails } from "@/lib/tmdb";
import ProfileHeaderClient from "@/components/profile/ProfileHeaderClient";
import FavoriteActorsSection from "@/components/profile/FavoriteActorsSection";
import { FolderHeart, Clapperboard, Calendar, Star, Eye, History, Bookmark, Heart } from "lucide-react";
import { getMovieUrl } from "@/utils/slugify";

import { getProfileData } from "@/lib/profile";

async function getProfile(username) {
  // Use the shared data utility instead of fetch to avoid ECONNREFUSED on Vercel
  return getProfileData(decodeURIComponent(username));
}

import { SITE_URL, SITE_NAME } from "@/lib/seo.config";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const username = decodeURIComponent(resolvedParams?.username || "");
  const user = await getProfile(username);

  if (!user || !user._id) return { title: "User not found" };

  const description = `Check out ${user.username}'s movie profile on ${SITE_NAME} — ${user.watchedMovies?.length || 0} movies watched, ${user.favorites?.length || 0} favorites, and curated collections.`;
  const pageUrl = `${SITE_URL}/profile/${encodeURIComponent(user.username)}`;

  return {
    title: `${user.username}'s Profile`,
    description,
    openGraph: {
      type: "profile",
      title: `${user.username}'s Profile | ${SITE_NAME}`,
      description,
      url: pageUrl,
      siteName: SITE_NAME,
      ...(user.avatar && {
        images: [
          {
            url: user.avatar,
            width: 400,
            height: 400,
            alt: `${user.username}'s avatar`,
          },
        ],
      }),
    },
    twitter: {
      card: "summary",
      title: `${user.username}'s Profile | ${SITE_NAME}`,
      description,
      ...(user.avatar && { images: [user.avatar] }),
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

// Helper to fetch details for multiple movies
async function getMoviesDetails(movieIds) {
  if (!movieIds || !Array.isArray(movieIds)) return [];
  const promises = movieIds.slice(0, 10).map((id) => fetchMovieDetails(id));
  const results = await Promise.all(promises);
  return results.filter(Boolean);
}

// Helper to fetch details for multiple actors
async function getActorsDetails(actorIds) {
  if (!actorIds || !Array.isArray(actorIds)) return [];
  const promises = actorIds.slice(0, 12).map(async (id) => {
    if (!process.env.TMDB_API_KEY) return null;
    try {
      const res = await fetch(`https://api.themoviedb.org/3/person/${id}`, {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
          accept: "application/json",
        },
        next: { revalidate: 3600 }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error(`Failed to fetch actor ${id}:`, err);
      return null;
    }
  });
  const results = await Promise.all(promises);
  return results.filter(Boolean);
}

async function getCollectionThumbs(collections) {
  const thumbMap = {};
  const promises = collections.map(async (c) => {
    if (c.imageUrl) {
      thumbMap[c._id] = c.imageUrl;
    } else if (c.movies && c.movies.length > 0) {
      const details = await fetchMovieDetails(c.movies[0]);
      if (details?.poster_path) {
        thumbMap[c._id] = `https://image.tmdb.org/t/p/w300${details.poster_path}`;
      }
    }
  });
  await Promise.all(promises);
  return thumbMap;
}

export default async function ProfilePage(context) {
  const params = await context.params;
  const user = await getProfile(params.username);

  if (!user || !user._id) {
    return (
      <main className="min-h-screen bg-black text-white p-10 flex items-center justify-center">
        <h1 className="text-3xl font-bold">User not found</h1>
      </main>
    );
  }

  const watchedMoviesDetails = await getMoviesDetails(user.watchedMovies);
  const watchlistDetails = await getMoviesDetails(user.watchlist);
  const favoritesDetails = await getMoviesDetails(user.favorites);
  const favoriteActorsDetails = await getActorsDetails(user.favoriteActors);
  const collectionThumbs = await getCollectionThumbs(user.publicCollections || []);
  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <ProfileHeaderClient user={user} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-10 md:mt-14">
          
          {/* Left Column: Movies & Collections */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* Watched Movies */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <History size={20} />
                </div>
                <h2 className="text-xl md:text-2xl font-bold">Recently Watched</h2>
                <span className="text-zinc-500 text-xs md:text-sm ml-auto">Latest 10</span>
              </div>
              {watchedMoviesDetails.length > 0 ? (
                <div className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-thin">
                  {watchedMoviesDetails.map((m) => (
                    <Link key={m.id} href={getMovieUrl(m.id, m.title)} className="min-w-[140px] md:min-w-[160px] snap-start group relative rounded-xl overflow-hidden border border-zinc-800 transition-all hover:border-emerald-500/30">
                      {m.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w300${m.poster_path}`}
                          alt={m.title}
                          width={160}
                          height={240}
                          className="w-full h-[210px] md:h-[240px] object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-[140px] h-[210px] bg-zinc-800 flex items-center justify-center text-center p-2 text-sm text-zinc-500">
                          {m.title}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-xs font-bold text-white truncate">{m.title}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900/20 rounded-2xl p-8 border border-zinc-800/50 text-zinc-500 text-center">
                  No movies watched yet.
                </div>
              )}
            </div>

            {/* Watchlist */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <Bookmark size={20} />
                </div>
                <h2 className="text-xl md:text-2xl font-bold">Watchlist</h2>
                <span className="text-zinc-500 text-xs md:text-sm ml-auto">Latest 10</span>
              </div>
              {watchlistDetails.length > 0 ? (
                <div className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-thin">
                  {watchlistDetails.map((m) => (
                    <Link key={m.id} href={getMovieUrl(m.id, m.title)} className="min-w-[140px] md:min-w-[160px] snap-start group relative rounded-xl overflow-hidden border border-zinc-800 transition-all hover:border-blue-500/30">
                      {m.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w300${m.poster_path}`}
                          alt={m.title}
                          width={160}
                          height={240}
                          className="w-full h-[210px] md:h-[240px] object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-[140px] h-[210px] bg-zinc-800 flex items-center justify-center text-center p-2 text-sm text-zinc-500">
                          {m.title}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-xs font-bold text-white truncate">{m.title}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900/20 rounded-2xl p-8 border border-zinc-800/50 text-zinc-500 text-center">
                  Watchlist is empty.
                </div>
              )}
            </div>

            {/* Favorites */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500">
                  <Heart size={20} />
                </div>
                <h2 className="text-xl md:text-2xl font-bold">Favorites</h2>
                <span className="text-zinc-500 text-xs md:text-sm ml-auto">Latest 10</span>
              </div>
              {favoritesDetails.length > 0 ? (
                <div className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-thin">
                  {favoritesDetails.map((m) => (
                    <Link key={m.id} href={getMovieUrl(m.id, m.title)} className="min-w-[140px] md:min-w-[160px] snap-start group relative rounded-xl overflow-hidden border border-zinc-800 transition-all hover:border-pink-500/30">
                      {m.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w300${m.poster_path}`}
                          alt={m.title}
                          width={160}
                          height={240}
                          className="w-full h-[210px] md:h-[240px] object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-[140px] h-[210px] bg-zinc-800 flex items-center justify-center text-center p-2 text-sm text-zinc-500">
                          {m.title}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-xs font-bold text-white truncate">{m.title}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900/20 rounded-2xl p-8 border border-zinc-800/50 text-zinc-500 text-center">
                  No favorite movies yet.
                </div>
              )}
            </div>

            {/* Favorite Actors */}
            <div>
              <FavoriteActorsSection initialActors={favoriteActorsDetails} profileUserId={user._id} />
            </div>

            {/* Public collections */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                  <FolderHeart size={20} />
                </div>
                <h2 className="text-xl md:text-2xl font-bold">Collections</h2>
              </div>
              
              {Array.isArray(user.publicCollections) && user.publicCollections.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {user.publicCollections.map((c) => (
                    <Link
                      key={c._id}
                      href={`/collection/view/${c._id}`}
                      className="group relative flex flex-col rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/40 hover:border-red-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/5"
                    >
                      {/* Card Thumbnail */}
                      <div className="relative h-40 overflow-hidden">
                        {collectionThumbs[c._id] ? (
                          <Image
                            src={collectionThumbs[c._id]}
                            alt={c.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                            <FolderHeart size={40} className="text-zinc-700" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                        
                        <div className="absolute bottom-4 left-5">
                          <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">
                            {c.name}
                          </h3>
                        </div>
                      </div>

                      <div className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Clapperboard size={14} />
                          <span className="text-sm font-medium">{c.movies?.length || 0} movies</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye size={16} className="text-white" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900/20 rounded-2xl p-8 border border-zinc-800/50 text-zinc-500 text-center">
                  No public collections yet.
                </div>
              )}
            </div>

            {/* Following collections */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                  <FolderHeart size={20} />
                </div>
                <h2 className="text-xl md:text-2xl font-bold">Following Collections</h2>
              </div>
              
              {Array.isArray(user.followedCollections) && user.followedCollections.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {user.followedCollections.map((c) => (
                    <Link
                      key={c._id}
                      href={`/collection/${c.slug || c._id}`}
                      className="group relative flex flex-col rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/40 hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5"
                    >
                      {/* Card Thumbnail */}
                      <div className="relative h-40 overflow-hidden">
                        {c.imageUrl || collectionThumbs[c._id] ? (
                          <Image
                            src={c.imageUrl || collectionThumbs[c._id]}
                            alt={c.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                            <FolderHeart size={40} className="text-zinc-700" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                        
                        <div className="absolute bottom-4 left-5">
                          <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                            {c.name}
                          </h3>
                          {c.owner?.username && (
                            <span className="text-[10px] text-zinc-400 block mt-0.5">by {c.owner.username}</span>
                          )}
                        </div>
                      </div>

                      <div className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Clapperboard size={14} />
                          <span className="text-sm font-medium">{c.movies?.length || 0} movies</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye size={16} className="text-white" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900/20 rounded-2xl p-8 border border-zinc-800/50 text-zinc-500 text-center">
                  Not following any collections yet.
                </div>
              )}
            </div>
            
          </div>

          {/* Right Column: Activity Feed */}
          <div className="lg:col-span-1">
            <h2 className="text-xl md:text-2xl font-bold mb-6">Recent Activity</h2>
            
            <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 scrollbar-thin">
              {Array.isArray(user.recentActivity) && user.recentActivity.length > 0 ? (
                user.recentActivity.map((activity) => (
                  <div key={activity._id} className="bg-zinc-900/60 rounded-2xl p-5 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="text-sm text-zinc-300 leading-relaxed">
                      <span className="font-bold text-white">{user.username}</span>{" "}
                      {activity.type === "collection_add" && "added a movie to collection "}
                      {activity.type === "review" && "wrote a review"}
                      {activity.type === "watchlist_add" && "added a movie to watchlist"}
                      {activity.type === "watched_add" && "marked a movie as watched"}
                      {activity.type === "favorite_add" && "added a movie to favorites"}
                      
                      {activity.type === "collection_add" && activity.meta?.collectionName && (
                        <span className="font-bold text-red-400"> {activity.meta.collectionName}</span>
                      )}
                    </div>
                    
                    {activity.type === "review" && activity.meta?.comment && (
                      <div className="mt-3 text-xs italic text-zinc-400 border-l-2 border-red-500/50 pl-3 py-1 bg-red-500/5 rounded-r-lg">
                        "{activity.meta.comment}"
                        <div className="mt-2 font-bold text-red-400 text-[10px] tracking-wider uppercase">Rating: {activity.meta.rating} / 5</div>
                      </div>
                    )}
                    
                    <div className="mt-4 flex justify-between items-center">
                      <Link href={getMovieUrl(activity.movieId, activity.meta?.movieTitle)} className="text-[10px] font-bold uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-zinc-300 transition-colors border border-zinc-700">
                        View Movie
                      </Link>
                      <span className="text-[10px] text-zinc-600 font-medium">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-zinc-900/20 rounded-2xl p-8 border border-zinc-800/50 text-zinc-500 text-sm text-center">
                  No recent activity.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}