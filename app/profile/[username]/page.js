import Image from "next/image";
import Link from "next/link";
import { fetchMovieDetails } from "@/lib/tmdb";
import ProfileHeaderClient from "@/components/profile/ProfileHeaderClient";

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
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold">Recently Watched</h2>
                <span className="text-zinc-500 text-sm">Latest 10</span>
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
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold">Watchlist</h2>
                <span className="text-zinc-500 text-sm">Latest 10</span>
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
              <h2 className="text-2xl font-bold mb-6">Collections</h2>
              {Array.isArray(user.publicCollections) && user.publicCollections.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {user.publicCollections.map((c) => (
                    <div
                      key={c._id}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-lg font-bold truncate">{c.name}</p>
                          <p className="text-sm text-zinc-400 mt-1">
                            {c.movies?.length || 0} movies
                          </p>
                        </div>
                      </div>

                      {Array.isArray(c.movies) && c.movies.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {c.movies.slice(0, 5).map((id) => (
                            <Link
                              key={id}
                              href={`/movie/${id}`}
                              className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                            >
                              Movie #{id}
                            </Link>
                          ))}
                          {c.movies.length > 5 ? (
                            <span className="text-xs text-zinc-500 px-2 py-1">
                              +{c.movies.length - 5}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-4 text-xs text-zinc-500">No movies yet.</p>
                      )}
                    </div>
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