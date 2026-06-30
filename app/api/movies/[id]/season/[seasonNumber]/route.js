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
    const { id, seasonNumber } = params;

    const numericId = parseInt(id, 10);
    // TV show ID in our system is represented as a negative number
    const realId = Math.abs(numericId);

    if (!process.env.TMDB_API_KEY) {
      return NextResponse.json(
        { success: false, message: "TMDB API key is missing." },
        { status: 500 }
      );
    }

    const response = await fetchWithRetry(
      `https://api.themoviedb.org/3/tv/${realId}/season/${seasonNumber}`,
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
        { success: false, message: "Failed to fetch season details from TMDB." },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Season Details API Error:", error);
    return NextResponse.json({
      success: false,
      message: error?.message || "Failed to fetch season details.",
    }, { status: 500 });
  }
}
