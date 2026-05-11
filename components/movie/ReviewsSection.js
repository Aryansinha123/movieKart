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
      const res = await fetch(`/api/reviews?movieId=${movieId}`, { cache: "no-store" });
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
  }, [movieId]);

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
                <div
                  key={r._id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white truncate">{r.username}</p>
                    <p className="text-sm text-yellow-400">
                      {"★".repeat(r.rating)}
                      <span className="text-zinc-600">{"★".repeat(5 - r.rating)}</span>
                    </p>
                  </div>
                  {r.comment ? (
                    <p className="text-zinc-300 mt-2 whitespace-pre-wrap">{r.comment}</p>
                  ) : (
                    <p className="text-zinc-500 mt-2 text-sm">No comment.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

