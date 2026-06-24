"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Sparkles,
  Users,
  Library,
  TrendingUp,
  MessageCircle,
  PenLine,
  Heart,
  Film,
  UserPlus,
  Loader2,
  Search,
} from "lucide-react";
import { getMovieUrl } from "@/utils/slugify";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function SectionHeader({ icon: Icon, title, subtitle, gradient }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient}`}
      >
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function MovieThumb({ movie, i }) {
  if (!movie?.id) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="flex-shrink-0"
    >
      <Link href={getMovieUrl(movie.id, movie.title)} onClick={() => console.log(`[Client-PersonalizedDashboard] Clicked Picked For You Movie ID: ${movie.id}, Title: "${movie.title}"`)}>
        <div className="w-[120px] rounded-lg overflow-hidden border border-zinc-800/60 bg-zinc-900/40 hover:border-purple-500/30 transition-colors">
          {movie.poster_path ? (
            <Image
              src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
              alt={movie.title || ""}
              width={120}
              height={180}
              className="w-full h-[168px] object-cover"
            />
          ) : (
            <div className="h-[168px] flex items-center justify-center text-zinc-600 text-xs p-2 text-center">
              {movie.title}
            </div>
          )}
          <p className="text-xs text-zinc-300 truncate px-2 py-1">{movie.title}</p>
        </div>
      </Link>
    </motion.div>
  );
}

function ActivityIcon({ type }) {
  if (type === "review") return <PenLine size={14} className="text-amber-400" />;
  if (type === "watchlist_add") return <Heart size={14} className="text-pink-400" />;
  return <Film size={14} className="text-cyan-400" />;
}

export default function PersonalizedDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/home-dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-purple-400" size={28} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-14 mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-zinc-400 text-sm">
          Your live discovery feed — recommendations, friends, and community picks.
        </p>
        <Link
          href="/discover"
          className="text-sm font-medium text-purple-300 hover:text-purple-200"
        >
          Open full Discover →
        </Link>
      </div>

      {/* Personalized recommendations */}
      <section>
        <SectionHeader
          icon={Sparkles}
          title="Picked for you"
          subtitle="From your watch history, ratings, collections & taste signals"
          gradient="bg-gradient-to-br from-purple-500 to-fuchsia-500"
        />
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
          {(data.personalizedRecommended || []).map((m, i) => (
            <MovieThumb key={m.id} movie={m} i={i} />
          ))}
        </div>
        {!data.personalizedRecommended?.length ? (
          <p className="text-zinc-500 text-sm">Watch or rate a few films to unlock picks.</p>
        ) : null}
      </section>

      {/* Search history recommendations */}
      {data.searchBasedRecommendations?.movies?.length > 0 && (
        <section>
          <SectionHeader
            icon={Search}
            title={`Because you searched “${data.searchBasedRecommendations.query}”`}
            subtitle="Recommendations based on your recent search interest"
            gradient="bg-gradient-to-br from-cyan-500 to-blue-500"
          />
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
            {data.searchBasedRecommendations.movies.map((m, i) => (
              <MovieThumb key={m.id} movie={m} i={i} />
            ))}
          </div>
        </section>
      )}

      {(data.moodPicks || []).map((pick) => (
        <section key={`mood-${pick.id}`}>
          <SectionHeader
            icon={Sparkles}
            title={pick.title}
            subtitle={pick.subtitle}
            gradient="bg-gradient-to-br from-indigo-500 to-purple-600"
          />
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
            {(pick.movies || []).map((m, i) => (
              <MovieThumb key={m.id} movie={m} i={i} />
            ))}
          </div>
        </section>
      ))}

      {(data.becauseYouWatched || []).map((block) => (
        <section key={block.sourceMovie?.id}>
          <SectionHeader
            icon={Film}
            title={`Because you watched “${block.sourceMovie?.title}”`}
            subtitle="TMDB similar titles"
            gradient="bg-gradient-to-br from-orange-500 to-rose-500"
          />
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
            {(block.recommendations || []).slice(0, 10).map((m, i) => (
              <MovieThumb key={m.id} movie={m} i={i} />
            ))}
          </div>
        </section>
      ))}

      {/* Friend activity */}
      <section>
        <SectionHeader
          icon={Users}
          title="Friend activity"
          subtitle="Latest from people you follow"
          gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
        />
        {!data.friendActivity?.length ? (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6 text-zinc-500 text-sm">
            Follow other movie fans to see their watches and reviews here.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.friendActivity.map((a) => (
              <Link
                key={a._id}
                href={getMovieUrl(a.movieId, a.meta?.movieTitle)}
                onClick={() => console.log(`[Client-PersonalizedDashboard] Clicked Friend Activity Movie ID: ${a.movieId}, Title: "${a.meta?.movieTitle}"`)}
                className="flex items-start gap-3 rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-4 hover:border-cyan-500/20 transition-colors"
              >
                <div className="mt-0.5">
                  <ActivityIcon type={a.type} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium">{a.username}</p>
                  <p className="text-xs text-zinc-400 capitalize">
                    {a.type?.replace(/_/g, " ")}
                  </p>
                  {a.meta?.rating ? (
                    <p className="text-xs text-amber-400 mt-1">{a.meta.rating}★ review</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Trending collections */}
      <section>
        <SectionHeader
          icon={Library}
          title="Trending collections"
          subtitle="Public lists the community saves & likes"
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
        />
        {!data.trendingCollections?.length ? (
          <p className="text-zinc-500 text-sm">No public collections yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.trendingCollections.map((c) => (
              <TrendingCollectionCard key={c._id} collection={c} />
            ))}
          </div>
        )}
      </section>

      {/* Trending among follows */}
      <section>
        <SectionHeader
          icon={TrendingUp}
          title="Trending among people you follow"
          subtitle="Titles showing up often in their activity"
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <div className="flex gap-3 overflow-x-auto pb-2">
          {(data.trendingAmongFollows || []).map((m, i) => (
            <MovieThumb key={m.id} movie={m} i={i} />
          ))}
        </div>
        {!data.trendingAmongFollows?.length ? (
          <p className="text-zinc-500 text-sm">Follow friends to see what is hot in your circle.</p>
        ) : null}
      </section>

      {/* Recently reviewed */}
      <section>
        <SectionHeader
          icon={MessageCircle}
          title="Recently reviewed by the community"
          gradient="bg-gradient-to-br from-violet-500 to-indigo-600"
        />
        <div className="grid gap-4 md:grid-cols-2">
          {(data.communityRecentReviews || []).map((r) => (
            <Link
              key={r._id}
              href={getMovieUrl(r.movieId, r.movie?.title)}
              onClick={() => console.log(`[Client-PersonalizedDashboard] Clicked Community Review Movie ID: ${r.movieId}, Title: "${r.movie?.title}"`)}
              className="flex gap-3 rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-4 hover:border-violet-500/25"
            >
              {r.movie?.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w92${r.movie.poster_path}`}
                  alt=""
                  width={56}
                  height={84}
                  className="rounded-md object-cover"
                />
              ) : (
                <div className="w-14 h-20 bg-zinc-800 rounded-md" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {r.movie?.title || `Movie #${r.movieId}`}
                </p>
                <p className="text-xs text-zinc-500">{r.username}</p>
                <p className="text-xs text-amber-400 mt-1">{"★".repeat(r.rating)}</p>
                {r.comment ? (
                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{r.comment}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Creators */}
      <section>
        <SectionHeader
          icon={UserPlus}
          title="Creators & reviewers to follow"
          subtitle="Active writers on MovieKart"
          gradient="bg-gradient-to-br from-rose-500 to-pink-600"
        />
        <div className="flex flex-wrap gap-3">
          {(data.suggestedCreators || []).map((u) => (
            <Link
              key={u.userId?.toString()}
              href={`/profile/${u.username}`}
              className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 py-2 pl-2 pr-4 hover:border-pink-500/30"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                {u.avatar ? (
                  <Image src={u.avatar} alt="" width={36} height={36} className="object-cover" />
                ) : (
                  (u.username || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{u.username}</p>
                <p className="text-[10px] text-zinc-500">{u.reviewCount} reviews</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function TrendingCollectionCard({ collection }) {
  const [likes, setLikes] = useState(collection.likesCount ?? 0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(collection.savedByMe ?? false);
  const owner = collection.owner;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getToken();
      const q = `/api/collection-likes?collectionId=${collection._id}`;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const res = await fetch(q, { headers });
        const j = await res.json();
        if (!cancelled && j.success) {
          setLikes(j.likesCount);
          setLiked(j.likedByMe);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [collection._id]);

  async function toggleLike() {
    const token = getToken();
    if (!token) return alert("Sign in to like collections.");
    const res = await fetch("/api/collection-likes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ collectionId: collection._id }),
    });
    const j = await res.json();
    if (j.success) {
      setLiked(j.liked);
      setLikes(j.likesCount);
    }
  }

  async function toggleSave() {
    const token = getToken();
    if (!token) return alert("Sign in to save collections.");
    if (saved) {
      const res = await fetch(
        `/api/saved-collections?collectionId=${collection._id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      const j = await res.json();
      if (j.success) setSaved(false);
    } else {
      const res = await fetch("/api/saved-collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ collectionId: collection._id }),
      });
      const j = await res.json();
      if (j.success) setSaved(true);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 flex flex-col gap-3">
      <div>
        <Link
          href={`/collection/view/${collection._id}`}
          className="text-lg font-bold text-white hover:text-amber-200"
        >
          {collection.name}
        </Link>
        <p className="text-xs text-zinc-500 mt-1">
          by {owner?.username || "User"} ·{" "}
          {collection.movieCount ?? (collection.movies?.length || 0)} films
        </p>
      </div>
      <div className="flex flex-wrap gap-2 mt-auto">
        <button
          type="button"
          onClick={toggleLike}
          className={`text-xs px-3 py-1.5 rounded-lg border ${
            liked
              ? "border-pink-500/50 bg-pink-500/10 text-pink-200"
              : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          ♥ {likes}
        </button>
        <button
          type="button"
          onClick={toggleSave}
          className={`text-xs px-3 py-1.5 rounded-lg border ${
            saved
              ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
              : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          {saved ? "Saved" : "Save"}
        </button>
        <Link
          href={`/collection/view/${collection._id}`}
          className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          Open
        </Link>
      </div>
    </div>
  );
}
