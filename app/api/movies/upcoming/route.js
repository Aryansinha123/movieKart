import { NextResponse } from "next/server";
import { tmdbRequest, mapTmdbResult } from "@/lib/tmdb";

export async function GET() {
  try {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const minDate = tomorrow.toISOString().split("T")[0];

    const res = await tmdbRequest(`/discover/movie?language=en-US&sort_by=popularity.desc&primary_release_date.gte=${minDate}&with_release_type=2|3`);
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
