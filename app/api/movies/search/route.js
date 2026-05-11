import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json([]);
    }

    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?query=${query}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
          accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    return NextResponse.json(data.results);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}