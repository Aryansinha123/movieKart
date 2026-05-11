"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function FeedPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

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
        const data = await res.json();
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
                  
                  {activity.type === "review" && activity.meta?.comment && (
                    <div className="mt-3 bg-zinc-800/50 p-4 rounded-lg italic text-zinc-300 border-l-4 border-red-500">
                      "{activity.meta.comment}"
                      <div className="mt-2 font-bold text-red-400">Rating: {activity.meta.rating} / 5</div>
                    </div>
                  )}

                  <div className="mt-4">
                     <Link href={`/movie/${activity.movieId}`} className="inline-block bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                       View Movie #{activity.movieId}
                     </Link>
                  </div>
                  
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
