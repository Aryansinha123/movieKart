import { NextResponse } from "next/server";
import { searchMovies, mapTmdbResult, fetchCredits, tmdbRequest } from "@/lib/tmdb";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("query") || "").trim();

    if (!query) return NextResponse.json([]);

    const queryLower = query.toLowerCase();

    // 1. Initial Search (Multi-Search)
    const data = await searchMovies(query);
    const results = data.results || [];

    const expandedResults = [];
    const seenIds = new Set();

    // Helper to add results uniquely
    const addResult = (item, matchReason = "title") => {
      if (!item || !item.id) return;
      const mapped = mapTmdbResult(item);
      if (!mapped) return;
      
      if (!seenIds.has(mapped.id)) {
        seenIds.add(mapped.id);
        expandedResults.push({ ...mapped, _matchReason: matchReason });
      }
    };

    // Process initial results
    for (const item of results) {
      if (item.media_type === "person" && Array.isArray(item.known_for)) {
        item.known_for.forEach(m => addResult(m, "actor"));
      } else if (item.media_type === "movie" || item.media_type === "tv") {
        addResult(item, "title");
      }
    }

    // 2. Character Matching Layer
    // If we have few results or to enrich search, check popular movies for character matches
    // But a better way: check the cast of the movies returned in the search to see if the query matches a character name
    // AND check trending movies for character matches
    
    const trendingRes = await tmdbRequest("/trending/all/day");
    const trendingData = await trendingRes.json();
    const trendingPool = (trendingData.results || []).slice(0, 15);

    const checkPool = [...results.slice(0, 10), ...trendingPool];
    
    const creditMatches = await Promise.all(
      checkPool.map(async (item) => {
        if (item.media_type === "person") return null;
        const credits = await fetchCredits(item.media_type === "tv" ? -item.id : item.id);
        const matchedChar = (credits.cast || []).find(c => 
          (c.character && c.character.toLowerCase().includes(queryLower)) ||
          (c.name && c.name.toLowerCase().includes(queryLower))
        );
        if (matchedChar) {
          return { ...item, _matchReason: "character", _matchedCharacter: matchedChar.character };
        }
        return null;
      })
    );

    creditMatches.filter(Boolean).forEach(m => addResult(m, "character"));

    // 3. Final Scoring and Ranking
    const scored = expandedResults.map(item => {
      let score = 0;
      if (item.title?.toLowerCase().includes(queryLower)) score += 10;
      if (item._matchReason === "character") score += 8;
      if (item._matchReason === "actor") score += 6;
      
      // Popularity boost
      score += (item.vote_average || 0);
      score += Math.min((item.popularity || 0) / 100, 5);
      
      return { ...item, _score: score };
    });

    return NextResponse.json(
      scored
        .sort((a, b) => b._score - a._score)
        .slice(0, 25)
        .map(({ _score, _matchReason, _matchedCharacter, ...m }) => ({
          ...m,
          matchReason: _matchReason,
          matchedCharacter: _matchedCharacter
        }))
    );

  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json([]);
  }
}