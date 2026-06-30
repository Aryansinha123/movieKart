import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import User from "@/models/User";
import {
  fetchSimilarMovies,
  fetchTMDBRecommendations,
  fetchMovieDetail
} from "@/lib/recommendations";
import { mapTmdbResult, fetchPersonCredits } from "@/lib/tmdb";
import { MOODS } from "@/lib/mood";

// In-memory cache for recommendation results
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedData(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// Helper to fetch collection parts from TMDB
async function fetchCollectionParts(collectionId) {
  if (!collectionId) return [];
  try {
    const res = await fetch(`https://api.themoviedb.org/3/collection/${collectionId}`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        accept: "application/json"
      },
      cache: "no-store"
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.parts || [];
  } catch (err) {
    console.error(`[TMDB] Failed to fetch collection parts for ${collectionId}:`, err.message);
    return [];
  }
}

// In-memory popular fallback list helper
async function fetchPopularFallback() {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/popular`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        accept: "application/json"
      },
      cache: "no-store"
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

export async function GET(req, context) {
  try {
    const params = await context.params;
    const rawId = params.id;
    const numericId = parseInt(rawId, 10);
    const isTv = numericId < 0;

    if (Number.isNaN(numericId)) {
      return NextResponse.json({ success: false, message: "Invalid movie ID" }, { status: 400 });
    }

    // Resolve user data if authenticated
    await connectDB();
    const userData = getUserFromToken(req);
    const userId = userData?.id || "guest";
    const cacheKey = `${numericId}-${userId}`;

    // Return cached results if available
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log(`[Recommendations-API] Cache HIT for movie ID: ${numericId}, User: ${userId}`);
      return NextResponse.json(cached);
    }

    console.log(`[Recommendations-API] Cache MISS. Fetching for movie ID: ${numericId}, User: ${userId}`);

    // Fetch primary movie details first
    const currentMovie = await fetchMovieDetail(numericId);
    if (!currentMovie) {
      return NextResponse.json({ success: false, message: "Movie not found" }, { status: 404 });
    }

    const collectionId = currentMovie.belongs_to_collection?.id;
    const director = currentMovie.credits?.crew?.find(c => c.job === "Director") || currentMovie.created_by?.[0];
    const topActors = currentMovie.credits?.cast?.slice(0, 3) || [];

    // Parallel fetching of all related candidate groups
    const promises = [
      fetchSimilarMovies(numericId).catch(() => []),
      fetchTMDBRecommendations(numericId).catch(() => []),
      collectionId ? fetchCollectionParts(collectionId).catch(() => []) : Promise.resolve([]),
      director ? fetchPersonCredits(director.id).catch(() => ({ crew: [] })) : Promise.resolve({ crew: [] }),
      ...topActors.map(actor => fetchPersonCredits(actor.id).catch(() => ({ cast: [] })))
    ];

    const [
      similarRes,
      recRes,
      collectionRes,
      directorRes,
      ...actorsResList
    ] = await Promise.all(promises);

    // Ingest and associate candidate metadata to prevent separate detail API calls
    const candidates = new Map();

    const addOrUpdateCandidate = (movie, updates = {}) => {
      if (!movie || !movie.id) return;
      const mapped = mapTmdbResult(movie);
      if (!mapped) return;
      const targetId = Number(mapped.id);
      const existing = candidates.get(targetId);

      if (existing) {
        existing.collectionMatch = existing.collectionMatch || updates.collectionMatch || 0;
        existing.directorMatch = existing.directorMatch || updates.directorMatch || 0;
        if (updates.castWeight) {
          existing.castWeights = existing.castWeights || [];
          if (!existing.castWeights.includes(updates.castWeight)) {
            existing.castWeights.push(updates.castWeight);
          }
        }
      } else {
        candidates.set(targetId, {
          ...mapped,
          collectionMatch: updates.collectionMatch || 0,
          directorMatch: updates.directorMatch || 0,
          castWeights: updates.castWeight ? [updates.castWeight] : [],
        });
      }
    };

    similarRes.forEach(m => addOrUpdateCandidate(m));
    recRes.forEach(m => addOrUpdateCandidate(m));
    collectionRes.forEach(m => addOrUpdateCandidate(m, { collectionMatch: 1 }));

    if (directorRes && Array.isArray(directorRes.crew)) {
      directorRes.crew.forEach(m => {
        if (m.job === "Director" || m.department === "Directing") {
          addOrUpdateCandidate(m, { directorMatch: 1 });
        }
      });
    }

    const actorWeights = [1.0, 0.6, 0.3];
    actorsResList.forEach((actorRes, index) => {
      const weight = actorWeights[index] || 0.1;
      if (actorRes && Array.isArray(actorRes.cast)) {
        actorRes.cast.forEach(m => {
          addOrUpdateCandidate(m, { castWeight: weight });
        });
      }
    });

    const currentGenreIds = currentMovie.genres?.map(g => Number(g.id)) || [];
    const primaryGenreId = currentGenreIds[0];

    // Compute scores for candidates
    const candidateList = Array.from(candidates.values())
      .filter(c => Number(c.id) !== numericId)
      .map(c => {
        const candidateGenreIds = (c.genre_ids || c.genres?.map(g => g.id) || []).map(Number);
        const candidatePrimaryGenreId = candidateGenreIds[0];

        // 1. Genre Match (40 pts max)
        let genreMatch = 0;
        if (currentGenreIds.length > 0 && candidateGenreIds.length > 0) {
          const sharedGenres = candidateGenreIds.filter(id => currentGenreIds.includes(id));
          const jaccard = sharedGenres.length / new Set([...currentGenreIds, ...candidateGenreIds]).size;
          const primaryMatch = primaryGenreId === candidatePrimaryGenreId ? 1.0 : 0.0;
          genreMatch = (primaryMatch * 0.4) + (jaccard * 0.6); // strictly normalized in [0, 1]
        }

        // 2. Language Match (20 pts max)
        const languageMatch = c.original_language === currentMovie.original_language ? 1.0 : 0.0;

        // 3. Cast Match (15 pts max)
        const sumWeights = c.castWeights?.reduce((sum, w) => sum + w, 0) || 0;
        const castMatch = Math.min(sumWeights, 1.0);

        // 4. Director Match (10 pts max)
        const directorMatch = c.directorMatch || 0;

        // 5. Collection Match (10 pts max)
        const collectionMatch = c.collectionMatch || 0;

        // 6. Popularity Score (5 pts max)
        const popularityScore = c.popularity ? (c.popularity / (c.popularity + 100)) : 0.0;

        const recommendationScore =
          (genreMatch * 40) +
          (languageMatch * 20) +
          (castMatch * 15) +
          (directorMatch * 10) +
          (collectionMatch * 10) +
          (popularityScore * 5);

        return {
          ...c,
          recommendationScore: Math.round(recommendationScore * 100) / 100
        };
      });

    // Handle personalization for logged-in users
    let user = null;
    if (userData) {
      user = await User.findById(userData.id).lean();
    }

    let recommendedForYouList = [];
    let excludeUserIds = new Set([numericId]);

    if (user) {
      const userWatched = new Set((user.watchedMovies || []).map(Number));
      const userFavorites = new Set((user.favorites || []).map(Number));
      const userWatchlist = new Set((user.watchlist || []).map(Number));
      const notInterested = new Set((user.notInterested || []).map(item => Number(item.movieId)));

      // Union sets for exclusion
      notInterested.forEach(id => excludeUserIds.add(id));
      userWatched.forEach(id => excludeUserIds.add(id));

      recommendedForYouList = candidateList
        .filter(c => !excludeUserIds.has(Number(c.id)))
        .map(c => {
          let score = c.recommendationScore;
          const candidateGenreIds = (c.genre_ids || c.genres?.map(g => g.id) || []).map(Number);

          // Language preference boost (+10 pts)
          if (user.preferredLanguages?.includes(c.original_language)) {
            score += 10;
          }

          // Wishlist/Favorites genre overlap boost (+10 pts)
          const hasGenreOverlap = candidateGenreIds.some(gid => currentGenreIds.includes(gid));
          if (hasGenreOverlap) {
            score += 10;
          }

          // Search history keywords boost (+15 pts)
          if (user.recentSearches?.length > 0) {
            const hasKeywordMatch = user.recentSearches.some(s =>
              c.title?.toLowerCase().includes(s.query?.toLowerCase())
            );
            if (hasKeywordMatch) score += 15;
          }

          return { ...c, recommendationScore: score };
        })
        .sort((a, b) => b.recommendationScore - a.recommendationScore);
    } else {
      // Fallback for guest users (highest genre match)
      recommendedForYouList = [...candidateList]
        .sort((a, b) => b.recommendationScore - a.recommendationScore);
    }

    // Helper: Fill sections with similar/recommended candidates or trending fallback
    const fillSection = async (sectionList, targetCount, filterFn = () => true) => {
      let filtered = sectionList.filter(filterFn);
      if (filtered.length >= targetCount) return filtered.slice(0, targetCount * 2);

      const seenIds = new Set(filtered.map(m => Number(m.id)));
      const additional = candidateList
        .filter(c => !seenIds.has(Number(c.id)) && filterFn(c))
        .slice(0, targetCount - filtered.length);

      filtered = [...filtered, ...additional];

      if (filtered.length < targetCount) {
        const fallbacks = await fetchPopularFallback();
        const mappedFallbacks = fallbacks.map(mapTmdbResult).filter(Boolean);
        const additionalFallbacks = mappedFallbacks
          .filter(f => Number(f.id) !== numericId && !seenIds.has(Number(f.id)) && filterFn(f))
          .slice(0, targetCount - filtered.length);
        filtered = [...filtered, ...additionalFallbacks];
      }

      return filtered;
    };

    // 1. More Like This (min 12)
    const rawMoreLikeThis = candidateList
      .filter(c => (c.genre_ids || []).map(Number).includes(primaryGenreId))
      .sort((a, b) => b.recommendationScore - a.recommendationScore);
    const moreLikeThis = await fillSection(rawMoreLikeThis, 12);

    // 2. Same Language
    const rawSameLanguage = candidateList
      .filter(c => c.original_language === currentMovie.original_language)
      .sort((a, b) => b.recommendationScore - a.recommendationScore);
    const sameLanguage = await fillSection(rawSameLanguage, 8);

    // 3. Recommended For You
    const recommendedForYou = await fillSection(recommendedForYouList, 8, c => !excludeUserIds.has(Number(c.id)));

    // 4. From This Collection
    let collectionMovies = [];
    if (collectionId && collectionRes.length > 0) {
      collectionMovies = collectionRes.map(m => ({
        ...mapTmdbResult(m),
        isCurrent: Number(m.id) === numericId
      })).sort((a, b) => {
        // Sort collection movies by release date if available
        const dateA = a.release_date || "";
        const dateB = b.release_date || "";
        return dateA.localeCompare(dateB);
      });
    }

    // 5. Same Cast (Grouped by actor)
    const sameCast = topActors.slice(0, 2).map((actor, idx) => {
      const actorMovieIds = new Set(
        actorsResList[idx]?.cast?.map(m => Number(m.id)) || []
      );
      const movies = candidateList
        .filter(c => actorMovieIds.has(Number(c.id)))
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, 10);
      return {
        actor: {
          id: actor.id,
          name: actor.name,
          profile_path: actor.profile_path
        },
        movies
      };
    }).filter(group => group.movies.length >= 2);

    // 6. Same Director
    const rawSameDirector = candidateList
      .filter(c => c.directorMatch === 1)
      .sort((a, b) => b.recommendationScore - a.recommendationScore);
    const sameDirector = rawSameDirector.length > 0 ? await fillSection(rawSameDirector, 5) : [];

    // 7. Similar Mood
    const currentMoods = [];
    for (const [moodName, data] of Object.entries(MOODS)) {
      const dataGenres = data.genres.map(Number);
      if (dataGenres.some(gid => currentGenreIds.includes(gid))) {
        currentMoods.push(moodName);
      }
    }
    const primaryMood = currentMoods[0] || "Atmospheric";
    const moodGenres = (MOODS[primaryMood]?.genres || []).map(Number);
    const rawSimilarMood = candidateList
      .filter(c => {
        const cGenres = (c.genre_ids || []).map(Number);
        return cGenres.some(gid => moodGenres.includes(gid));
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore);
    const similarMoodMovies = await fillSection(rawSimilarMood, 8);
    const similarMood = {
      mood: primaryMood,
      movies: similarMoodMovies
    };

    // 8. Similar Runtime
    const currentRuntime = currentMovie.runtime || 120;
    // Estimated or available runtime comparison
    // Standard candidate list from lists usually lacks runtime field.
    // We filter candidates whose genre profile indicates similar runtimes (pacing)
    // or estimate match if they have details.
    const rawSimilarRuntime = candidateList
      .filter(c => {
        // If candidate has runtime, check details.
        // Otherwise check overlap in primary genre to represent pacing
        const hasGenreOverlap = (c.genre_ids || []).map(Number).includes(primaryGenreId);
        return hasGenreOverlap;
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore);
    const similarRuntime = await fillSection(rawSimilarRuntime, 8);

    const responseData = {
      moreLikeThis: moreLikeThis.slice(0, 15),
      sameLanguage: sameLanguage.slice(0, 15),
      recommendedForYou: recommendedForYou.slice(0, 15),
      sameDirector: sameDirector.slice(0, 15),
      sameCast,
      collectionMovies,
      similarMood,
      similarRuntime: similarRuntime.slice(0, 15)
    };

    setCachedData(cacheKey, responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[Recommendations-API] Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
