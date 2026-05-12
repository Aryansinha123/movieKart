// import { NextResponse } from "next/server";

// export async function GET(req, { params }) {
//   try {
//     const { id } = params;

//     const response = await fetch(
//       `https://api.themoviedb.org/3/movie/${id}`,
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
//           accept: "application/json",
//         },
//         cache: "no-store",
//       }
//     );

//     const data = await response.json();

//     return NextResponse.json(data);
//   } catch (error) {
//     return NextResponse.json({
//       success: false,
//       message: error.message,
//     });
//   }
// }
import { NextResponse } from "next/server";

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

      const isAbort = err?.name === "AbortError";
      const isConnReset = err?.cause?.code === "ECONNRESET" || err?.code === "ECONNRESET";
      const isRetryable = isAbort || isConnReset;

      if (!isRetryable || attempt === retries) break;

      const backoffMs = 250 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  throw lastError;
}

export async function GET(req, context) {
  try {
    const params = await context.params;

    const idStr = params.id;
    const numericId = parseInt(idStr, 10);
    const isTv = numericId < 0;
    const realId = isTv ? -numericId : numericId;
    const path = isTv ? `/tv/${realId}` : `/movie/${realId}`;

    if (!process.env.TMDB_API_KEY) {
      return NextResponse.json(
        { success: false, message: "TMDB API key is missing." },
        { status: 500 }
      );
    }

    const response = await fetchWithRetry(
      `https://api.themoviedb.org/3${path}`,
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
      const text = await response.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          message: "TMDB request failed.",
          status: response.status,
          details: text ? text.slice(0, 500) : undefined,
        },
        { status: 502 }
      );
    }

    const data = await response.json().catch(() => null);
    if (!data) {
      return NextResponse.json(
        { success: false, message: "Invalid TMDB response." },
        { status: 502 }
      );
    }

    const { mapTmdbResult } = require("@/lib/tmdb");
    return NextResponse.json(mapTmdbResult({ ...data, media_type: isTv ? "tv" : "movie" }));
  } catch (error) {
    console.log("TMDB ERROR:", error);

    const isAbort = error?.name === "AbortError";
    return NextResponse.json({
      success: false,
      message: isAbort ? "TMDB request timed out." : error?.message || "TMDB request failed.",
    });
  }
}