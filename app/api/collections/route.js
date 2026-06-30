import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Collection from "@/models/Collection";

export async function GET(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const collections = await Collection.find({ ownerId: userData.id })
      .sort({ updatedAt: -1 })
      .lean();

    // Fetch poster for the first movie of each collection
    for (const c of collections) {
      if (!c.imageUrl && c.movies && c.movies.length > 0) {
        try {
          const firstMovieId = c.movies[0];
          const isTv = firstMovieId < 0;
          const realId = Math.abs(firstMovieId);
          const path = isTv ? `/tv/${realId}` : `/movie/${realId}`;
          const tmdbRes = await fetch(`https://api.themoviedb.org/3${path}?api_key=${process.env.TMDB_API_KEY}`);
          if (tmdbRes.ok) {
            const tmdbData = await tmdbRes.json();
            c.firstMoviePoster = tmdbData.poster_path;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    return NextResponse.json({ success: true, collections });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const name = (body?.name || "").toString().trim();
    const description = (body?.description || "").toString().trim();
    const category = (body?.category || "Custom").toString().trim();

    // Accept visibility enum; fall back to isPublic boolean for legacy callers
    const VALID_VISIBILITIES = ["public", "unlisted", "private", "collaborative_private"];
    let visibility = body?.visibility;
    if (!VALID_VISIBILITIES.includes(visibility)) {
      // Legacy callers that send isPublic: true/false
      visibility = body?.isPublic ? "public" : "private";
    }
    const isPublic = visibility === "public";

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Collection name is required." },
        { status: 400 }
      );
    }

    const collection = await Collection.create({
      ownerId: userData.id,
      name,
      description,
      category,
      visibility,
      isPublic,
      movies: [],
    });

    return NextResponse.json({ success: true, collection });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

