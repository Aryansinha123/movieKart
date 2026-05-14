import { NextResponse } from "next/server";
import { tmdbRequest, mapTmdbResult } from "@/lib/tmdb";

export async function GET() {
  try {
    // We can use discover to get movies released in the last 2-3 weeks
    const today = new Date();
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const minDate = twoWeeksAgo.toISOString().split("T")[0];
    const maxDate = today.toISOString().split("T")[0];

    const res = await tmdbRequest(`/discover/movie?language=en-US&sort_by=popularity.desc&primary_release_date.gte=${minDate}&primary_release_date.lte=${maxDate}&with_release_type=2|3`);
    if (!res.ok) {
      return NextResponse.json({ success: false, message: "TMDB request failed" }, { status: 502 });
    }
    const data = await res.json();
    if (data.results) {
      data.results = data.results.map(mapTmdbResult).filter(Boolean);
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 502 });
  }
}
