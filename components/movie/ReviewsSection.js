"use client";

import { useEffect, useMemo, useState } from "react";

function Star({ filled, onClick, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`text-2xl transition-colors ${filled ? "text-yellow-400" : "text-zinc-600 hover:text-zinc-400"}`}
    >
      ★
    </button>
  );
}

function ReviewCard({ review, token, onLikeChange }) {
  const [likesCount, setLikesCount] = useState(review.likesCount ?? 0);
  const [liked, setLiked] = useState(!!review.likedByMe);
  const [showThread, setShowThread] = useState(false);
  const [comments, setComments] = useState([]);
  const [replyBody, setReplyBody] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    setLikesCount(review.likesCount ?? 0);
    setLiked(!!review.likedByMe);
  }, [review.likesCount, review.likedByMe, review._id]);

  async function toggleLike() {
    if (!token) {
      alert("Please login to like reviews.");
      return;
    }
    try {
      const res = await fetch("/api/review-likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reviewId: review._id }),
      });
      const data = await res.json();
      if (data.success) {
        setLiked(data.liked);
        setLikesCount(data.likesCount);
        onLikeChange?.(review._id, data.likesCount, data.liked);
      }
    } catch {
      alert("Like failed.");
    }
  }

  async function loadComments() {
    setLoadingComments(true);
    try {
      const res = await fetch(
        `/api/comments?targetType=review&targetId=${review._id}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.success) setComments(data.comments || []);
    } finally {
      setLoadingComments(false);
    }
  }

  useEffect(() => {
    if (showThread) loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showThread, review._id]);

  async function postComment(e) {
    e.preventDefault();
    if (!token) return alert("Login to comment.");
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        targetType: "review",
        targetId: review._id,
        body: replyBody,
      }),
    });
    const j = await res.json();
    if (j.success) {
      setReplyBody("");
      loadComments();
    } else alert(j.message || "Failed");
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-white truncate">{review.username}</p>
        <p className="text-sm text-yellow-400">
          {"★".repeat(review.rating)}
          <span className="text-zinc-600">{"★".repeat(5 - review.rating)}</span>
        </p>
      </div>
      {review.comment ? (
        <p className="text-zinc-300 mt-2 whitespace-pre-wrap">{review.comment}</p>
      ) : (
        <p className="text-zinc-500 mt-2 text-sm">No comment.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggleLike}
          className={`text-sm px-3 py-1 rounded-lg border transition-colors ${
            liked
              ? "border-pink-500/50 bg-pink-500/10 text-pink-200"
              : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          ♥ {likesCount}
        </button>
        <button
          type="button"
          onClick={() => setShowThread((s) => !s)}
          className="text-sm text-purple-300 hover:text-purple-200"
        >
          {showThread ? "Hide discussion" : "Discussion"}
        </button>
      </div>

      {showThread ? (
        <div className="mt-4 rounded-lg border border-zinc-800/80 bg-black/30 p-3">
          {loadingComments ? (
            <p className="text-xs text-zinc-500">Loading…</p>
          ) : (
            <ul className="space-y-2 mb-3">
              {comments.map((c) => (
                <li key={c._id} className="text-sm">
                  <span className="font-medium text-zinc-200">{c.username}</span>
                  <p className="text-zinc-400 mt-0.5 whitespace-pre-wrap">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
          {token ? (
            <form onSubmit={postComment} className="space-y-2">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Reply to this review…"
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-sm"
              />
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 font-medium"
              >
                Post
              </button>
            </form>
          ) : (
            <p className="text-xs text-zinc-500">Sign in to join the discussion.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function ReviewsSection({ movieId }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState([]);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("token") || "";
  }, []);

  async function load() {
    try {
      setIsLoading(true);
      setError("");
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/reviews?movieId=${movieId}`, { cache: "no-store", headers });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to load reviews.");
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch (e) {
      setError(e?.message || "Failed to load reviews.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId, token]);

  async function submitReview(e) {
    e.preventDefault();
    if (!token) {
      alert("Please login to review.");
      return;
    }
    if (!rating) {
      alert("Please select a star rating.");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ movieId: Number(movieId), rating, comment }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to submit review.");

      setRating(0);
      setComment("");
      await load();
    } catch (e) {
      alert(e?.message || "Failed to submit review.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="max-w-6xl mx-auto px-10 pb-14">
      <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Reviews</h2>
          <span className="text-sm text-zinc-400">{reviews.length} total</span>
        </div>

        <form onSubmit={submitReview} className="mt-5">
          <p className="text-zinc-300 text-sm mb-2">Your rating</p>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                filled={i < rating}
                label={`Rate ${i + 1} stars`}
                onClick={() => setRating(i + 1)}
              />
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Write a short comment (optional)"
            className="mt-4 w-full rounded-xl bg-zinc-900 border border-zinc-800 text-white outline-none p-4 resize-none"
            maxLength={1000}
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">{comment.length}/1000</p>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-2 rounded-lg font-semibold transition-colors"
            >
              {isSaving ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>

        <div className="mt-8">
          {isLoading ? (
            <div className="text-zinc-400">Loading reviews...</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : reviews.length === 0 ? (
            <div className="text-zinc-400">No reviews yet. Be the first.</div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <ReviewCard
                  key={r._id}
                  review={r}
                  token={token}
                  onLikeChange={(id, count, liked) => {
                    setReviews((prev) =>
                      prev.map((x) =>
                        x._id === id ? { ...x, likesCount: count, likedByMe: liked } : x
                      )
                    );
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
