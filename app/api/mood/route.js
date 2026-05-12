import { NextResponse } from "next/server";
import { searchMovies } from "@/lib/tmdb";
import { analyzePromptForMoods, getDiscoverParamsForMoods, MOODS } from "@/lib/mood";

// In a real app, this would use the discover/movie endpoint with genres and keywords.
// For the sake of this feature, we will use a combination of TMDB search and discover
// or just return predefined curated lists if it's a generic mood request.
export async function POST(req) {
  try {
    const { prompt, mood } = await req.json();

    if (prompt) {
      // Natural Language Processing Path
      const matchedMoods = analyzePromptForMoods(prompt);
      
      // We will perform a keyword search on TMDB with the prompt to see if anything matches,
      // and combine it with a discover query based on the mapped genres.
      
      const searchRes = await searchMovies(prompt);
      const searchResults = searchRes.results || [];
      
      // Let's also do a discover request (pseudo-code using fetch directly for discover)
      const params = getDiscoverParamsForMoods(matchedMoods);
      const discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&with_genres=${params.with_genres}&sort_by=popularity.desc`;
      
      const discoverRes = await fetch(discoverUrl);
      const discoverData = await discoverRes.json();
      
      // Combine and deduplicate
      const combined = [...searchResults, ...(discoverData.results || [])];
      const uniqueMovies = [];
      const seenIds = new Set();
      
      for (const m of combined) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          uniqueMovies.push(m);
        }
      }

      return NextResponse.json({
        success: true,
        matchedMoods,
        movies: uniqueMovies.slice(0, 20),
        message: `Found ${uniqueMovies.length} movies matching your mood.`,
      });
    } else if (mood) {
      // Specific Mood Category Path
      const params = getDiscoverParamsForMoods([mood]);
      const discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&with_genres=${params.with_genres}&sort_by=vote_average.desc&vote_count.gte=1000`;
      
      const discoverRes = await fetch(discoverUrl);
      const discoverData = await discoverRes.json();
      
      return NextResponse.json({
        success: true,
        mood,
        movies: discoverData.results || [],
      });
    }

    return NextResponse.json({ success: false, error: "Provide a prompt or mood" }, { status: 400 });
  } catch (error) {
    console.error("Mood search error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  // Return the available moods
  return NextResponse.json({
    success: true,
    moods: Object.keys(MOODS).map(key => ({
      name: key,
      description: MOODS[key].description,
    }))
  });
}
