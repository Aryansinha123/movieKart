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

    // Fetch all requested movies in batches of 50 concurrently to prevent network timeouts
    const chunkSize = 50;
    const movies = [];

    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(async (id) => {
          try {
            return await fetchMovieDetail(String(id));
          } catch {
            return null;
          }
        })
      );
      movies.push(...chunkResults);
    }

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
