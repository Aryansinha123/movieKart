"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

function getUserFromToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload?.exp && payload.exp * 1000 > Date.now()) return payload;
    return null;
  } catch {
    return null;
  }
}

export default function ProfileHeaderClient({ user }) {
  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("token") || "";
  }, []);

  const viewer = useMemo(() => getUserFromToken(token), [token]);

  const [followersCount, setFollowersCount] = useState(user?.followers?.length || 0);
  const [followingCount] = useState(user?.following?.length || 0);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tasteMatch, setTasteMatch] = useState(null);
  const [sharedGenres, setSharedGenres] = useState([]);

  const isSelf =
    viewer?.id &&
    user?._id &&
    String(viewer.id) === String(user._id);

  useEffect(() => {
    async function check() {
      if (!token || !user?._id || isSelf) {
        setLoading(false);
        return;
      }
      try {
        const [followRes, tasteRes] = await Promise.all([
          fetch(`/api/follow?targetUserId=${user._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/taste-match?username=${encodeURIComponent(user.username)}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const followData = await followRes.json().catch(() => null);
        if (followRes.ok && followData?.success) setFollowing(Boolean(followData.following));

        const tasteData = await tasteRes.json().catch(() => null);
        if (tasteRes.ok && tasteData?.success) {
          setTasteMatch(tasteData.compatibilityPercent ?? null);
          setSharedGenres(tasteData.sharedGenreNames || []);
        }
      } finally {
        setLoading(false);
      }
    }
    check();
  }, [token, user?._id, isSelf]);

  async function toggleFollow() {
    if (!token) {
      alert("Please login");
      return;
    }
    if (isSelf) return;

    try {
      setSaving(true);
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: user._id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to follow.");

      setFollowing(Boolean(data.following));
      if (typeof data.followersCount === "number") setFollowersCount(data.followersCount);
      else setFollowersCount((c) => c + (data.following ? 1 : -1));
    } catch (e) {
      alert(e?.message || "Failed to follow.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col md:flex-row items-center md:items-start gap-8 bg-zinc-900/50 p-6 md:p-8 rounded-2xl border border-zinc-800">
      <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-5xl font-bold border-4 border-zinc-700 shadow-2xl">
        {user.avatar ? (
          <Image
            src={user.avatar}
            alt={`${user.username} avatar`}
            width={160}
            height={160}
            className="w-full h-full object-cover"
          />
        ) : (
          user.username?.charAt(0).toUpperCase()
        )}
      </div>

      <div className="flex-1 text-center md:text-left min-w-0">
        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight truncate">
          {user.username}
        </h1>
        {user.bio && <p className="text-zinc-400 mt-3 text-base md:text-lg max-w-2xl">{user.bio}</p>}
        
        {!isSelf && tasteMatch !== null ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-4 py-1.5">
            <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
              Taste Match
            </span>
            <span className="text-lg font-bold text-white">{tasteMatch}%</span>
          </div>
        ) : null}
        
        {!isSelf && sharedGenres.length > 0 ? (
          <p className="text-xs text-zinc-500 mt-2">
            Shared taste: {sharedGenres.slice(0, 3).join(", ")}
          </p>
        ) : null}

        {Array.isArray(user.preferredLanguages) && user.preferredLanguages.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest self-center mr-1">
              Prefers:
            </span>
            {user.preferredLanguages.map((langCode) => {
              const names = {
                hi: "Hindi",
                en: "English",
                te: "Telugu",
                ta: "Tamil",
                ml: "Malayalam",
                kn: "Kannada",
                ko: "Korean",
                ja: "Japanese",
              };
              return (
                <span 
                  key={langCode}
                  className="px-2 py-0.5 rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-300 border border-zinc-700"
                >
                  {names[langCode] || langCode.toUpperCase()}
                </span>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-6 md:gap-10 mt-6 md:mt-8">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-xl md:text-2xl font-bold text-white">{user.watchedMovies?.length || 0}</span>
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-zinc-500 font-bold">Watched</span>
          </div>
          <div className="flex flex-col items-center md:items-start">
            <span className="text-xl md:text-2xl font-bold text-white">{user.watchlist?.length || 0}</span>
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-zinc-500 font-bold">Watchlist</span>
          </div>
          <div className="flex flex-col items-center md:items-start">
            <span className="text-xl md:text-2xl font-bold text-white">{user.favorites?.length || 0}</span>
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-zinc-500 font-bold">Favorites</span>
          </div>
          <div className="flex flex-col items-center md:items-start">
            <span className="text-xl md:text-2xl font-bold text-white">{followersCount}</span>
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-zinc-500 font-bold">Followers</span>
          </div>
          <div className="flex flex-col items-center md:items-start">
            <span className="text-xl md:text-2xl font-bold text-white">{followingCount}</span>
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-zinc-500 font-bold">Following</span>
          </div>
        </div>

        {Array.isArray(user?.achievements?.featuredBadges) &&
        user.achievements.featuredBadges.length > 0 ? (
          <div className="mt-8">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3">
              Achievements
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              {user.achievements.featuredBadges.map((b) => (
                <span
                  key={b.key}
                  className="text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
                  title={`${b.title} • ${b.rarityLabel}`}
                >
                  {b.title}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {isSelf ? (
        <div className="shrink-0 w-full md:w-auto mt-2 md:mt-0">
          <Link
            href="/settings"
            className="w-full md:w-auto px-8 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center justify-center gap-2 hover:bg-zinc-700"
          >
            Edit Profile
          </Link>
        </div>
      ) : (
        <div className="shrink-0 w-full md:w-auto mt-2 md:mt-0">
          {loading ? (
            <div className="h-12 w-full md:w-32 bg-zinc-800 animate-pulse rounded-xl" />
          ) : (
            <button
              onClick={toggleFollow}
              disabled={saving}
              className={`w-full md:w-auto px-8 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg ${
                following 
                  ? "bg-zinc-800 text-zinc-300 border border-zinc-700" 
                  : "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

