import { NextResponse } from "next/server";
import { fetchMovieTrailerKey } from "@/lib/trailers";

export async function GET(_req, { params }) {
  try {
    const resolved = await params;
    const id = parseInt(resolved?.id, 10);
    if (!id) {
      return NextResponse.json({ success: false, trailerKey: null }, { status: 400 });
    }

    const trailerKey = await fetchMovieTrailerKey(id);
    return NextResponse.json({ success: true, trailerKey });
  } catch (error) {
    return NextResponse.json(
      { success: false, trailerKey: null, message: error?.message },
      { status: 500 }
    );
  }
}
