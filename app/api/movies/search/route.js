import { NextResponse } from "next/server";
import { 
  searchMovies, 
  mapTmdbResult, 
  fetchCredits, 
  tmdbRequest, 
  searchPeople, 
  fetchPersonCredits 
} from "@/lib/tmdb";

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

    // Helper to add results uniquely and resolve priority of match reasons
    const addResult = (item, matchReason = "title", matchedPersonName = null, matchedCharacterName = null, personIndex = -1) => {
      if (!item || !item.id) return;
      const mapped = mapTmdbResult(item);
      if (!mapped) return;
      
      const id = mapped.id;
      // Calculate person relevance boost: index 0 -> 12, index 1 -> 5, index 2 -> 2, otherwise 0
      const personBoost = personIndex === 0 ? 12 : (personIndex === 1 ? 5 : (personIndex === 2 ? 2 : 0));

      if (!seenIds.has(id)) {
        seenIds.add(id);
        expandedResults.push({ 
          ...mapped, 
          _matchReason: matchReason,
          _matchedPerson: matchedPersonName,
          _matchedCharacter: matchedCharacterName,
          _personBoost: personBoost
        });
      } else {
        const existing = expandedResults.find(r => r.id === id);
        if (existing) {
          const reasonPriority = { director: 4, actor: 3, character: 2, title: 1 };
          const existingPriority = reasonPriority[existing._matchReason] || 0;
          const newPriority = reasonPriority[matchReason] || 0;
          
          // Update person boost if this is a stronger/more relevant person match
          if (personBoost > (existing._personBoost || 0)) {
            existing._personBoost = personBoost;
            existing._matchedPerson = matchedPersonName;
          }

          if (newPriority > existingPriority) {
            existing._matchReason = matchReason;
            if (matchedCharacterName) {
              existing._matchedCharacter = matchedCharacterName;
            }
          }
        }
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

    // 1.5. Person Search Layer (Actors & Directors)
    const personData = await searchPeople(query);
    const people = personData.results || [];
    const topPeople = people.slice(0, 3);

    const peopleCredits = await Promise.all(
      topPeople.map(async (person, index) => {
        const credits = await fetchPersonCredits(person.id);
        return { person, credits, index };
      })
    );

    for (const { person, credits, index } of peopleCredits) {
      if (Array.isArray(credits.crew)) {
        credits.crew.forEach(item => {
          if (item.job === "Director") {
            addResult(item, "director", person.name, null, index);
          }
        });
      }
      if (Array.isArray(credits.cast)) {
        credits.cast.forEach(item => {
          addResult(item, "actor", person.name, null, index);
        });
      }
    }

    // 2. Character Matching Layer
    // Check trending movies and results for character matches
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
          return { 
            ...item, 
            _matchReason: "character", 
            _matchedCharacter: matchedChar.character,
            _matchedPerson: matchedChar.name
          };
        }
        return null;
      })
    );

    creditMatches.filter(Boolean).forEach(m => addResult(m, "character", m._matchedPerson, m._matchedCharacter));

    // 3. Final Scoring and Ranking
    const scored = expandedResults.map(item => {
      let score = 0;
      if (item.title?.toLowerCase().includes(queryLower)) score += 10;
      if (item._matchReason === "director") score += 9;
      if (item._matchReason === "character") score += 8;
      if (item._matchReason === "actor") score += 7;
      
      // Add the person index relevance boost
      score += (item._personBoost || 0);

      // Popularity & Vote count boost to favor well-known blockbusters
      score += (item.vote_average || 0);
      score += Math.min((item.popularity || 0) / 50, 8);
      score += Math.min(Math.log10((item.vote_count || 0) + 1) * 2.5, 10);
      
      return { ...item, _score: score };
    });

    // Create results for the matching people (actors/directors) themselves
    const peopleResults = topPeople.map((person, index) => {
      const personBoost = index === 0 ? 15 : (index === 1 ? 8 : 4);
      return {
        id: person.id,
        media_type: "person",
        title: person.name,
        poster_path: person.profile_path,
        known_for_department: person.known_for_department,
        matchReason: "person",
        popularity: person.popularity,
        _score: 30 + personBoost + Math.min((person.popularity || 0) / 10, 5)
      };
    });

    const combinedResults = [...scored, ...peopleResults];

    return NextResponse.json(
      combinedResults
        .sort((a, b) => b._score - a._score)
        .slice(0, 25)
        .map(({ _score, _matchReason, _matchedCharacter, _matchedPerson, ...m }) => ({
          ...m,
          matchReason: _matchReason || m.matchReason,
          matchedCharacter: _matchedCharacter || m.matchedCharacter,
          matchedPerson: _matchedPerson || m.matchedPerson
        }))
    );

  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json([]);
  }
}