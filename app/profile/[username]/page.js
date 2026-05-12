import Image from "next/image";
import Link from "next/link";
import { fetchMovieDetails } from "@/lib/tmdb";
import ProfileHeaderClient from "@/components/profile/ProfileHeaderClient";
import { FolderHeart, Clapperboard, Calendar, Star, Eye, History, Bookmark } from "lucide-react";

async function getProfile(username) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/profile/${username}`,
    {
      cache: "no-store",
    }
  );

  return res.json();
}

// Helper to fetch details for multiple movies
async function getMoviesDetails(movieIds) {
  if (!movieIds || !Array.isArray(movieIds)) return [];
  const promises = movieIds.slice(0, 10).map((id) => fetchMovieDetails(id));
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
  const collectionThumbs = await getCollectionThumbs(user.publicCollections || []);

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <ProfileHeaderClient user={user} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-14">
          
          {/* Left Column: Movies & Collections */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* Watched Movies */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <History size={20} />
                </div>
                <h2 className="text-2xl font-bold">Recently Watched</h2>
                <span className="text-zinc-500 text-sm ml-auto">Latest 10</span>
              </div>
              {watchedMoviesDetails.length > 0 ? (
                <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                  {watchedMoviesDetails.map((m) => (
                    <Link key={m.id} href={`/movie/${m.id}`} className="min-w-[140px] snap-start group relative rounded-lg overflow-hidden border border-zinc-800 transition-transform hover:-translate-y-1">
                      {m.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w300${m.poster_path}`}
                          alt={m.title}
                          width={140}
                          height={210}
                          className="w-full h-[210px] object-cover"
                        />
                      ) : (
                        <div className="w-[140px] h-[210px] bg-zinc-800 flex items-center justify-center text-center p-2 text-sm text-zinc-500">
                          {m.title}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-xs font-semibold truncate">{m.title}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900/40 rounded-xl p-6 border border-zinc-800 text-zinc-500">
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
                <h2 className="text-2xl font-bold">Watchlist</h2>
                <span className="text-zinc-500 text-sm ml-auto">Latest 10</span>
              </div>
              {watchlistDetails.length > 0 ? (
                <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                  {watchlistDetails.map((m) => (
                    <Link key={m.id} href={`/movie/${m.id}`} className="min-w-[140px] snap-start group relative rounded-lg overflow-hidden border border-zinc-800 transition-transform hover:-translate-y-1">
                      {m.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w300${m.poster_path}`}
                          alt={m.title}
                          width={140}
                          height={210}
                          className="w-full h-[210px] object-cover"
                        />
                      ) : (
                        <div className="w-[140px] h-[210px] bg-zinc-800 flex items-center justify-center text-center p-2 text-sm text-zinc-500">
                          {m.title}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-xs font-semibold truncate">{m.title}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900/40 rounded-xl p-6 border border-zinc-800 text-zinc-500">
                  Watchlist is empty.
                </div>
              )}
            </div>

            {/* Public collections */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                  <FolderHeart size={20} />
                </div>
                <h2 className="text-2xl font-bold">Collections</h2>
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
                          <span className="text-sm">{c.movies?.length || 0} movies</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye size={16} className="text-white" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-zinc-500">
                  No public collections yet.
                </div>
              )}
            </div>
            
          </div>

          {/* Right Column: Activity Feed */}
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900/40">
              {Array.isArray(user.recentActivity) && user.recentActivity.length > 0 ? (
                user.recentActivity.map((activity) => (
                  <div key={activity._id} className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800">
                    <div className="text-sm text-zinc-300">
                      <span className="font-semibold text-white">{user.username}</span>{" "}
                      {activity.type === "collection_add" && "added a movie to collection "}
                      {activity.type === "review" && "wrote a review"}
                      {activity.type === "watchlist_add" && "added a movie to watchlist"}
                      {activity.type === "watched_add" && "marked a movie as watched"}
                      
                      {activity.type === "collection_add" && activity.meta?.collectionName && (
                        <span className="font-semibold text-red-400"> {activity.meta.collectionName}</span>
                      )}
                    </div>
                    
                    {activity.type === "review" && activity.meta?.comment && (
                      <div className="mt-2 text-xs italic text-zinc-400 border-l-2 border-red-500 pl-2">
                        "{activity.meta.comment}"
                        <div className="mt-1 font-semibold text-red-400 text-[10px]">Rating: {activity.meta.rating} / 5</div>
                      </div>
                    )}
                    
                    <div className="mt-3 flex justify-between items-center">
                      <Link href={`/movie/${activity.movieId}`} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-white transition-colors">
                        Movie #{activity.movieId}
                      </Link>
                      <span className="text-[10px] text-zinc-600">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-zinc-900/40 rounded-xl p-6 border border-zinc-800 text-zinc-500 text-sm text-center">
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