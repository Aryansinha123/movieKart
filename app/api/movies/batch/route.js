import { NextResponse } from "next/server";
import { fetchMovieDetail } from "@/lib/recommendations";

/**
 * POST /api/movies/batch
 * Fetches TMDB movie details for an array of movie IDs in a single request.
 */
export async function POST(req) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: true, movies: [] });
    }

    // Limit batch size per request to 50 to avoid network timeouts
    const targetIds = ids.slice(0, 50);

    const movies = await Promise.all(
      targetIds.map(async (id) => {
        try {
          return await fetchMovieDetail(String(id));
        } catch {
          return null;
        }
      })
    );

    const validMovies = movies.filter(Boolean);

    return NextResponse.json({ success: true, movies: validMovies });
  } catch (error) {
    console.error("Batch movie details fetch error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch batch movies" },
      { status: 500 }
    );
  }
}
