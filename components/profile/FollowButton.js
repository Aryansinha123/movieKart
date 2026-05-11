"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FollowButton({
  targetUserId,
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkFollowStatus() {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/follow?targetUserId=${targetUserId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          setFollowing(data.following);
        }
      } catch (error) {
        console.error("Error checking follow status", error);
      } finally {
        setLoading(false);
      }
    }
    
    checkFollowStatus();
  }, [targetUserId]);

  async function handleFollow() {
    const token =
      localStorage.getItem("token");

    if (!token) {
      alert("Please login");
      return;
    }

    const res = await fetch(
      "/api/follow",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          targetUserId,
        }),
      }
    );

    const data = await res.json();

    if (data.success) {
      setFollowing(data.following);
      router.refresh();
    } else {
      alert(data.message);
    }
  }

  if (loading) {
    return (
      <button disabled className="px-6 py-3 rounded-lg font-semibold transition bg-zinc-800 text-zinc-500 cursor-not-allowed">
        Loading...
      </button>
    );
  }

  return (
    <button
      onClick={handleFollow}
      className={`px-6 py-3 rounded-lg font-semibold transition ${
        following
          ? "bg-zinc-700 text-white"
          : "bg-red-500 hover:bg-red-600 text-white"
      }`}
    >
      {following
        ? "Following"
        : "Follow"}
    </button>
  );
}