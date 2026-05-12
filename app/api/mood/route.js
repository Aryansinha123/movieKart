import { NextResponse } from "next/server";
import { searchMovies, mapTmdbResult } from "@/lib/tmdb";
import {
  analyzePromptForMoods,
  getDiscoverParamsForMoods,
  parseAdvancedMoodPrompt,
  MOODS,
} from "@/lib/mood";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_KEY = process.env.TMDB_API_KEY;

function isV4Token(value) {
  return typeof value === "string" && value.includes(".") && value.length > 50;
}

async function tmdbFetch(path) {
  if (!TMDB_KEY) throw new Error("TMDB_API_KEY is missing");
  if (isV4Token(TMDB_KEY)) {
    return fetch(`${TMDB_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${TMDB_KEY}`,
        accept: "application/json",
      },
      cache: "no-store",
    });
  }
  const joiner = path.includes("?") ? "&" : "?";
  return fetch(`${TMDB_BASE}${path}${joiner}api_key=${TMDB_KEY}`, { cache: "no-store" });
}

function normalizeId(item) {
  return `${item.media_type || "movie"}:${item.id}`;
}

function scoreMoodCandidate(item, plan, matchedMoods) {
  let score = 0;
  const title = (item.title || "").toLowerCase();
  const overview = (item.overview || "").toLowerCase();

  score += (item.vote_average || 0) * 0.8;
  score += Math.min((item.popularity || 0) / 80, 2.2);
  score += Math.min((item.vote_count || 0) / 2000, 1.2);
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

  const releaseYear = Number((item.release_date || "").slice(0, 4));
  if (Number.isFinite(releaseYear)) {
    if (plan.yearRange && releaseYear >= plan.yearRange.from && releaseYear <= plan.yearRange.to) score += 1.4;
    if (plan.minYear && releaseYear >= plan.minYear) score += 0.8;
    if (plan.maxYear && releaseYear <= plan.maxYear) score += 0.8;
  }

  return score;
}

async function discoverByMoodPlan(plan, moodName, page = 1) {
  const params = getDiscoverParamsForMoods([moodName]);
  const filters = [
    `with_genres=${encodeURIComponent(params.with_genres)}`,
    "include_adult=false",
    "sort_by=vote_average.desc",
    `vote_count.gte=${params.vote_count_gte || 120}`,
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
    tmdbFetch(moviePath),
    plan.includeTV ? tmdbFetch(tvPath) : Promise.resolve(null),
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
    const { prompt, mood } = await req.json();

    if (prompt) {
      const plan = parseAdvancedMoodPrompt(prompt);
      const matchedMoods = plan.matchedMoods.length ? plan.matchedMoods : analyzePromptForMoods(prompt);
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
          const recRes = await tmdbFetch(path);
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

      const ranked = deduped
        .map((item) => ({ ...item, _moodScore: scoreMoodCandidate(item, plan, matchedMoods) }))
        .sort((a, b) => b._moodScore - a._moodScore)
        .slice(0, 30)
        .map(({ _moodScore, ...rest }) => rest);

      return NextResponse.json({
        success: true,
        matchedMoods,
        movies: ranked,
        message: `Found advanced mood matches for: ${matchedMoods.join(", ")}.`,
        debug: {
          primaryMood,
          secondaryMood,
          language: plan.language,
          hasAnchor: !!plan.anchorTitle,
        },
      });
    } else if (mood) {
      const plan = parseAdvancedMoodPrompt(mood);
      const discoverResults = [
        ...(await discoverByMoodPlan({ ...plan, includeTV: true, preferMovies: true }, mood, 1)),
        ...(await discoverByMoodPlan({ ...plan, includeTV: true, preferMovies: true }, mood, 2)),
      ];
      const ranked = discoverResults
        .map((item) => ({ ...item, _moodScore: scoreMoodCandidate(item, plan, [mood]) }))
        .sort((a, b) => b._moodScore - a._moodScore)
        .slice(0, 30)
        .map(({ _moodScore, ...rest }) => rest);

      return NextResponse.json({
        success: true,
        mood,
        movies: ranked,
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
