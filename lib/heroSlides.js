import { getGenreLabels } from "@/lib/genres";
import { attachTrailersToSlides } from "@/lib/trailers";

const TMDB_BASE = "https://api.themoviedb.org/3";
export const HERO_SLIDE_COUNT = 10;
export const PREFERRED_LANG_SLOTS = Math.round(HERO_SLIDE_COUNT * 0.3); // 3 of 10

const LANG_LABELS = {
  hi: "Hindi",
  en: "English",
  te: "Telugu",
  ta: "Tamil",
  ml: "Malayalam",
  kn: "Kannada",
  ko: "Korean",
  ja: "Japanese",
};

const BADGE_META = {
  preferred: { badge: "In Your Language", accent: "#a855f7", accentSecondary: "#c084fc" },
  theater: { badge: "Now Playing in Theaters", accent: "#ef4444", accentSecondary: "#f97316" },
  trending: { badge: "Trending Now", accent: "#3b82f6", accentSecondary: "#6366f1" },
  popular: { badge: "Popular", accent: "#06b6d4", accentSecondary: "#22d3ee" },
  latest: { badge: "New Release", accent: "#10b981", accentSecondary: "#34d399" },
};

export const THEATER_SLOTS = 2;

function tmdbHeaders() {
  return {
    Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
    accept: "application/json",
  };
}

async function tmdbFetch(path) {
  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: tmdbHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).filter((item) => item.media_type !== "person");
}

function hasVisual(item) {
  return Boolean(item?.backdrop_path || item?.poster_path);
}

function mapSlide(item, source, langCode) {
  if (!item || !hasVisual(item)) return null;

  const meta = BADGE_META[source] || BADGE_META.trending;
  const badge =
    source === "preferred" && langCode
      ? `${LANG_LABELS[langCode] || langCode.toUpperCase()} Picks`
      : meta.badge;

  return {
    id: item.id,
    type: "movie",
    title: item.title || item.name,
    overview: item.overview || "",
    genres: getGenreLabels(item.genre_ids),
    vote_average: item.vote_average,
    backdrop: item.backdrop_path
      ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
      : `https://image.tmdb.org/t/p/original${item.poster_path}`,
    badge,
    accent: meta.accent,
    accentSecondary: meta.accentSecondary,
    source,
  };
}

function pickUnique(pool, count, usedIds) {
  const picked = [];
  for (const item of pool) {
    if (picked.length >= count) break;
    if (!item?.id || usedIds.has(item.id) || !hasVisual(item)) continue;
    usedIds.add(item.id);
    picked.push(item);
  }
  return picked;
}

function interleaveSlideGroups(groups) {
  const result = [];
  const queues = groups.map((g) => [...g]);
  let added = true;

  while (result.length < HERO_SLIDE_COUNT && added) {
    added = false;
    for (const queue of queues) {
      if (result.length >= HERO_SLIDE_COUNT) break;
      if (queue.length > 0) {
        result.push(queue.shift());
        added = true;
      }
    }
  }

  return result;
}

async function fetchLatestMovies() {
  const today = new Date();
  const threeWeeksAgo = new Date(today.getTime() - 21 * 24 * 60 * 60 * 1000);
  const minDate = threeWeeksAgo.toISOString().split("T")[0];
  const maxDate = today.toISOString().split("T")[0];

  return tmdbFetch(
    `/discover/movie?language=en-US&sort_by=popularity.desc&primary_release_date.gte=${minDate}&primary_release_date.lte=${maxDate}&with_release_type=2|3&vote_count.gte=10`
  );
}

async function fetchNowPlayingMovies() {
  const [inTheaters, usTheaters] = await Promise.all([
    tmdbFetch("/movie/now_playing?region=IN&language=en-US"),
    tmdbFetch("/movie/now_playing?region=US&language=en-US"),
  ]);

  const merged = [];
  const seen = new Set();
  for (const item of [...inTheaters, ...usTheaters]) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

async function fetchPreferredLanguageMovies(preferredLanguages) {
  if (!preferredLanguages?.length) return [];

  const perLang = Math.ceil(PREFERRED_LANG_SLOTS / preferredLanguages.length) + 2;
  const batches = await Promise.all(
    preferredLanguages.map((lang) =>
      tmdbFetch(
        `/discover/movie?with_original_language=${lang}&sort_by=popularity.desc&vote_count.gte=50&with_release_type=2|3`
      ).then((results) => ({ lang, results: results.slice(0, perLang) }))
    )
  );

  const merged = [];
  const langQueues = batches.map(({ lang, results }) =>
    results.map((item) => ({ item, lang }))
  );

  let round = 0;
  while (merged.length < PREFERRED_LANG_SLOTS + 4) {
    let added = false;
    for (const queue of langQueues) {
      if (queue[round]) {
        merged.push(queue[round]);
        added = true;
      }
    }
    round += 1;
    if (!added) break;
  }

  return merged;
}

export async function buildHeroSlides(preferredLanguages = []) {
  if (!process.env.TMDB_API_KEY) return [];

  const [trending, popular, latest, nowPlaying, preferredRaw] = await Promise.all([
    tmdbFetch("/trending/movie/week"),
    tmdbFetch("/movie/popular"),
    fetchLatestMovies(),
    fetchNowPlayingMovies(),
    fetchPreferredLanguageMovies(preferredLanguages),
  ]);

  const usedIds = new Set();
  const hasPreferences = preferredLanguages.length > 0;

  const langSlots = hasPreferences ? PREFERRED_LANG_SLOTS : 0;
  const theaterSlots = THEATER_SLOTS;
  const generalSlots = HERO_SLIDE_COUNT - langSlots - theaterSlots;

  const trendCount = hasPreferences ? 2 : 3;
  const popularCount = hasPreferences ? 2 : 3;
  const latestCount = Math.max(0, generalSlots - trendCount - popularCount);

  const preferredItems = [];
  for (const { item, lang } of preferredRaw) {
    if (preferredItems.length >= langSlots) break;
    if (!item?.id || usedIds.has(item.id) || !hasVisual(item)) continue;
    usedIds.add(item.id);
    const slide = mapSlide(item, "preferred", lang);
    if (slide) preferredItems.push(slide);
  }

  const theaterItems = pickUnique(nowPlaying, theaterSlots, usedIds)
    .map((item) => mapSlide(item, "theater"))
    .filter(Boolean);

  const trendingItems = pickUnique(trending, trendCount, usedIds)
    .map((item) => mapSlide(item, "trending"))
    .filter(Boolean);

  const popularItems = pickUnique(popular, popularCount, usedIds)
    .map((item) => mapSlide(item, "popular"))
    .filter(Boolean);

  const latestItems = pickUnique(latest, latestCount, usedIds)
    .map((item) => mapSlide(item, "latest"))
    .filter(Boolean);

  const slides = interleaveSlideGroups([
    theaterItems,
    preferredItems,
    trendingItems,
    popularItems,
    latestItems,
  ]);

  if (slides.length < HERO_SLIDE_COUNT) {
    const backfillPool = [
      ...nowPlaying,
      ...trending,
      ...popular,
      ...latest,
      ...preferredRaw.map(({ item }) => item),
    ];
    for (const item of backfillPool) {
      if (slides.length >= HERO_SLIDE_COUNT) break;
      if (usedIds.has(item.id) || !hasVisual(item)) continue;
      usedIds.add(item.id);
      const source = nowPlaying.some((m) => m.id === item.id) ? "theater" : "trending";
      slides.push(mapSlide(item, source));
    }
  }

  return attachTrailersToSlides(slides.slice(0, HERO_SLIDE_COUNT));
}
