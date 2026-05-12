const BASE_URL = "https://api.themoviedb.org/3";

const TMDB_KEY = process.env.TMDB_API_KEY;

function isV4Token(value) {
  // TMDB v4 tokens are JWT-like strings with dots and are typically long.
  return typeof value === "string" && value.includes(".") && value.length > 50;
}

function tmdbRequest(path) {
  if (!TMDB_KEY) {
    throw new Error("TMDB_API_KEY is missing");
  }

  if (isV4Token(TMDB_KEY)) {
    return fetch(`${BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${TMDB_KEY}`,
        accept: "application/json",
      },
      cache: "no-store",
    });
  }

  const joiner = path.includes("?") ? "&" : "?";
  return fetch(`${BASE_URL}${path}${joiner}api_key=${TMDB_KEY}`, { cache: "no-store" });
}

export function mapTmdbResult(item) {
  if (!item) return item;
  if (item.media_type === "person") return null;

  if (item.media_type === "tv" || (!item.title && item.name)) {
    return {
      ...item,
      id: item.id ? -Math.abs(item.id) : item.id,
      title: item.name || item.title,
      release_date: item.first_air_date || item.release_date,
      media_type: "tv",
    };
  }

  return { ...item, media_type: "movie" };
}

export async function fetchTrendingMovies() {
  const res = await tmdbRequest("/trending/all/week");
  const data = await res.json();
  if (data.results) data.results = data.results.map(mapTmdbResult).filter(Boolean);
  return data;
}

export async function searchMovies(query) {
  const res = await tmdbRequest(`/search/multi?query=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (data.results) data.results = data.results.map(mapTmdbResult).filter(Boolean);
  return data;
}

export async function fetchMovieDetails(id) {
  try {
    const isTv = id < 0;
    const realId = isTv ? -id : id;
    const path = isTv ? `/tv/${realId}` : `/movie/${realId}`;
    const res = await tmdbRequest(path);
    if (!res.ok) return null;
    const data = await res.json();
    return mapTmdbResult({ ...data, media_type: isTv ? "tv" : "movie" });
  } catch (error) {
    return null;
  }
}