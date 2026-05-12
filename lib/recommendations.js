/**
 * Recommendation Engine
 * Analyzes user behavior and movie metadata to generate personalized recommendations.
 */

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
export async function fetchSimilarMovies(movieId) {
  try {
    const res = await fetch(`${TMDB_BASE}/movie/${movieId}/similar?page=1`, {
      headers: tmdbHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

/**
 * Fetch movie recommendations from TMDB (different algorithm from similar)
 */
export async function fetchTMDBRecommendations(movieId) {
  try {
    const res = await fetch(`${TMDB_BASE}/movie/${movieId}/recommendations?page=1`, {
      headers: tmdbHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

/**
 * Fetch movie details from TMDB
 */
export async function fetchMovieDetail(movieId) {
  try {
    const res = await fetch(`${TMDB_BASE}/movie/${movieId}`, {
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
        movies: mcu.results?.slice(0, 10) || [] 
      },
      { 
        id: "dc", 
        title: "DC Universe", 
        subtitle: "Iconic heroes from the world of DC Comics", 
        gradient: "bg-gradient-to-br from-blue-500 to-indigo-700", 
        movies: dc.results?.slice(0, 10) || [] 
      },
      { 
        id: "sitcoms", 
        title: "American Comedies", 
        subtitle: "Laugh out loud with popular US comedies and sitcoms", 
        gradient: "bg-gradient-to-br from-yellow-400 to-orange-500", 
        movies: sitcoms.results?.slice(0, 10) || [] 
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
export function analyzeTasteProfile(movieDetails, reviews) {
  const genreCounts = {};
  const decadeCounts = {};
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRating = 0;
  let ratingCount = 0;
  const runtimeBuckets = { short: 0, medium: 0, long: 0, epic: 0 };

  // Process movie details for genre and era analysis
  for (const movie of movieDetails) {
    if (!movie) continue;

    // Genre analysis
    if (movie.genres) {
      for (const genre of movie.genres) {
        genreCounts[genre.id] = (genreCounts[genre.id] || 0) + 1;
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

  // Process reviews for rating patterns
  for (const review of reviews || []) {
    if (review.rating >= 1 && review.rating <= 5) {
      ratingDistribution[review.rating]++;
      totalRating += review.rating;
      ratingCount++;
    }
  }

  // Sort genres by count
  const favoriteGenres = Object.entries(genreCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({
      id: parseInt(id),
      name: GENRE_MAP[parseInt(id)] || "Unknown",
      count,
    }));

  // Sort decades by count
  const preferredEras = Object.entries(decadeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([decade, count]) => ({ decade: parseInt(decade), count }));

  // Determine preferred runtime
  const runtimeEntries = Object.entries(runtimeBuckets).sort(([, a], [, b]) => b - a);
  const preferredRuntime = runtimeEntries[0]?.[0] || "medium";

  const reviewBehavior = analyzeReviewBehavior(reviews);
  const cinemaStyles = inferCinemaStylesFromMovies(movieDetails);

  return {
    favoriteGenres,
    preferredEras,
    averageRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : null,
    ratingDistribution,
    totalMoviesWatched: movieDetails.length,
    totalReviews: reviews.length,
    preferredRuntime,
    runtimeBuckets,
    reviewBehavior,
    cinemaStyles,
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
  { id: "dark_thrilling", label: "Dark & thrilling", patterns: [/dark\b/i, /disturb/i, /tense/i, /suspense/i, /creepy/i, /gritty/i] },
  { id: "lighthearted", label: "Lighthearted fun", patterns: [/fun\b/i, /funny/i, /laugh/i, /feel-good/i, /charming/i, /cute/i] },
  { id: "emotional", label: "Emotional drama", patterns: [/cry/i, /tear/i, /heart/i, /moving/i, /touching/i, /sad\b/i] },
  { id: "thought_provoking", label: "Thought-provoking", patterns: [/thought/i, /deep\b/i, /philosoph/i, /meaning/i, /smart\b/i] },
  { id: "epic_spectacle", label: "Epic spectacle", patterns: [/epic/i, /spectacle/i, /scale/i, /visual/i, /stunning/i, /cinematograph/i] },
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
export async function fetchMovieCredits(movieId) {
  try {
    const res = await fetch(`${TMDB_BASE}/movie/${movieId}/credits`, {
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

/**
 * Calculate similarity score between two users
 * Uses watched overlap, rating vectors, genres, collections, and review sentiment.
 */
export function calculateUserSimilarity(userA, userB) {
  const watchedA = new Set((userA.watchedMovies || []).map(String));
  const watchedB = new Set((userB.watchedMovies || []).map(String));
  const watchedSim = jaccardSimilarity(watchedA, watchedB);

  const ratingsA = {};
  for (const r of userA.reviews || []) ratingsA[r.movieId] = r.rating;
  const ratingsB = {};
  for (const r of userB.reviews || []) ratingsB[r.movieId] = r.rating;
  const ratingsSim = cosineSimilarity(ratingsA, ratingsB);

  const genresA = new Set((userA.topGenres || []).map(String));
  const genresB = new Set((userB.topGenres || []).map(String));
  const genreSim = jaccardSimilarity(genresA, genresB);

  const collectA = new Set();
  for (const c of userA.collections || []) {
    for (const m of c.movies || []) collectA.add(String(m));
  }
  const collectB = new Set();
  for (const c of userB.collections || []) {
    for (const m of c.movies || []) collectB.add(String(m));
  }
  const collectSim = jaccardSimilarity(collectA, collectB);

  const reviewSim = sentimentSimilarityFromReviews(userA.reviews, userB.reviews);

  const totalScore =
    watchedSim * 0.26 +
    ratingsSim * 0.26 +
    genreSim * 0.16 +
    collectSim * 0.16 +
    reviewSim * 0.16;

  return {
    overall: parseFloat(totalScore.toFixed(3)),
    watched: parseFloat(watchedSim.toFixed(3)),
    ratings: parseFloat(ratingsSim.toFixed(3)),
    genres: parseFloat(genreSim.toFixed(3)),
    collections: parseFloat(collectSim.toFixed(3)),
    reviewSentiment: parseFloat(reviewSim.toFixed(3)),
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

    const filtered = similar
      .filter((m) => passesExclude(exclude, m.id) && m.poster_path)
      .slice(0, 8);

    if (filtered.length > 0) {
      results.push({
        sourceMovie: {
          id: movieDetail.id,
          title: movieDetail.title,
          poster_path: movieDetail.poster_path,
        },
        recommendations: filtered,
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
  const exclude = excludeIds instanceof Set ? exclusionSet(excludeIds) : exclusionSet(excludeIds);
  const {
    highlyRatedMovieIds = [],
    collectionMovieIds = [],
    socialSignalMovieIds = [],
  } = options;

  const allRecs = [];

  const recentWatched = watchedMovieIds.slice(-4).reverse();
  const recPromises = recentWatched.map((id) => fetchTMDBRecommendations(id));
  const recResults = await Promise.all(recPromises);

  for (const recs of recResults) {
    for (const movie of recs) {
      if (passesExclude(exclude, movie.id) && movie.poster_path) {
        allRecs.push({ movie, weight: 1 });
      }
    }
  }

  const lovedIds = highlyRatedMovieIds.slice(-4).reverse();
  const similarFromLoved = await Promise.all(lovedIds.map((id) => fetchSimilarMovies(id)));
  for (const recs of similarFromLoved) {
    for (const movie of recs) {
      if (passesExclude(exclude, movie.id) && movie.poster_path) {
        allRecs.push({ movie, weight: 1.15 });
      }
    }
  }

  const collectionSeeds = collectionMovieIds.slice(-3).reverse();
  const similarFromCollections = await Promise.all(
    collectionSeeds.map((id) => fetchTMDBRecommendations(id))
  );
  for (const recs of similarFromCollections) {
    for (const movie of recs) {
      if (passesExclude(exclude, movie.id) && movie.poster_path) {
        allRecs.push({ movie, weight: 1.05 });
      }
    }
  }

  const socialSeeds = socialSignalMovieIds.slice(-5);
  const socialRecs = await Promise.all(socialSeeds.map((id) => fetchSimilarMovies(id)));
  for (const recs of socialRecs) {
    for (const movie of recs) {
      if (passesExclude(exclude, movie.id) && movie.poster_path) {
        allRecs.push({ movie, weight: 0.95 });
      }
    }
  }

  if (favoriteGenreIds.length > 0) {
    const [g0, g1] = await Promise.all([
      discoverByGenre(favoriteGenreIds[0]),
      favoriteGenreIds[1] ? discoverByGenre(favoriteGenreIds[1]) : Promise.resolve([]),
    ]);
    for (const movie of g0) {
      if (passesExclude(exclude, movie.id) && movie.poster_path) {
        allRecs.push({ movie, weight: 1.08 });
      }
    }
    for (const movie of g1) {
      if (passesExclude(exclude, movie.id) && movie.poster_path) {
        allRecs.push({ movie, weight: 1.02 });
      }
    }
  }

  const scoreMap = new Map();
  for (const { movie, weight } of allRecs) {
    const base = movie.vote_average || 0;
    const prev = scoreMap.get(movie.id);
    const combined = (prev?.score || 0) + base * weight;
    const wsum = (prev?.wsum || 0) + weight;
    scoreMap.set(movie.id, { movie, score: combined, wsum });
  }

  return [...scoreMap.values()]
    .map(({ movie, score, wsum }) => ({
      ...movie,
      _rank: score / Math.max(wsum, 0.01),
    }))
    .sort((a, b) => b._rank - a._rank)
    .map(({ _rank, ...m }) => m)
    .slice(0, 24);
}
