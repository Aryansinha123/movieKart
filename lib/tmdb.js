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

export async function fetchTrendingMovies() {
  const res = await tmdbRequest("/trending/movie/week");
  return res.json();
}

export async function searchMovies(query) {
  const res = await tmdbRequest(`/search/movie?query=${encodeURIComponent(query)}`);
  return res.json();
}

export async function fetchMovieDetails(id) {
  try {
    const res = await tmdbRequest(`/movie/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    return null;
  }
}