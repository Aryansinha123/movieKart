import { NextResponse } from "next/server";
import { searchMovies, mapTmdbResult, tmdbRequest } from "@/lib/tmdb";
import {
  analyzePromptForMoods,
  getDiscoverParamsForMoods,
  parseAdvancedMoodPrompt,
  MOODS,
} from "@/lib/mood";

function normalizeId(item) {
  return `${item.media_type || "movie"}:${item.id}`;
}

const LANGUAGE_PRESETS = {
  any: null,
  english: "en",
  hindi: "hi",
  korean: "ko",
  japanese: "ja",
  spanish: "es",
  french: "fr",
  tamil: "ta",
  telugu: "te",
};

function extractQueryKeywords(prompt) {
  const stop = new Set([
    "the","a","an","and","or","for","to","of","in","on","with","based","similar","like","movies","movie","films","film","show","series","want","need","about","from","your","my","me","is","are","it"
  ]);
  return String(prompt || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !stop.has(t))
    .slice(0, 10);
}

function keywordMatchScore(item, keywords) {
  if (!keywords?.length) return 0;
  const text = `${item.title || ""} ${(item.overview || "")}`.toLowerCase();
  let score = 0;
  let hits = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) {
      hits += 1;
      score += 1.2;
      if ((item.title || "").toLowerCase().includes(kw)) score += 0.8;
    }
  }
  return score + (hits >= 2 ? 1 : 0);
}

function scoreMoodCandidate(item, plan, matchedMoods, keywords = []) {
  let score = 0;
  const title = (item.title || "").toLowerCase();
  const overview = (item.overview || "").toLowerCase();

  // Balanced weighting so one signal (e.g., popularity / Hollywood bias) doesn't dominate.
  const qualityScore = (item.vote_average || 0) / 10; // 0..1
  const popularityScore = Math.min((item.popularity || 0) / 100, 1); // 0..1
  const confidenceScore = Math.min((item.vote_count || 0) / 1500, 1); // 0..1
  score += qualityScore * 1.2;
  score += popularityScore * 0.6;
  score += confidenceScore * 0.6;
  if (item.poster_path) score += 0.5;
  if (item.backdrop_path) score += 0.4;

  const moodKeywordHits = matchedMoods.reduce((acc, mood) => {
    const data = MOODS[mood];
    if (!data) return acc;
    let hits = 0;
    for (const kw of data.keywords || []) {
      if (overview.includes(kw.toLowerCase()) || title.includes(kw.toLowerCase())) hits++;
    }
    for (const alias of data.aliases || []) {
      if (overview.includes(alias.toLowerCase()) || title.includes(alias.toLowerCase())) hits += 1.5;
    }
    return acc + hits;
  }, 0);
  score += Math.min(moodKeywordHits, 6) * 0.45;

  if (plan.anchorTitle && title.includes(plan.anchorTitle.toLowerCase())) score += 2.5;

  if (plan.language && item.original_language === plan.language) score += 1.2;
  if (plan.preferMovies && item.media_type !== "tv") score += 0.35;
  if (plan.includeTV && item.media_type === "tv") score += 0.35;

  score += keywordMatchScore(item, keywords) * 1.15;

  const releaseYear = Number((item.release_date || "").slice(0, 4));
  if (Number.isFinite(releaseYear)) {
    if (plan.yearRange && releaseYear >= plan.yearRange.from && releaseYear <= plan.yearRange.to) score += 1.4;
    if (plan.minYear && releaseYear >= plan.minYear) score += 0.8;
    if (plan.maxYear && releaseYear <= plan.maxYear) score += 0.8;
  }

  return score;
}

function diversifyByLanguage(items, perLangCap = 6) {
  const bucket = new Map();
  for (const item of items) {
    const lang = item.original_language || "unknown";
    if (!bucket.has(lang)) bucket.set(lang, []);
    bucket.get(lang).push(item);
  }
  const languages = [...bucket.keys()].sort((a, b) => (bucket.get(b).length - bucket.get(a).length));
  const result = [];
  let added = true;
  for (let round = 0; round < perLangCap && added; round++) {
    added = false;
    for (const lang of languages) {
      const arr = bucket.get(lang);
      if (arr[round]) {
        result.push(arr[round]);
        added = true;
      }
    }
  }
  const used = new Set(result.map((x) => normalizeId(x)));
  for (const item of items) {
    const key = normalizeId(item);
    if (!used.has(key)) result.push(item);
  }
  return result;
}

async function discoverByMoodPlan(plan, moodName, page = 1) {
  const params = getDiscoverParamsForMoods([moodName]);
  const isNonEnglish = plan.language && plan.language !== "en";
  const minVotes = isNonEnglish ? 30 : (params.vote_count_gte || 120);

  const filters = [
    `with_genres=${encodeURIComponent(params.with_genres)}`,
    "include_adult=false",
    "sort_by=vote_average.desc",
    `vote_count.gte=${minVotes}`,
    `page=${page}`,
  ];
  if (plan.language) filters.push(`with_original_language=${plan.language}`);
  if (plan.yearRange) {
    filters.push(`primary_release_date.gte=${plan.yearRange.from}-01-01`);
    filters.push(`primary_release_date.lte=${plan.yearRange.to}-12-31`);
  } else {
    if (plan.minYear) filters.push(`primary_release_date.gte=${plan.minYear}-01-01`);
    if (plan.maxYear) filters.push(`primary_release_date.lte=${plan.maxYear}-12-31`);
  }

  const moviePath = `/discover/movie?${filters.join("&")}`;
  const tvPath = `/discover/tv?${filters.join("&")}`;

  const [movieRes, tvRes] = await Promise.all([
    tmdbRequest(moviePath),
    plan.includeTV ? tmdbRequest(tvPath) : Promise.resolve(null),
  ]);

  const movieData = movieRes.ok ? await movieRes.json() : { results: [] };
  const tvData = tvRes?.ok ? await tvRes.json() : { results: [] };

  return [
    ...(movieData.results || []).map((m) => mapTmdbResult({ ...m, media_type: "movie" })),
    ...(tvData.results || []).map((m) => mapTmdbResult({ ...m, media_type: "tv" })),
  ].filter(Boolean);
}

export async function POST(req) {
  try {
    const { prompt, mood, language = "any", origin = "any" } = await req.json();
    const explicitLanguage = LANGUAGE_PRESETS[String(language).toLowerCase()] || null;
    const explicitOrigin = LANGUAGE_PRESETS[String(origin).toLowerCase()] || null;
    const forcedLanguage = explicitLanguage || explicitOrigin;

    if (prompt) {
      const plan = parseAdvancedMoodPrompt(prompt);
      if (forcedLanguage) {
        plan.language = forcedLanguage;
      }
      const matchedMoods = plan.matchedMoods.length ? plan.matchedMoods : analyzePromptForMoods(prompt);
      const queryKeywords = extractQueryKeywords(prompt);
      const primaryMood = matchedMoods[0] || "Atmospheric";
      const secondaryMood = matchedMoods[1] || null;

      const [searchRes, discoverA1, discoverA2, discoverB1] = await Promise.all([
        searchMovies(prompt),
        discoverByMoodPlan(plan, primaryMood, 1),
        discoverByMoodPlan(plan, primaryMood, 2),
        secondaryMood ? discoverByMoodPlan(plan, secondaryMood, 1) : Promise.resolve([]),
      ]);

      let anchorRelated = [];
      if (plan.anchorTitle) {
        const anchorSearch = await searchMovies(plan.anchorTitle);
        const anchor = (anchorSearch.results || [])[0];
        if (anchor?.id) {
          const isTv = anchor.media_type === "tv" || anchor.id < 0;
          const realId = Math.abs(anchor.id);
          const path = isTv
            ? `/tv/${realId}/recommendations?page=1`
            : `/movie/${realId}/recommendations?page=1`;
          const recRes = await tmdbRequest(path);
          const recData = recRes.ok ? await recRes.json() : { results: [] };
          anchorRelated = (recData.results || []).map((m) =>
            mapTmdbResult({ ...m, media_type: isTv ? "tv" : "movie" })
          );
        }
      }

      const combined = [
        ...(searchRes.results || []),
        ...discoverA1,
        ...discoverA2,
        ...discoverB1,
        ...anchorRelated,
      ].filter(Boolean);

      const deduped = [];
      const seen = new Set();
      for (const item of combined) {
        const key = normalizeId(item);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(item);
      }

      const scored = deduped
        .map((item) => ({
          ...item,
          _keywordScore: keywordMatchScore(item, queryKeywords),
          _moodScore: scoreMoodCandidate(item, plan, matchedMoods, queryKeywords),
        }));

      // Keep relevance tied to user's keywords when they provided meaningful terms.
      const keywordFiltered =
        queryKeywords.length > 0
          ? scored.filter((x) => x._keywordScore > 0 || (x.title || "").toLowerCase().includes((plan.anchorTitle || "").toLowerCase()))
          : scored;

      const ranked = (keywordFiltered.length >= 10 ? keywordFiltered : scored)
        .sort((a, b) => b._moodScore - a._moodScore)
        .slice(0, 60)
        .map(({ _moodScore, _keywordScore, ...rest }) => rest);

      const finalMovies = forcedLanguage
        ? ranked.filter((x) => x.original_language === forcedLanguage).slice(0, 30)
        : diversifyByLanguage(ranked, 6).slice(0, 30);

      return NextResponse.json({
        success: true,
        matchedMoods,
        movies: finalMovies,
        message: `Found advanced mood matches for: ${matchedMoods.join(", ")}.`,
        debug: {
          primaryMood,
          secondaryMood,
          language: plan.language || "mixed",
          hasAnchor: !!plan.anchorTitle,
          keywordCount: queryKeywords.length,
          diversified: !forcedLanguage,
        },
      });
    } else if (mood) {
      const plan = parseAdvancedMoodPrompt(mood);
      if (forcedLanguage) {
        plan.language = forcedLanguage;
      }
      const discoverResults = [
        ...(await discoverByMoodPlan({ ...plan, includeTV: true, preferMovies: true }, mood, 1)),
        ...(await discoverByMoodPlan({ ...plan, includeTV: true, preferMovies: true }, mood, 2)),
      ];
      const ranked = discoverResults
        .map((item) => ({ ...item, _moodScore: scoreMoodCandidate(item, plan, [mood]) }))
        .sort((a, b) => b._moodScore - a._moodScore)
        .slice(0, 60)
        .map(({ _moodScore, ...rest }) => rest);
      const finalMovies = forcedLanguage
        ? ranked.filter((x) => x.original_language === forcedLanguage).slice(0, 30)
        : diversifyByLanguage(ranked, 6).slice(0, 30);

      return NextResponse.json({
        success: true,
        mood,
        movies: finalMovies,
        message: `Advanced ${mood} picks`,
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
