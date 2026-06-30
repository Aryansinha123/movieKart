import axios from "axios";

const BASE_URL = "https://api.themoviedb.org/3";
const TMDB_KEY = process.env.TMDB_API_KEY;

function isV4Token(value) {
  return typeof value === "string" && value.includes(".") && value.length > 50;
}

async function fetchWithRetry(path, { retries = 5 } = {}) {
  let lastError;

  if (!TMDB_KEY) {
    throw new Error("TMDB_API_KEY is missing");
  }

  const isV4 = isV4Token(TMDB_KEY);
  const url = isV4 
    ? `${BASE_URL}${path}` 
    : `${BASE_URL}${path}${path.includes("?") ? "&" : "?"}api_key=${TMDB_KEY}`;

  const headers = isV4 
    ? { Authorization: `Bearer ${TMDB_KEY}`, accept: "application/json" } 
    : { accept: "application/json" };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const logUrl = url.replace(/api_key=[^&]+/, "api_key=***").replace(/Bearer [^"]+/, "Bearer ***");
      console.log(`[TMDB-AXIOS] Attempt ${attempt + 1}: ${logUrl}`);

      const response = await axios.get(url, {
        headers,
        timeout: 15000, // Higher timeout
      });

      return response;
    } catch (err) {
      lastError = err;
      const errCode = err.code || (err.response ? `HTTP ${err.response.status}` : "UNKNOWN");
      console.warn(`[TMDB-AXIOS] Attempt ${attempt + 1} failed: ${err.message} (${errCode})`);

      // 429 is Too Many Requests
      if (err.response?.status === 429) {
        const retryAfter = parseInt(err.response.headers["retry-after"]) || 1;
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }

      const isRetryable = 
        errCode === "ECONNRESET" || 
        errCode === "ETIMEDOUT" ||
        errCode === "ERR_NETWORK" ||
        errCode === "EADDRINUSE" ||
        !err.response; // Network level errors usually don't have a response

      if (!isRetryable || attempt === retries) break;
      
      const backoffMs = 2000 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  throw lastError;
}

export async function tmdbRequest(path) {
  try {
    const res = await fetchWithRetry(path);
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      json: async () => res.data,
    };
  } catch (error) {
    console.error(`[TMDB] Fatal error after retries:`, error.message);
    return {
      ok: false,
      status: error.response?.status || 500,
      json: async () => ({ error: error.message }),
    };
  }
}

export async function fetchCredits(id) {
  try {
    const isTv = id < 0;
    const realId = Math.abs(id);
    const path = isTv ? `/tv/${realId}/credits` : `/movie/${realId}/credits`;
    const res = await tmdbRequest(path);
    if (!res.ok) return { cast: [] };
    return await res.json();
  } catch (error) {
    return { cast: [] };
  }
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
  const [multiRes, tvRes] = await Promise.all([
    tmdbRequest(`/search/multi?query=${encodeURIComponent(query)}`),
    tmdbRequest(`/search/tv?query=${encodeURIComponent(query)}`)
  ]);

  const multiData = await multiRes.json();
  const tvData = await tvRes.json();

  const results = [];
  const seenIds = new Set();

  if (multiData.results) {
    for (const item of multiData.results) {
      const mapped = mapTmdbResult(item);
      if (mapped) {
        results.push(mapped);
        seenIds.add(mapped.id);
      }
    }
  }

  if (tvData.results) {
    for (const item of tvData.results) {
      // For TV search results, force media_type as 'tv' so mapTmdbResult correctly processes them
      const mapped = mapTmdbResult({ ...item, media_type: "tv" });
      if (mapped && !seenIds.has(mapped.id)) {
        results.push(mapped);
        seenIds.add(mapped.id);
      }
    }
  }

  return { results };
}

export async function searchPeople(query) {
  try {
    const res = await tmdbRequest(`/search/person?query=${encodeURIComponent(query)}`);
    if (!res.ok) return { results: [] };
    return await res.json();
  } catch (error) {
    return { results: [] };
  }
}

export async function fetchPersonCredits(id) {
  try {
    const res = await tmdbRequest(`/person/${id}/combined_credits`);
    if (!res.ok) return { cast: [], crew: [] };
    return await res.json();
  } catch (error) {
    return { cast: [], crew: [] };
  }
}

export async function fetchMovieDetails(id) {
  try {
    const isTv = id < 0;
    const realId = isTv ? -id : id;
    const path = isTv 
      ? `/tv/${realId}?append_to_response=keywords,credits` 
      : `/movie/${realId}?append_to_response=keywords,credits`;
    const res = await tmdbRequest(path);
    if (!res.ok) return null;
    const data = await res.json();
    return mapTmdbResult({ ...data, media_type: isTv ? "tv" : "movie" });
  } catch (error) {
    return null;
  }
}