"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

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
        const res = await fetch(`/api/follow?targetUserId=${user._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) setFollowing(Boolean(data.following));
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
    <div className="flex items-center gap-8 bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800">
      <div className="w-32 h-32 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-4xl font-bold border-4 border-zinc-700">
        {user.avatar ? (
          <Image
            src={user.avatar}
            alt={`${user.username} avatar`}
            width={128}
            height={128}
            className="w-full h-full object-cover"
          />
        ) : (
          user.username?.charAt(0).toUpperCase()
        )}
      </div>

      <div className="flex-1">
        <h1 className="text-5xl font-bold text-white">{user.username}</h1>
        <p className="text-zinc-400 mt-3 text-lg">{user.bio}</p>

        <div className="flex gap-8 mt-5 text-zinc-300 font-medium">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-white">{user.watchedMovies?.length || 0}</span>
            <span className="text-sm text-zinc-500">Watched</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-white">{user.watchlist?.length || 0}</span>
            <span className="text-sm text-zinc-500">Watchlist</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-white">{followersCount}</span>
            <span className="text-sm text-zinc-500">Followers</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-white">{followingCount}</span>
            <span className="text-sm text-zinc-500">Following</span>
          </div>
        </div>
      </div>

      {!isSelf ? (
        <div className="mt-6">
          {loading ? (
            <button
              disabled
              className="px-6 py-3 rounded-lg font-semibold transition bg-zinc-800 text-zinc-500 cursor-not-allowed"
            >
              Loading...
            </button>
          ) : (
            <button
              onClick={toggleFollow}
              disabled={saving}
              className={`px-6 py-3 rounded-lg font-semibold transition disabled:opacity-60 ${
                following ? "bg-zinc-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

