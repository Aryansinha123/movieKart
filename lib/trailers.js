const TMDB_BASE = "https://api.themoviedb.org/3";

function tmdbHeaders() {
  return {
    Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
    accept: "application/json",
  };
}

export function pickOfficialTrailer(videosData) {
  const videos = (videosData?.results || []).filter(
    (v) => String(v.site).toLowerCase() === "youtube"
  );
  if (videos.length === 0) return null;

  const officialTrailer = videos.find((v) => v.type === "Trailer" && v.official === true);
  if (officialTrailer) return officialTrailer.key;

  const namedOfficial = videos.find(
    (v) => v.type === "Trailer" && /official/i.test(v.name || "")
  );
  if (namedOfficial) return namedOfficial.key;

  const trailer = videos.find((v) => v.type === "Trailer");
  if (trailer) return trailer.key;

  const teaser = videos.find((v) => v.type === "Teaser");
  if (teaser) return teaser.key;

  return videos[0]?.key || null;
}

export async function fetchMovieTrailerKey(movieId) {
  if (!process.env.TMDB_API_KEY || !movieId) return null;

  try {
    const res = await fetch(`${TMDB_BASE}/movie/${Math.abs(movieId)}/videos`, {
      headers: tmdbHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return pickOfficialTrailer(data);
  } catch {
    return null;
  }
}

const TRAILER_BATCH_SIZE = 5;
const TRAILER_BATCH_DELAY_MS = 300;
const TRAILER_FETCH_TIMEOUT_MS = 6000;
const TRAILER_TOTAL_TIMEOUT_MS = 12000;

export async function attachTrailersToSlides(slides) {
  if (!slides?.length) return slides;

  // Process in batches to avoid TMDB rate limiting
  const keys = new Array(slides.length).fill(null);

  const batchJob = async () => {
    for (let i = 0; i < slides.length; i += TRAILER_BATCH_SIZE) {
      const batch = slides.slice(i, i + TRAILER_BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (slide, j) => {
          try {
            return { idx: i + j, key: await fetchMovieTrailerKey(slide.id) };
          } catch {
            return { idx: i + j, key: null };
          }
        })
      );
      for (const { idx, key } of results) {
        keys[idx] = key;
      }
      // Small delay between batches to avoid rate limits
      if (i + TRAILER_BATCH_SIZE < slides.length) {
        await new Promise((r) => setTimeout(r, TRAILER_BATCH_DELAY_MS));
      }
    }
  };

  try {
    // Hard cap: never block response for more than 12s total
    await Promise.race([
      batchJob(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Trailer enrichment timeout")), TRAILER_TOTAL_TIMEOUT_MS)
      ),
    ]);
  } catch {
    // Timeout or error — return slides with whatever keys we got so far
    console.warn("[trailers] attachTrailersToSlides partial result (timeout or error)");
  }

  return slides.map((slide, idx) => ({
    ...slide,
    trailerKey: keys[idx] || null,
  }));
}

export function getYoutubeEmbedUrl(videoKey, origin, isMuted = false) {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: isMuted ? "1" : "0",
    controls: "0",
    modestbranding: "1",
    rel: "0",
    playsinline: "1",
    loop: "1",
    playlist: videoKey,
    iv_load_policy: "3",
    enablejsapi: "1",
    disablekb: "1",
    fs: "0",
  });

  if (origin) {
    params.set("origin", origin);
  }

  return `https://www.youtube.com/embed/${videoKey}?${params.toString()}`;
}
