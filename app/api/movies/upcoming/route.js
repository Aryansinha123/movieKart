import { NextResponse } from "next/server";
import { tmdbRequest, mapTmdbResult } from "@/lib/tmdb";

export async function GET() {
  try {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const minDate = tomorrow.toISOString().split("T")[0];

    const baseUrl = `/discover/movie?language=en-US&sort_by=popularity.desc&primary_release_date.gte=${minDate}&with_release_type=2|3`;

    // Fetch 2 pages in parallel to get ~40 results
    const [res1, res2] = await Promise.all([
      tmdbRequest(`${baseUrl}&page=1`),
      tmdbRequest(`${baseUrl}&page=2`),
    ]);

    if (!res1.ok) {
      return NextResponse.json({ success: false, message: "TMDB request failed" }, { status: 502 });
    }

    const data1 = await res1.json();
    const data2 = res2.ok ? await res2.json() : { results: [] };

    // Merge results from both pages, sort by popularity (most popular first), take top 40
    const allResults = [...(data1.results || []), ...(data2.results || [])]
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 40)
      .map(mapTmdbResult)
      .filter(Boolean);

    return NextResponse.json({ ...data1, results: allResults });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 502 });
  }
}
