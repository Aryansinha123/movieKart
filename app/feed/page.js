"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getMovieUrl } from "@/utils/slugify";

export default function FeedPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [movieMap, setMovieMap] = useState({});

  useEffect(() => {
    async function fetchFeed() {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/feed", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json().catch(() => null);
        if (data.success) {
          setActivities(data.activities);
        }
      } catch (error) {
        console.error("Failed to load feed", error);
      } finally {
        setLoading(false);
      }
    }
    fetchFeed();
  }, []);

  useEffect(() => {
    async function hydrateMovies() {
      const ids = Array.from(
        new Set(
          (activities || [])
            .map((a) => a?.movieId)
            .filter((id) => typeof id === "number" || typeof id === "string")
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id))
        )
      );

      const missing = ids.filter((id) => movieMap[id] === undefined);
      if (missing.length === 0) return;

      const results = await Promise.all(
        missing.map(async (id) => {
          try {
            const res = await fetch(`/api/movies/${id}`, { cache: "no-store" });
            if (!res.ok) return [id, null];
            const data = await res.json().catch(() => null);
            return [id, data || null];
          } catch {
            return [id, null];
          }
        })
      );

      setMovieMap((prev) => {
        const next = { ...prev };
        for (const [id, movie] of results) next[id] = movie;
        return next;
      });
    }

    hydrateMovies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Activity Feed</h1>
          <div className="space-y-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 animate-pulse">
                <div className="h-16 bg-zinc-800 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Activity Feed</h1>
        
        {activities.length === 0 ? (
          <div className="bg-zinc-900/50 rounded-xl p-8 border border-zinc-800 text-center text-zinc-400">
            <p>Your feed is empty.</p>
            <p className="mt-2">Follow some users to see their activity here!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activities.map((activity) => (
              <div key={activity._id} className="bg-zinc-900/80 rounded-xl p-6 border border-zinc-800 flex gap-4 transition-transform hover:-translate-y-1">
                <Link href={`/profile/${activity.username}`}>
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 flex items-center justify-center text-xl font-bold">
                    {activity.userAvatar ? (
                      <Image
                        src={activity.userAvatar}
                        alt={activity.username}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      activity.username.charAt(0).toUpperCase()
                    )}
                  </div>
                </Link>
                <div className="flex-1">
                  <div className="text-zinc-300 mb-2">
                    <Link href={`/profile/${activity.username}`} className="font-bold text-white hover:text-red-400">
                      {activity.username}
                    </Link>{" "}
                    {activity.type === "collection_add" && "added a movie to collection "}
                    {activity.type === "review" && "reviewed "}
                    {activity.type === "watchlist_add" && "added a movie to their watchlist."}
                    {activity.type === "watched_add" && "marked a movie as watched."}
                    
                    {activity.type === "collection_add" && activity.meta?.collectionName && (
                      <span className="font-semibold italic">{activity.meta.collectionName}</span>
                    )}
                  </div>

                  {/* Movie preview */}
                  <Link
                    href={getMovieUrl(activity.movieId, movieMap?.[activity.movieId]?.title)}
                    onClick={() => console.log(`[Client-Feed] Clicked Activity Movie ID: ${activity.movieId}, Title: "${movieMap?.[activity.movieId]?.title || ""}"`)}
                    className="mt-3 block rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-950/60 transition-colors overflow-hidden"
                  >
                    <div className="flex gap-4 p-4">
                      <div className="w-[72px] h-[108px] rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                        {movieMap?.[activity.movieId]?.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w300${movieMap[activity.movieId].poster_path}`}
                            alt={movieMap[activity.movieId].title || `Movie ${activity.movieId}`}
                            width={144}
                            height={216}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                            #{activity.movieId}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-white font-bold text-lg truncate">
                          {movieMap?.[activity.movieId]?.title || "Loading movie..."}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-sm text-zinc-400">
                          {movieMap?.[activity.movieId]?.release_date ? (
                            <span>{movieMap[activity.movieId].release_date}</span>
                          ) : null}
                          {movieMap?.[activity.movieId]?.vote_average ? (
                            <span>⭐ {Number(movieMap[activity.movieId].vote_average).toFixed(1)}</span>
                          ) : null}
                        </div>
                        {activity.type === "review" && activity.meta?.comment ? (
                          <p className="mt-3 text-sm text-zinc-300 italic line-clamp-2">
                            “{activity.meta.comment}”
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                  
                  {activity.type === "review" && activity.meta?.comment && (
                    <div className="mt-3 bg-zinc-800/50 p-4 rounded-lg italic text-zinc-300 border-l-4 border-red-500">
                      "{activity.meta.comment}"
                      <div className="mt-2 font-bold text-red-400">Rating: {activity.meta.rating} / 5</div>
                    </div>
                  )}

                  <div className="mt-4 text-xs text-zinc-500">
                    {new Date(activity.createdAt).toLocaleDateString()} at {new Date(activity.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
