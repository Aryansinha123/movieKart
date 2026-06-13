/**
 * Recommendation Engine
 * Analyzes user behavior and movie metadata to generate personalized recommendations.
 */

import { mapTmdbResult } from "./tmdb";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_KEY = process.env.TMDB_API_KEY;

function tmdbHeaders() {
  return {
    Authorization: `Bearer ${TMDB_KEY}`,
    accept: "application/json",
  };
}

/**
 * Fetch similar movies from TMDB for a given movie ID
 */
export async function fetchSimilarMovies(movieIdStr) {
  try {
    const numericId = parseInt(movieIdStr, 10);
    const isTv = numericId < 0;
    const realId = isTv ? -numericId : numericId;
    const path = isTv ? `/tv/${realId}/similar` : `/movie/${realId}/similar`;
    
    // Fetch 2 pages to ensure we have at least 25
    const [p1, p2] = await Promise.all([
      fetch(`${TMDB_BASE}${path}?page=1`, { headers: tmdbHeaders(), cache: "no-store" }),
      fetch(`${TMDB_BASE}${path}?page=2`, { headers: tmdbHeaders(), cache: "no-store" })
    ]);
    
    const d1 = await p1.json().catch(() => ({ results: [] }));
    const d2 = await p2.json().catch(() => ({ results: [] }));
    const combined = [...(d1.results || []), ...(d2.results || [])];
    
    return combined.map(m => mapTmdbResult({ ...m, media_type: isTv ? "tv" : "movie" }));
  } catch {
    return [];
  }
}

/**
 * Fetch movie recommendations from TMDB (different algorithm from similar)
 */
export async function fetchTMDBRecommendations(movieIdStr) {
  try {
    const numericId = parseInt(movieIdStr, 10);
    const isTv = numericId < 0;
    const realId = isTv ? -numericId : numericId;
    const path = isTv ? `/tv/${realId}/recommendations` : `/movie/${realId}/recommendations`;

    const [p1, p2] = await Promise.all([
      fetch(`${TMDB_BASE}${path}?page=1`, { headers: tmdbHeaders(), cache: "no-store" }),
      fetch(`${TMDB_BASE}${path}?page=2`, { headers: tmdbHeaders(), cache: "no-store" })
    ]);
    
    const d1 = await p1.json().catch(() => ({ results: [] }));
    const d2 = await p2.json().catch(() => ({ results: [] }));
    const combined = [...(d1.results || []), ...(d2.results || [])];
    
    return combined.map(m => mapTmdbResult({ ...m, media_type: isTv ? "tv" : "movie" }));
  } catch {
    return [];
  }
}

/**
 * Fetch movie details from TMDB
 */
export async function fetchMovieDetail(movieIdStr) {
  try {
    const numericId = parseInt(movieIdStr, 10);
    const isTv = numericId < 0;
    const realId = isTv ? -numericId : numericId;
    const path = isTv 
      ? `/tv/${realId}?append_to_response=keywords,credits` 
      : `/movie/${realId}?append_to_response=keywords,credits`;

    const res = await fetch(`${TMDB_BASE}${path}`, {
      headers: tmdbHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return mapTmdbResult({ ...data, media_type: isTv ? "tv" : "movie" });
  } catch {
    return null;
  }
}

/**
 * Fetch movies by genre from TMDB discover
 */
export async function discoverByGenre(genreId, page = 1) {
  try {
    const res = await fetch(
      `${TMDB_BASE}/discover/movie?with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=100&page=${page}`,
      { headers: tmdbHeaders(), cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

/**
 * Fetch movies by language from TMDB discover
 */
export async function discoverByLanguage(langCode, page = 1) {
  try {
    const res = await fetch(
      `${TMDB_BASE}/discover/movie?with_original_language=${langCode}&sort_by=popularity.desc&vote_count.gte=50&page=${page}`,
      { headers: tmdbHeaders(), cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

/**
 * Fetch movies by decade
 */
export async function discoverByDecade(startYear, endYear, page = 1) {
  try {
    const res = await fetch(
      `${TMDB_BASE}/discover/movie?primary_release_date.gte=${startYear}-01-01&primary_release_date.lte=${endYear}-12-31&sort_by=vote_average.desc&vote_count.gte=50&page=${page}`,
      { headers: tmdbHeaders(), cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

/**
 * Fetch hidden gems (high rated, low popularity)
 */
export async function discoverHiddenGems(genreIds = [], page = 1) {
  try {
    const genreParam = genreIds.length > 0 ? `&with_genres=${genreIds.join(",")}` : "";
    const res = await fetch(
      `${TMDB_BASE}/discover/movie?sort_by=vote_average.desc&vote_count.gte=30&vote_count.lte=500&vote_average.gte=7${genreParam}&page=${page}`,
      { headers: tmdbHeaders(), cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

/**
 * Fetch Curated Franchise/Collection Recommendations
 * MCU, DC Universe, American Comedies
 */
export async function getCuratedCollections() {
  try {
    const [mcuRes, dcRes, sitcomsRes] = await Promise.all([
      fetch(`${TMDB_BASE}/discover/movie?with_companies=420&sort_by=popularity.desc`, { headers: tmdbHeaders(), cache: "no-store" }), // Marvel Studios
      fetch(`${TMDB_BASE}/discover/movie?with_companies=429|12806&sort_by=popularity.desc`, { headers: tmdbHeaders(), cache: "no-store" }), // DC Films / Entertainment
      fetch(`${TMDB_BASE}/discover/movie?with_genres=35&with_origin_country=US&sort_by=popularity.desc`, { headers: tmdbHeaders(), cache: "no-store" }) // American Comedies
    ]);

    const mcu = await mcuRes.json().catch(() => ({ results: [] }));
    const dc = await dcRes.json().catch(() => ({ results: [] }));
    const sitcoms = await sitcomsRes.json().catch(() => ({ results: [] }));

    return [
      { 
        id: "mcu", 
        title: "Marvel Cinematic Universe", 
        subtitle: "Epic superhero blockbusters from Marvel Studios", 
        gradient: "bg-gradient-to-br from-red-500 to-rose-700", 
        movies: mcu.results?.slice(0, 25) || [] 
      },
      { 
        id: "dc", 
        title: "DC Universe", 
        subtitle: "Iconic heroes from the world of DC Comics", 
        gradient: "bg-gradient-to-br from-blue-500 to-indigo-700", 
        movies: dc.results?.slice(0, 25) || [] 
      },
      { 
        id: "sitcoms", 
        title: "American Comedies", 
        subtitle: "Laugh out loud with popular US comedies and sitcoms", 
        gradient: "bg-gradient-to-br from-yellow-400 to-orange-500", 
        movies: sitcoms.results?.slice(0, 25) || [] 
      }
    ].filter(c => c.movies.length > 0);
  } catch (error) {
    return [];
  }
}

/**
 * Movies highly rated (4★+) by users with overlapping taste (watched overlap).
 * Caller supplies candidate user ids; aggregates review counts for ranking.
 */
export function rankMoviesFromPeerReviews(peerReviews, excludeSet, minRating = 4) {
  const counts = {};
  const bestRating = {};
  for (const r of peerReviews || []) {
    if (r.rating < minRating) continue;
    const mid = r.movieId;
    if (excludeSet.has(mid)) continue;
    counts[mid] = (counts[mid] || 0) + 1;
    bestRating[mid] = Math.max(bestRating[mid] || 0, r.rating);
  }
  return Object.keys(counts)
    .map((id) => ({
      movieId: parseInt(id, 10),
      peerScore: counts[id] * (bestRating[id] || 4),
    }))
    .sort((a, b) => b.peerScore - a.peerScore);
}

// ─── Taste Analysis ─────────────────────────────────────────────

/**
 * TMDB genre ID to name mapping
 */
export const GENRE_MAP = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};

/**
 * Analyze taste profile from watched movie details and reviews
 */
/**
 * Analyze taste profile from watched movie details and reviews.
 * This is the "Taste DNA" of the user.
 */
export function analyzeTasteProfile(movieDetails, reviews) {
  const genreWeights = {};
  const moodWeights = {};
  const actorWeights = {};
  const directorWeights = {};
  const decadeCounts = {};
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRating = 0;
  let ratingCount = 0;
  const runtimeBuckets = { short: 0, medium: 0, long: 0, epic: 0 };

  const { MOODS } = require("./mood");

  // Create a map for quick lookup of ratings
  const ratingMap = {};
  for (const r of reviews || []) {
    ratingMap[r.movieId] = r.rating;
    if (r.rating >= 1 && r.rating <= 5) {
      ratingDistribution[r.rating]++;
      totalRating += r.rating;
      ratingCount++;
    }
  }

  // Helper to get weight multiplier based on rating
  const getRatingWeight = (movieId) => {
    const r = ratingMap[movieId];
    if (r === 5) return 2.5; // Strong signal
    if (r === 4) return 1.5; // Positive signal
    if (r === 3) return 1.0; // Neutral
    if (r === 2) return 0.4; // Negative signal
    if (r === 1) return 0.1; // Avoid
    return 1.0; // Default (watched but not rated)
  };

  // Process movie details for deep analysis
  for (const movie of movieDetails) {
    if (!movie) continue;
    const rWeight = getRatingWeight(movie.id);

    // Genre analysis
    if (movie.genres) {
      for (const genre of movie.genres) {
        genreWeights[genre.id] = (genreWeights[genre.id] || 0) + (1 * rWeight);
      }
    }

    // Mood analysis (Genre-to-Mood mapping)
    for (const [moodName, moodData] of Object.entries(MOODS)) {
      const hasGenreMatch = moodData.genres.some(gid => movie.genres?.some(mg => mg.id === gid));
      if (hasGenreMatch) {
        moodWeights[moodName] = (moodWeights[moodName] || 0) + (1 * rWeight);
      }
    }

    // Era/decade analysis
    if (movie.release_date) {
      const year = parseInt(movie.release_date.substring(0, 4));
      const decade = Math.floor(year / 10) * 10;
      decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
    }

    // Runtime analysis
    if (movie.runtime) {
      if (movie.runtime < 90) runtimeBuckets.short++;
      else if (movie.runtime < 120) runtimeBuckets.medium++;
      else if (movie.runtime < 150) runtimeBuckets.long++;
      else runtimeBuckets.epic++;
    }
  }

  // Calculate percentage-based weights for the profile
  const normalizeWeights = (obj) => {
    const total = Object.values(obj).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(obj)
      .map(([id, weight]) => ({ id, weight: Math.round((weight / total) * 100) }))
      .sort((a, b) => b.weight - a.weight);
  };

  const favoriteGenres = normalizeWeights(genreWeights).slice(0, 8).map(g => ({
    id: parseInt(g.id),
    name: GENRE_MAP[parseInt(g.id)] || "Unknown",
    score: g.weight
  }));

  const moodPreferences = normalizeWeights(moodWeights).slice(0, 10).map(m => ({
    name: m.id,
    score: m.weight
  }));

  const preferredEras = Object.entries(decadeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([decade, count]) => ({ decade: parseInt(decade), count }));

  const runtimeEntries = Object.entries(runtimeBuckets).sort(([, a], [, b]) => b - a);
  const preferredRuntime = runtimeEntries[0]?.[0] || "medium";

  const reviewBehavior = analyzeReviewBehavior(reviews);

  return {
    favoriteGenres,
    moodPreferences,
    preferredEras,
    averageRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : null,
    ratingDistribution,
    totalMoviesWatched: movieDetails.length,
    totalReviews: (reviews || []).length,
    preferredRuntime,
    runtimeBuckets,
    reviewBehavior,
    tasteDNA: {
      genres: genreWeights,
      moods: moodWeights,
      rawScores: { genreWeights, moodWeights }
    }
  };
}

/** Simple lexicon sentiment for review comments (-1 … 1). */
const POSITIVE_WORDS = new Set([
  "love", "loved", "amazing", "brilliant", "masterpiece", "beautiful", "perfect",
  "great", "excellent", "fantastic", "wonderful", "best", "favorite", "favourite",
  "enjoyed", "incredible", "gem", "heartwarming", "uplifting", "funny", "hilarious",
]);
const NEGATIVE_WORDS = new Set([
  "hate", "hated", "terrible", "awful", "boring", "bad", "worst", "disappointing",
  "waste", "mediocre", "poor", "weak", "overrated", "dull", "confusing", "mess",
]);

/** Map review text + genres to taste "moods" / styles. */
const STYLE_FROM_COMMENT = [
  { id: "dark_thrilling", label: "Dark & thrilling", patterns: [/dark\b/i, /disturb/i, /tense/i, /suspense/i, /creepy/i, /gritty/i, /violent/i, /murder/i] },
  { id: "lighthearted", label: "Lighthearted fun", patterns: [/fun\b/i, /funny/i, /laugh/i, /feel-good/i, /charming/i, /cute/i, /happy/i, /joy/i] },
  { id: "emotional", label: "Emotional drama", patterns: [/cry/i, /tear/i, /heart/i, /moving/i, /touching/i, /sad\b/i, /melancholy/i, /depressing/i] },
  { id: "thought_provoking", label: "Thought-provoking", patterns: [/thought/i, /deep\b/i, /philosoph/i, /meaning/i, /smart\b/i, /existential/i, /complex/i] },
  { id: "epic_spectacle", label: "Epic spectacle", patterns: [/epic/i, /spectacle/i, /scale/i, /visual/i, /stunning/i, /cinematograph/i, /grand/i] },
  { id: "mind_bending", label: "Mind-bending", patterns: [/mindfuck/i, /twist/i, /confus/i, /brain/i, /crazy/i, /trippy/i, /surreal/i] },
];

const STYLE_FROM_GENRE_IDS = {
  27: "dark_thrilling",
  53: "dark_thrilling",
  80: "dark_thrilling",
  35: "lighthearted",
  10751: "lighthearted",
  16: "lighthearted",
  18: "emotional",
  10749: "emotional",
  12: "epic_spectacle",
  14: "epic_spectacle",
  878: "epic_spectacle",
};

const STYLE_LABELS = {
  dark_thrilling: "Dark & thrilling",
  lighthearted: "Lighthearted",
  emotional: "Emotional",
  thought_provoking: "Thought-provoking",
  epic_spectacle: "Epic & spectacle",
};

/**
 * Review behavior: sentiment from comments, writing engagement, style hints.
 */
export function analyzeReviewBehavior(reviews) {
  let pos = 0;
  let neg = 0;
  const styleScores = {};
  let commentChars = 0;
  let commentsWithText = 0;

  for (const review of reviews || []) {
    const text = (review.comment || "").toLowerCase();
    if (text.trim().length > 0) {
      commentsWithText++;
      commentChars += text.length;
    }
    const words = text.split(/\W+/).filter(Boolean);
    for (const w of words) {
      if (POSITIVE_WORDS.has(w)) pos++;
      if (NEGATIVE_WORDS.has(w)) neg++;
    }
    for (const { id, patterns } of STYLE_FROM_COMMENT) {
      if (patterns.some((re) => re.test(text))) {
        styleScores[id] = (styleScores[id] || 0) + 1;
      }
    }
  }

  const lex = pos + neg;
  const avgSentiment = lex > 0 ? (pos - neg) / lex : null;

  const stylePreferences = Object.entries(styleScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({
      id,
      label: STYLE_LABELS[id] || id,
      count,
    }));

  return {
    avgSentiment,
    positiveHits: pos,
    negativeHits: neg,
    stylePreferences,
    commentsWithText,
    avgCommentLength:
      commentsWithText > 0 ? Math.round(commentChars / commentsWithText) : 0,
    isVerboseReviewer: commentsWithText >= 3 && commentChars / Math.max(commentsWithText, 1) > 80,
  };
}

function inferCinemaStylesFromMovies(movieDetails) {
  const scores = {};
  for (const movie of movieDetails || []) {
    for (const g of movie.genres || []) {
      const sid = STYLE_FROM_GENRE_IDS[g.id];
      if (sid) scores[sid] = (scores[sid] || 0) + 1;
    }
  }
  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({
      id,
      label: STYLE_LABELS[id] || id,
      count,
    }));
}

/**
 * Single scalar sentiment from reviews for similarity (-1 … 1, null if no signal).
 */
export function reviewSentimentScore(reviews) {
  const rb = analyzeReviewBehavior(reviews);
  if (rb.avgSentiment === null) {
    if (!reviews?.length) return null;
    const avgRating =
      reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
    return (avgRating - 3) / 2;
  }
  return rb.avgSentiment;
}

/**
 * Fetch credits (cast + crew) for one movie.
 */
export async function fetchMovieCredits(movieIdStr) {
  try {
    const numericId = parseInt(movieIdStr, 10);
    const isTv = numericId < 0;
    const realId = isTv ? -numericId : numericId;
    const path = isTv ? `/tv/${realId}/credits` : `/movie/${realId}/credits`;

    const res = await fetch(`${TMDB_BASE}${path}`, {
      headers: tmdbHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Aggregate favorite actors / directors from TMDB credits for recent watches.
 */
export async function aggregateTalentFromMovieIds(movieIds, maxMovies = 15) {
  const actorCounts = {};
  const directorCounts = {};
  const slice = movieIds.slice(-maxMovies);
  for (const movieId of slice) {
    const credits = await fetchMovieCredits(movieId);
    if (!credits) continue;
    for (const actor of (credits.cast || []).slice(0, 4)) {
      actorCounts[actor.name] = (actorCounts[actor.name] || 0) + 1;
    }
    for (const crew of credits.crew || []) {
      if (crew.job === "Director") {
        directorCounts[crew.name] = (directorCounts[crew.name] || 0) + 1;
      }
    }
  }
  const favoriteActors = Object.entries(actorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
  const favoriteDirectors = Object.entries(directorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));
  return { favoriteActors, favoriteDirectors };
}

// ─── Similar Users Engine ───────────────────────────────────────

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Calculate cosine similarity between two rating vectors
 */
function cosineSimilarity(ratingsA, ratingsB) {
  const commonMovies = Object.keys(ratingsA).filter((id) => id in ratingsB);
  if (commonMovies.length === 0) return 0;

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const movieId of commonMovies) {
    dotProduct += ratingsA[movieId] * ratingsB[movieId];
    magA += ratingsA[movieId] ** 2;
    magB += ratingsB[movieId] ** 2;
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}

function sentimentSimilarityFromReviews(reviewsA, reviewsB) {
  const a = reviewSentimentScore(reviewsA || []);
  const b = reviewSentimentScore(reviewsB || []);
  if (a === null && b === null) return 0;
  if (a === null || b === null) return 0.35;
  const sim = 1 - Math.abs(a - b) / 2;
  return Math.max(0, Math.min(1, sim));
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function getRatingsMap(reviews = []) {
  const ratings = {};
  for (const r of reviews) ratings[r.movieId] = r.rating;
  return ratings;
}

function averageRatingDeviationSimilarity(ratingsA, ratingsB) {
  const common = Object.keys(ratingsA).filter((id) => id in ratingsB);
  if (common.length === 0) return 0;
  let totalDiff = 0;
  for (const movieId of common) {
    totalDiff += Math.abs((ratingsA[movieId] || 0) - (ratingsB[movieId] || 0));
  }
  const avgDiff = totalDiff / common.length; // max diff on 1..5 scale = 4
  return clamp01(1 - avgDiff / 4);
}

function watchBehaviorPatternSimilarity(userA, userB) {
  const watchedA = (userA.watchedMovies || []).length;
  const watchedB = (userB.watchedMovies || []).length;
  const reviewsA = (userA.reviews || []).length;
  const reviewsB = (userB.reviews || []).length;
  const collectionsA = (userA.collections || []).length;
  const collectionsB = (userB.collections || []).length;

  const watchVolumeSim =
    1 - Math.abs(watchedA - watchedB) / Math.max(watchedA, watchedB, 1);
  const reviewRateA = reviewsA / Math.max(watchedA, 1);
  const reviewRateB = reviewsB / Math.max(watchedB, 1);
  const reviewRateSim = 1 - Math.abs(reviewRateA - reviewRateB) / Math.max(reviewRateA, reviewRateB, 1);

  const collectionRateA = collectionsA / Math.max(watchedA, 1);
  const collectionRateB = collectionsB / Math.max(watchedB, 1);
  const collectionRateSim =
    1 - Math.abs(collectionRateA - collectionRateB) / Math.max(collectionRateA, collectionRateB, 1);

  return clamp01(watchVolumeSim * 0.5 + reviewRateSim * 0.3 + collectionRateSim * 0.2);
}

function normalizeMovieIdSet(values = []) {
  return new Set(values.map((x) => String(x)));
}

function extractCollectionMovieSet(collections = []) {
  const set = new Set();
  for (const c of collections) {
    for (const m of c.movies || []) set.add(String(m));
  }
  return set;
}

function topTalentSimilarity(a = {}, b = {}) {
  const actorsA = new Set((a.topActors || []).slice(0, 10).map((x) => String(x).toLowerCase()));
  const actorsB = new Set((b.topActors || []).slice(0, 10).map((x) => String(x).toLowerCase()));
  const directorsA = new Set((a.topDirectors || []).slice(0, 8).map((x) => String(x).toLowerCase()));
  const directorsB = new Set((b.topDirectors || []).slice(0, 8).map((x) => String(x).toLowerCase()));
  const actorSim = jaccardSimilarity(actorsA, actorsB);
  const directorSim = jaccardSimilarity(directorsA, directorsB);
  return clamp01(actorSim * 0.55 + directorSim * 0.45);
}

/**
 * Calculate similarity score between two users
 * Uses watched overlap, rating vectors, genres, collections, and review sentiment.
 */
export function calculateUserSimilarity(userA, userB) {
  const watchedA = normalizeMovieIdSet(userA.watchedMovies || []);
  const watchedB = normalizeMovieIdSet(userB.watchedMovies || []);
  const reviewedA = normalizeMovieIdSet((userA.reviews || []).map((r) => r.movieId));
  const reviewedB = normalizeMovieIdSet((userB.reviews || []).map((r) => r.movieId));
  const likedA = normalizeMovieIdSet(userA.likedMovieIds || []);
  const likedB = normalizeMovieIdSet(userB.likedMovieIds || []);

  const watchSignalA = new Set([...watchedA, ...reviewedA, ...likedA]);
  const watchSignalB = new Set([...watchedB, ...reviewedB, ...likedB]);
  const watchedOverlap = jaccardSimilarity(watchSignalA, watchSignalB);
  const behaviorSim = watchBehaviorPatternSimilarity(userA, userB);
  const watchedSim = clamp01(watchedOverlap * 0.8 + behaviorSim * 0.2);

  const ratingsA = getRatingsMap(userA.reviews || []);
  const ratingsB = getRatingsMap(userB.reviews || []);
  const ratingsCosine = cosineSimilarity(ratingsA, ratingsB);
  const ratingsDeviation = averageRatingDeviationSimilarity(ratingsA, ratingsB);
  const ratingsSim = clamp01(ratingsCosine * 0.75 + ratingsDeviation * 0.25);

  const genresA = new Set((userA.topGenres || []).map(String));
  const genresB = new Set((userB.topGenres || []).map(String));
  const genreJaccard = jaccardSimilarity(genresA, genresB);
  const talentSim = topTalentSimilarity(userA, userB);
  const genreSim = clamp01(genreJaccard * 0.85 + talentSim * 0.15);

  const collectA = extractCollectionMovieSet(userA.collections || []);
  const collectB = extractCollectionMovieSet(userB.collections || []);
  const collectSim = jaccardSimilarity(collectA, collectB);

  const reviewSim = sentimentSimilarityFromReviews(userA.reviews, userB.reviews);

  // Weighted formula requested for Taste Match %
  const totalScore =
    watchedSim * 0.3 +
    ratingsSim * 0.35 +
    genreSim * 0.2 +
    collectSim * 0.1 +
    reviewSim * 0.05;

  const sharedWatchedMovieIds = [...watchedA].filter((id) => watchedB.has(id)).map((id) => parseInt(id, 10));
  const sharedGenres = [...genresA].filter((id) => genresB.has(id)).map((id) => parseInt(id, 10));

  return {
    overall: parseFloat(totalScore.toFixed(3)),
    compatibilityPercent: Math.round(totalScore * 100),
    watched: parseFloat(watchedSim.toFixed(3)),
    watchedOverlap: parseFloat(watchedOverlap.toFixed(3)),
    watchBehavior: parseFloat(behaviorSim.toFixed(3)),
    ratings: parseFloat(ratingsSim.toFixed(3)),
    ratingCosine: parseFloat(ratingsCosine.toFixed(3)),
    ratingDeviation: parseFloat(ratingsDeviation.toFixed(3)),
    genres: parseFloat(genreSim.toFixed(3)),
    talent: parseFloat(talentSim.toFixed(3)),
    collections: parseFloat(collectSim.toFixed(3)),
    reviewSentiment: parseFloat(reviewSim.toFixed(3)),
    sharedWatchedMovieIds: sharedWatchedMovieIds.slice(0, 20),
    sharedGenreIds: sharedGenres.slice(0, 8),
  };
}

/**
 * Generate "Because You Watched" recommendations
 * Pick top N recently watched movies and fetch similar movies from TMDB
 */
export async function becauseYouWatched(watchedMovieIds, excludeIds = new Set()) {
  const exclude = excludeIds instanceof Set ? exclusionSet(excludeIds) : exclusionSet(excludeIds);
  // Take last 5 watched movies
  const recentWatched = watchedMovieIds.slice(-5).reverse();
  const results = [];

  for (const movieId of recentWatched) {
    const [movieDetail, similar] = await Promise.all([
      fetchMovieDetail(movieId),
      fetchSimilarMovies(movieId),
    ]);

    if (!movieDetail || similar.length === 0) continue;

    const sourceLang = movieDetail.original_language;
    
    let filtered = similar.filter((m) => passesExclude(exclude, m.id) && m.poster_path);

    // If the source movie is non-English (e.g., Hindi), prioritize results in the same language
    // to prevent Hollywood dominance in localized recommendations.
    if (sourceLang && sourceLang !== "en") {
      const sameLang = filtered.filter(m => m.original_language === sourceLang);
      const otherLang = filtered.filter(m => m.original_language !== sourceLang);
      filtered = [...sameLang, ...otherLang];
    }

    if (filtered.length > 0) {
      results.push({
        sourceMovie: {
          id: movieDetail.id,
          title: movieDetail.title,
          poster_path: movieDetail.poster_path,
        },
        recommendations: filtered.slice(0, 25),
      });
    }

    if (results.length >= 3) break;
  }

  return results;
}

/**
 * Normalize id set for TMDB numeric ids.
 */
function exclusionSet(excludeIds) {
  const s = new Set();
  for (const x of excludeIds || []) {
    const n = typeof x === "number" ? x : parseInt(String(x), 10);
    if (!Number.isNaN(n)) s.add(n);
  }
  return s;
}

function passesExclude(exclude, movieId) {
  const id = typeof movieId === "number" ? movieId : parseInt(String(movieId), 10);
  return !exclude.has(id);
}

/**
 * Generate "Recommended For You" using combined signals:
 * TMDB recommendations, similar movies for highly-rated titles, genre discover,
 * optional collection & social seeds.
 */
export async function recommendedForYou(
  watchedMovieIds,
  favoriteGenreIds,
  excludeIds = new Set(),
  options = {}
) {
  const exclude = exclusionSet(excludeIds);
  const {
    highlyRatedMovieIds = [],
    collectionMovieIds = [],
    socialSignalMovieIds = [],
    tasteDNA = null,
    preferredLanguages = [],
    notInterested = [],
  } = options;

  const scoreMap = new Map();

  const addRecommendation = (movie, weight, reason) => {
    if (!movie || !movie.id || !passesExclude(exclude, movie.id) || !movie.poster_path) return;
    
    const prev = scoreMap.get(movie.id);
    const score = (prev?.score || 0) + weight;
    const reasons = prev?.reasons || [];
    if (reason && !reasons.includes(reason)) reasons.push(reason);
    
    scoreMap.set(movie.id, { movie, score, reasons });
  };

  // 1. TMDB Recommendations from recently watched (Weight: 1.0)
  const recentWatched = watchedMovieIds.slice(-5).reverse();
  const recResults = await Promise.all(recentWatched.map(id => fetchTMDBRecommendations(id)));
  recResults.forEach(recs => recs.forEach(m => addRecommendation(m, 1.0, "Based on recent watches")));

  // 2. Highly Rated Multiplier (Weight: 1.5)
  const lovedIds = highlyRatedMovieIds.slice(-4).reverse();
  const similarFromLoved = await Promise.all(lovedIds.map(id => fetchSimilarMovies(id)));
  similarFromLoved.forEach(recs => recs.forEach(m => addRecommendation(m, 1.5, "Similar to movies you loved")));

  // 3. Collection Influence (Weight: 1.2)
  const collectionSeeds = collectionMovieIds.slice(-3).reverse();
  const similarFromCollections = await Promise.all(collectionSeeds.map(id => fetchTMDBRecommendations(id)));
  similarFromCollections.forEach(recs => recs.forEach(m => addRecommendation(m, 1.2, "From your collections")));

  // 4. Social Signal (Weight: 1.1)
  const socialSeeds = socialSignalMovieIds.slice(-5);
  const socialRecs = await Promise.all(socialSeeds.map(id => fetchSimilarMovies(id)));
  socialRecs.forEach(recs => recs.forEach(m => addRecommendation(m, 1.1, "Trending in your circle")));

  // 5. Genre Discovery (Weight: 1.3)
  if (favoriteGenreIds.length > 0) {
    const genresToDiscover = favoriteGenreIds.slice(0, 3);
    const discoveryPromises = genresToDiscover.map(gid => discoverByGenre(gid));
    const discoveryResults = await Promise.all(discoveryPromises);
    discoveryResults.forEach(recs => recs.forEach(m => addRecommendation(mapTmdbResult(m), 1.3, "Matches your favorite genres")));
  }

  // 6. Hidden Gems Discovery (Weight: 1.4)
  const gems = await discoverHiddenGems(favoriteGenreIds.slice(0, 2));
  gems.forEach(m => addRecommendation(mapTmdbResult(m), 1.4, "Hidden Gem for you"));

  // 7. Language Preference Discovery (Weight: 1.6)
  if (preferredLanguages.length > 0) {
    const langPromises = preferredLanguages.slice(0, 2).map(lang => discoverByLanguage(lang));
    const langResults = await Promise.all(langPromises);
    langResults.forEach((recs, idx) => {
      const langName = preferredLanguages[idx] === "hi" ? "Hindi" : preferredLanguages[idx] === "en" ? "Hollywood" : preferredLanguages[idx];
      recs.forEach(m => addRecommendation(mapTmdbResult(m), 1.6, `Matches your ${langName} preference`));
    });
  }

  // Smart Recommendation System: Extract features of Not Interested movies
  const recentHidden = (notInterested || []).slice(-5);
  const hiddenGenres = new Set();
  const hiddenKeywords = new Set();
  const hiddenActors = new Set();
  const hiddenDirectors = new Set();

  if (recentHidden.length > 0) {
    try {
      const hiddenDetails = await Promise.all(
        recentHidden.map((item) => fetchMovieDetail(item.movieId))
      );

      hiddenDetails.forEach((detail) => {
        if (!detail) return;
        if (detail.genres) {
          detail.genres.forEach((g) => hiddenGenres.add(g.id));
        }
        const kw = detail.keywords?.keywords || detail.keywords?.results || [];
        kw.forEach((k) => hiddenKeywords.add(k.name.toLowerCase()));
        if (detail.credits?.cast) {
          detail.credits.cast.slice(0, 5).forEach((c) => hiddenActors.add(c.name.toLowerCase()));
        }
        if (detail.credits?.crew) {
          detail.credits.crew.forEach((c) => {
            if (c.job === "Director") hiddenDirectors.add(c.name.toLowerCase());
          });
        }
      });
    } catch (err) {
      console.error("Failed to load details for hidden/not-interested titles:", err);
    }
  }

  // Final Ranking Logic: Sort by Score
  let candidates = Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map(item => ({
      ...item.movie,
      _recommendationReason: item.reasons[0],
      _recommendationScore: item.score
    }));

  // Apply hidden penalties (Smart Recommendation System)
  if (recentHidden.length > 0 && candidates.length > 0) {
    const topCandidates = candidates.slice(0, 60);
    const detailedCandidates = await Promise.all(
      topCandidates.map(async (c) => {
        try {
          const detail = await fetchMovieDetail(c.id);
          if (!detail) return c;

          let penalty = 1.0;

          // 1. Genre penalty: -15% for each matching genre, cap at -60%
          let genreMatchCount = 0;
          if (detail.genres) {
            detail.genres.forEach((g) => {
              if (hiddenGenres.has(g.id)) genreMatchCount++;
            });
          }
          penalty -= Math.min(0.60, genreMatchCount * 0.15);

          // 2. Keyword penalty: -10% for each matching keyword, cap at -40%
          let keywordMatchCount = 0;
          const kw = detail.keywords?.keywords || detail.keywords?.results || [];
          kw.forEach((k) => {
            if (hiddenKeywords.has(k.name.toLowerCase())) keywordMatchCount++;
          });
          penalty -= Math.min(0.40, keywordMatchCount * 0.10);

          // 3. Actor/Director penalty: -30% for matching actor, -40% for matching director, cap at -70%
          let talentPenalty = 0;
          if (detail.credits?.cast) {
            const hasActorMatch = detail.credits.cast.slice(0, 5).some((act) => hiddenActors.has(act.name.toLowerCase()));
            if (hasActorMatch) talentPenalty += 0.30;
          }
          if (detail.credits?.crew) {
            const hasDirectorMatch = detail.credits.crew.some((cr) => cr.job === "Director" && hiddenDirectors.has(cr.name.toLowerCase()));
            if (hasDirectorMatch) talentPenalty += 0.40;
          }
          penalty -= Math.min(0.70, talentPenalty);

          // Clamp penalty to a minimum of 0.1
          penalty = Math.max(0.1, penalty);

          return {
            ...c,
            _recommendationScore: c._recommendationScore * penalty,
          };
        } catch {
          return c;
        }
      })
    );

    // Apply only genre penalties to the rest of the candidates to keep it fast
    const restCandidates = candidates.slice(60).map((c) => {
      let penalty = 1.0;
      let genreMatchCount = 0;
      if (c.genre_ids) {
        c.genre_ids.forEach((gid) => {
          if (hiddenGenres.has(gid)) genreMatchCount++;
        });
      }
      penalty -= Math.min(0.60, genreMatchCount * 0.15);
      penalty = Math.max(0.1, penalty);
      return {
        ...c,
        _recommendationScore: c._recommendationScore * penalty,
      };
    });

    candidates = [...detailedCandidates, ...restCandidates].sort(
      (a, b) => b._recommendationScore - a._recommendationScore
    );
  }

  // If no language preferences, just return top 40
  if (!preferredLanguages || preferredLanguages.length === 0) {
    return candidates.slice(0, 40);
  }

  // Language Balancing Logic
  // Goal: 1st choice ~60%, 2nd choice ~30%, others ~10%
  const targetTotal = 40;
  const finalResults = [];
  const usedIds = new Set();

  const langBuckets = preferredLanguages.map((lang, idx) => {
    let target = 0;
    if (idx === 0) target = Math.floor(targetTotal * 0.6); // 60%
    else if (idx === 1) target = Math.floor(targetTotal * 0.3); // 30%
    else target = Math.floor(targetTotal * 0.1); // 10%
    return { lang, target, items: [] };
  });

  // Fill language buckets
  candidates.forEach(c => {
    const bucket = langBuckets.find(b => b.lang === c.original_language);
    if (bucket && bucket.items.length < bucket.target) {
      bucket.items.push(c);
      usedIds.add(c.id);
    }
  });

  // Combine bucket items
  langBuckets.forEach(b => finalResults.push(...b.items));

  // Fill remaining slots with highest scoring remaining candidates
  const remaining = candidates.filter(c => !usedIds.has(c.id));
  while (finalResults.length < targetTotal && remaining.length > 0) {
    finalResults.push(remaining.shift());
  }

  // Sort final results by score again to keep it looking natural
  return finalResults.sort((a, b) => b._recommendationScore - a._recommendationScore);
}
