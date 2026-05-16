"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Brain,
  Users,
  Gem,
  TrendingUp,
  Film,
  Loader2,
  Star,
  Eye,
  Heart,
  Clapperboard,
  Clock,
  Wand2,
} from "lucide-react";

import HeroSection from "@/components/movie/HeroSection";
import TrendingMovies from "@/components/movie/TrendingMovies";
import SearchBar from "@/components/movie/SearchBar";
import MovieCard from "@/components/movie/MovieCard";
import NewReleases from "@/components/movie/NewReleases";
import UpcomingMovies from "@/components/movie/UpcomingMovies";
import MoodDiscoverySection from "@/components/home/MoodDiscoverySection";
import toast from "react-hot-toast";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}



// ─── Section Header ──────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, gradient }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient}`}
      >
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {subtitle && (
          <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ─── Carousel Row ──────────────────────────
function MovieRow({ movies }) {
  const scrollRef = useRef(null);

  if (!movies || movies.length === 0) {
    return (
      <div className="bg-zinc-900/30 rounded-xl p-6 border border-zinc-800/50 text-zinc-500 text-sm text-center">
        No recommendations yet. Watch more movies to unlock!
      </div>
    );
  }

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth, scrollWidth } = scrollRef.current;
      
      let scrollTo;
      if (direction === "left") {
        // If at the very start, wrap to the end
        if (scrollLeft <= 10) {
          scrollTo = scrollWidth;
        } else {
          scrollTo = scrollLeft - clientWidth;
        }
      } else {
        // If at the very end, wrap to the start
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollTo = 0;
        } else {
          scrollTo = scrollLeft + clientWidth;
        }
      }
      
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  return (
    <div className="group relative -mx-6 px-6 sm:mx-0 sm:px-0">
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/60 hover:bg-black/90 text-white rounded-r-xl border border-zinc-700/50 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>

      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-6 pb-6 pt-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {movies.map((movie) => (
          <div key={movie.id} className="w-[45vw] sm:w-[240px] md:w-[260px] flex-shrink-0 snap-start">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>

      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/60 hover:bg-black/90 text-white rounded-l-xl border border-zinc-700/50 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
  );
}

// ─── Taste Profile Visualization ─────────────────────
function TasteProfileCard({ tasteProfile }) {
  if (!tasteProfile) return null;

  const {
    favoriteGenres = [],
    preferredEras = [],
    averageRating,
    totalMoviesWatched,
    totalReviews,
    ratingDistribution = {},
    preferredRuntime,
    favoriteActors = [],
    favoriteDirectors = [],
  } = tasteProfile;

  const maxRating = Math.max(...Object.values(ratingDistribution), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-purple-900/10 p-6 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <Brain size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Your Taste DNA</h2>
          <p className="text-sm text-zinc-500">
            AI-analyzed from {totalMoviesWatched} movies & {totalReviews} reviews
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Favorite Genres */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
            <Film size={14} /> Favorite Genres
          </h3>
          <div className="space-y-2">
            {favoriteGenres.map((genre, i) => (
              <div key={genre.id} className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-4">{i + 1}.</span>
                <div className="flex-1 bg-zinc-800/50 rounded-full h-6 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(genre.count / (favoriteGenres[0]?.count || 1)) * 100}%`,
                    }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 flex items-center px-3"
                  >
                    <span className="text-xs font-medium text-white whitespace-nowrap">
                      {genre.name}
                    </span>
                  </motion.div>
                </div>
                <span className="text-xs text-zinc-500 w-6 text-right">
                  {genre.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
            <Star size={14} /> Rating Patterns
          </h3>
          {averageRating && (
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-amber-400">
                {averageRating}
              </span>
              <span className="text-sm text-zinc-500">avg rating</span>
            </div>
          )}
          <div className="flex items-end gap-2 h-20">
            {[1, 2, 3, 4, 5].map((rating) => (
              <div
                key={rating}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{
                    height: `${((ratingDistribution[rating] || 0) / maxRating) * 64}px`,
                  }}
                  transition={{ delay: 0.3 + rating * 0.1, duration: 0.5 }}
                  className="w-full rounded-t-md bg-gradient-to-t from-amber-600 to-amber-400"
                  style={{ minHeight: ratingDistribution[rating] > 0 ? "4px" : "0px" }}
                />
                <span className="text-xs text-zinc-500">{rating}★</span>
              </div>
            ))}
          </div>
        </div>

        {/* Preferred Eras & Runtime */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 mb-2">
              <Clock size={14} /> Preferred Eras
            </h3>
            <div className="flex flex-wrap gap-2">
              {preferredEras.map((era) => (
                <span
                  key={era.decade}
                  className="px-3 py-1.5 rounded-full bg-zinc-800/60 border border-zinc-700/50 text-xs font-medium text-zinc-300"
                >
                  {era.decade}s
                  <span className="text-zinc-500 ml-1">({era.count})</span>
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 mb-2">
              <Clapperboard size={14} /> Runtime Preference
            </h3>
            <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 border border-purple-500/20 text-xs font-medium text-purple-300 capitalize">
              {preferredRuntime === "short"
                ? "Under 90min"
                : preferredRuntime === "medium"
                  ? "90-120min"
                  : preferredRuntime === "long"
                    ? "120-150min"
                    : "150min+ Epics"}
            </span>
          </div>

          {/* Fav Actors */}
          {favoriteActors.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 mb-2">
                <Heart size={14} /> Favorite Actors
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {favoriteActors.slice(0, 5).map((actor) => (
                  <span
                    key={actor.name}
                    className="px-2 py-1 rounded-md bg-zinc-800/60 text-xs text-zinc-300"
                  >
                    {actor.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Similar Users Section ───────────────────────────
function SimilarUsersSection() {
  const [similarUsers, setSimilarUsers] = useState([]);
  const [suggestedToFollow, setSuggestedToFollow] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState({});

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/similar-users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setSimilarUsers(data.similarUsers || []);
          setSuggestedToFollow(data.suggestedToFollow || []);
          const map = {};
          for (const u of [...(data.similarUsers || []), ...(data.suggestedToFollow || [])]) {
            map[u._id] = u.isFollowing;
          }
          setFollowingMap(map);
        }
      } catch (e) {
        console.error("Failed to load similar users", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleFollow(userId) {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: userId }),
      });
      const data = await res.json();
      if (data.success) {
        setFollowingMap((prev) => ({ ...prev, [userId]: data.following }));
      }
    } catch (e) {
      console.error("Follow error", e);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  const allUsers = [...similarUsers];
  // Add suggested users that aren't already in similarUsers
  const existingIds = new Set(similarUsers.map((u) => u._id));
  for (const u of suggestedToFollow) {
    if (!existingIds.has(u._id)) allUsers.push(u);
  }

  if (allUsers.length === 0) {
    return (
      <div className="bg-zinc-900/30 rounded-xl p-6 border border-zinc-800/50 text-zinc-500 text-sm text-center">
        Not enough data yet. Watch and review more movies to find your movie soulmates!
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Users With Similar Taste */}
      {similarUsers.length > 0 && (
        <div>
          <SectionHeader
            icon={Users}
            title="Users With Similar Taste"
            subtitle="These users love the same movies you do"
            gradient="bg-gradient-to-br from-cyan-500 to-blue-500"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {similarUsers.map((user, i) => (
              <UserSimilarityCard
                key={user._id}
                user={user}
                index={i}
                isFollowing={followingMap[user._id]}
                onFollow={handleFollow}
              />
            ))}
          </div>
        </div>
      )}

      {/* Suggested People to Follow */}
      {suggestedToFollow.length > 0 && (
        <div>
          <SectionHeader
            icon={Heart}
            title="Suggested People To Follow"
            subtitle="Based on taste compatibility"
            gradient="bg-gradient-to-br from-rose-500 to-pink-500"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedToFollow.map((user, i) => (
              <UserSimilarityCard
                key={user._id}
                user={user}
                index={i}
                isFollowing={followingMap[user._id]}
                onFollow={handleFollow}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UserSimilarityCard({ user, index, isFollowing, onFollow }) {
  const matchPercent =
    typeof user.compatibilityPercent === "number"
      ? user.compatibilityPercent
      : Math.round((user.similarity?.overall || 0) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-4 hover:border-cyan-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5"
    >
      <div className="flex items-start gap-4">
        <Link href={`/profile/${user.username}`}>
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xl font-bold text-white overflow-hidden flex-shrink-0">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={user.username}
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            ) : (
              user.username?.charAt(0).toUpperCase()
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <Link href={`/profile/${user.username}`}>
              <p className="font-bold text-white hover:text-cyan-400 transition-colors truncate">
                {user.username}
              </p>
            </Link>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <Sparkles size={12} className="text-cyan-400" />
              <span className="text-xs font-bold text-cyan-400">
                {matchPercent}%
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-500 mt-0.5 truncate">
            {user.bio || `${user.watchedCount} movies watched`}
          </p>
          {Array.isArray(user.sharedGenres) && user.sharedGenres.length > 0 ? (
            <p className="text-[11px] text-zinc-500 mt-1 truncate">
              Shared genres: {user.sharedGenres.slice(0, 3).join(", ")}
            </p>
          ) : null}

          {/* Similarity breakdown */}
          <div className="mt-2 flex gap-2">
            {user.similarity?.watched > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                🎬 {Math.round(user.similarity.watched * 100)}%
              </span>
            )}
            {user.similarity?.ratings > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                ⭐ {Math.round(user.similarity.ratings * 100)}%
              </span>
            )}
            {user.similarity?.genres > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                🎭 {Math.round(user.similarity.genres * 100)}%
              </span>
            )}
          </div>

          <button
            onClick={() => onFollow(user._id)}
            className={`mt-3 w-full px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              isFollowing
                ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 shadow-md shadow-cyan-500/20"
            }`}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Friends Activity Feed ───────────────────────────
function FriendsActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [movieMap, setMovieMap] = useState({});

  useEffect(() => {
    async function fetchFeed() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/feed", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);
        if (data?.success) {
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
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-zinc-900/30 rounded-xl p-8 border border-zinc-800 text-center text-zinc-400">
        <p>No recent activity from your friends.</p>
        <p className="mt-2 text-sm text-zinc-500">Follow more users to see their activity here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {activities.map((activity) => (
        <div key={activity._id} className="bg-zinc-900/80 rounded-xl p-6 border border-zinc-800 flex gap-4 transition-transform hover:-translate-y-1">
          <Link href={`/profile/${activity.username}`}>
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 flex-shrink-0 flex items-center justify-center text-xl font-bold text-white">
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
          <div className="flex-1 min-w-0">
            <div className="text-zinc-300 mb-2 text-sm">
              <Link href={`/profile/${activity.username}`} className="font-bold text-white hover:text-cyan-400">
                {activity.username}
              </Link>{" "}
              {activity.type === "collection_add" && "added a movie to a collection "}
              {activity.type === "review" && "reviewed "}
              {activity.type === "watchlist_add" && "added a movie to their watchlist."}
              {activity.type === "watched_add" && "marked a movie as watched."}
              
              {activity.type === "collection_add" && activity.meta?.collectionName && (
                <span className="font-semibold italic">{activity.meta.collectionName}</span>
              )}
            </div>

            {/* Movie preview */}
            <Link
              href={`/movie/${activity.movieId}`}
              className="mt-3 block rounded-xl border border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-900/60 transition-colors overflow-hidden group"
            >
              <div className="flex gap-4 p-4">
                <div className="w-[72px] h-[108px] rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                  {movieMap?.[activity.movieId]?.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w300${movieMap[activity.movieId].poster_path}`}
                      alt={movieMap[activity.movieId].title || `Movie`}
                      width={144}
                      height={216}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                      No Image
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 py-1">
                  <p className="text-white font-bold text-lg truncate group-hover:text-cyan-400 transition-colors">
                    {movieMap?.[activity.movieId]?.title || "Loading movie..."}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-sm text-zinc-400">
                    {movieMap?.[activity.movieId]?.release_date ? (
                      <span>{movieMap[activity.movieId].release_date.substring(0,4)}</span>
                    ) : null}
                    {movieMap?.[activity.movieId]?.vote_average ? (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Star size={12} fill="currentColor" /> {Number(movieMap[activity.movieId].vote_average).toFixed(1)}
                      </span>
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
              <div className="mt-3 bg-zinc-900 p-4 rounded-xl italic text-zinc-300 border-l-4 border-cyan-500">
                "{activity.meta.comment}"
                <div className="mt-2 font-bold text-cyan-400 text-sm">Rating: {activity.meta.rating} / 5</div>
              </div>
            )}

            <div className="mt-4 text-xs text-zinc-500">
              {new Date(activity.createdAt).toLocaleDateString()} at {new Date(activity.createdAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Home Page ─────────────────────────────
export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("recommendations");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailedTaste, setDetailedTaste] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    const token = getToken();
    if (!token || token === "null" || token === "undefined") {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/recommendations?section=all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Failed to fetch recommendations", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTasteProfile = useCallback(async () => {
    const token = getToken();
    if (!token || token === "null" || token === "undefined") return;
    try {
      const res = await fetch("/api/taste-profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setDetailedTaste(json.tasteProfile);
      }
    } catch (e) {
      console.error("Failed to fetch taste profile", e);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const hasToken = !!getToken();
    setIsAuthenticated(hasToken);
    
    document.title = "MovieKart | Discover Your Next Favorite Film";

    if (hasToken) {
      fetchRecommendations();
      fetchTasteProfile();
      (async () => {
        try {
          const token = getToken();
          const res = await fetch("/api/achievements", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => null);
          if (res.ok && data?.success && Array.isArray(data.notifications) && data.notifications.length > 0) {
            for (const key of data.notifications.slice(0, 3)) {
              const badge = (data.badges || []).find((b) => b.key === key);
              if (badge) {
                toast.success(`Achievement Earned: ${badge.title}`);
              }
            }
            await fetch("/api/achievements", {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ markNotified: data.notifications }),
            });
          }
        } catch {
          // silent
        }
      })();
    }
  }, [fetchRecommendations, fetchTasteProfile]);

  const tabs = [
    { id: "recommendations", label: "For You", icon: Sparkles },
    { id: "moods", label: "Mood Discovery", icon: Wand2 },
    { id: "activity", label: "Friends Activity", icon: Users },
    { id: "taste", label: "Taste DNA", icon: Brain },
    { id: "similar-users", label: "Similar Users", icon: Heart },
  ];

  if (!mounted) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="h-[80vh] flex flex-col justify-center items-center text-center px-6 opacity-0">
          Loading...
        </div>
      </main>
    );
  }

  // LOGGED OUT STATE
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-black text-white">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <HeroSection />
          <SearchBar />
          <div className="max-w-[1600px] w-full mx-auto px-6">
            <NewReleases />
            <UpcomingMovies />
          </div>
          <TrendingMovies />
        </motion.div>
      </main>
    );
  }

  // LOGGED IN STATE
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero Header */}
      <div className="relative overflow-hidden">

        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-black to-cyan-900/20" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute top-10 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-12 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
              Your Personalized Home
            </h1>
            <p className="text-zinc-400 mt-4 text-lg md:text-xl max-w-2xl font-light">
              AI-powered movie recommendations tailored to your unique taste
            </p>
          </motion.div>

          {/* Tabs */}
          <div className="w-full max-w-7xl overflow-x-auto no-scrollbar mt-10">
            <div className="flex justify-start sm:justify-center gap-3 pb-2 min-w-max px-6 sm:px-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/40 text-white shadow-xl shadow-purple-500/10 scale-105"
                        : "bg-zinc-900/40 border border-zinc-800/50 text-zinc-500 hover:text-white hover:bg-zinc-800/60 hover:border-zinc-700"
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] w-full mx-auto px-6 pb-20">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-purple-400 mb-4" />
            <p className="text-zinc-500">Analyzing your taste profile...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "moods" && (
              <motion.div
                key="moods"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mt-8"
              >
                <MoodDiscoverySection />
              </motion.div>
            )}

            {activeTab === "recommendations" && (
              <motion.div
                key="recommendations"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-12 mt-8"
              >
                <div className="py-12 relative z-10">
                  <SearchBar />
                </div>
                
                {/* Recommended For You */}
                <div>
                  <SectionHeader
                    icon={Sparkles}
                    title="Recommended For You"
                    subtitle="Curated picks based on your taste profile"
                    gradient="bg-gradient-to-br from-purple-500 to-fuchsia-500"
                  />
                  <MovieRow movies={data?.recommended} />
                </div>

                <NewReleases />
                <UpcomingMovies />

                {/* Because You Watched */}
                {data?.becauseYouWatched?.map((section) => (
                  <div key={section.sourceMovie.id}>
                    <SectionHeader
                      icon={Eye}
                      title={`Because You Watched "${section.sourceMovie.title}"`}
                      subtitle="Movies similar to ones you've enjoyed"
                      gradient="bg-gradient-to-br from-orange-500 to-red-500"
                    />
                    <MovieRow movies={section.recommendations} />
                  </div>
                ))}




                {/* Curated Collections */}
                {data?.curatedCollections?.map((collection) => (
                  <div key={collection.id}>
                    <SectionHeader
                      icon={Sparkles}
                      title={collection.title}
                      subtitle={collection.subtitle}
                      gradient={collection.gradient}
                    />
                    <MovieRow movies={collection.movies} />
                  </div>
                ))}

                {/* Hidden Gems */}
                <div>
                  <SectionHeader
                    icon={Gem}
                    title="Hidden Gems For Your Taste"
                    subtitle="Highly rated movies most people haven't discovered"
                    gradient="bg-gradient-to-br from-amber-500 to-yellow-500"
                  />
                  <MovieRow movies={data?.hiddenGems} />
                </div>
              </motion.div>
            )}

            {activeTab === "activity" && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mt-8"
              >
                <SectionHeader
                  icon={Users}
                  title="Friends Activity"
                  subtitle="See what your friends are watching and reviewing"
                  gradient="bg-gradient-to-br from-green-500 to-emerald-500"
                />
                <FriendsActivityFeed />
              </motion.div>
            )}

            {activeTab === "taste" && (
              <motion.div
                key="taste"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mt-8"
              >
                <TasteProfileCard
                  tasteProfile={detailedTaste || data?.tasteProfile}
                />
              </motion.div>
            )}

            {activeTab === "similar-users" && (
              <motion.div
                key="similar-users"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mt-8"
              >
                <SimilarUsersSection />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Global Trending Movies (Always Visible) */}
        <div className="mt-20 pt-10 border-t border-zinc-800/50 space-y-4">
          <TrendingMovies />
        </div>
      </div>
    </main>
  );
}