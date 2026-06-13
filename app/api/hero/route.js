import { NextResponse } from "next/server";
import { getGenreLabels } from "@/lib/genres";

async function fetchWithRetry(url, init, { retries = 2, timeoutMs = 8000 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      const isRetryable =
        err?.name === "AbortError" ||
        err?.cause?.code === "ECONNRESET" ||
        err?.code === "ECONNRESET";

      if (!isRetryable || attempt === retries) break;
      await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
    }
  }

  throw lastError;
}

function mapSlide(item) {
  if (!item || item.media_type === "person") return null;

  const isTv = item.media_type === "tv" || (!item.title && item.name);
  const id = isTv ? -Math.abs(item.id) : item.id;

  return {
    id,
    type: isTv ? "tv" : "movie",
    title: item.title || item.name,
    overview: item.overview || "",
    genres: getGenreLabels(item.genre_ids),
    vote_average: item.vote_average,
    backdrop: item.backdrop_path
      ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
      : item.poster_path
        ? `https://image.tmdb.org/t/p/original${item.poster_path}`
        : null,
    badge: isTv ? "Blockbuster Series" : "Trending Movie",
    accent: isTv ? "#8b5cf6" : "#3b82f6",
    accentSecondary: isTv ? "#a78bfa" : "#6366f1",
  };
}

export async function GET() {
  try {
    if (!process.env.TMDB_API_KEY) {
      return NextResponse.json({ success: true, slides: [] });
    }

    const response = await fetchWithRetry(
      "https://api.themoviedb.org/3/trending/all/week",
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
          accept: "application/json",
        },
        cache: "no-store",
      },
      { retries: 2, timeoutMs: 8000 }
    );

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "TMDB request failed.", slides: [] },
        { status: 502 }
      );
    }

    const data = await response.json();
    const movies = (data.results || [])
      .filter((r) => r.media_type === "movie" || (r.title && !r.name))
      .slice(0, 4)
      .map(mapSlide)
      .filter(Boolean);

    const series = (data.results || [])
      .filter((r) => r.media_type === "tv" || (!r.title && r.name))
      .slice(0, 3)
      .map(mapSlide)
      .filter(Boolean);

    const slides = [...movies.slice(0, 2), ...series.slice(0, 2), ...movies.slice(2, 4)].filter(
      (slide) => slide?.backdrop || slide?.title
    );

    return NextResponse.json({ success: true, slides });
  } catch (error) {
    console.error("Hero API error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load hero slides.", slides: [] },
      { status: 502 }
    );
  }
}
