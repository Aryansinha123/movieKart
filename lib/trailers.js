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

export async function attachTrailersToSlides(slides) {
  const trailerKeys = await Promise.all(
    slides.map((slide) => fetchMovieTrailerKey(slide.id))
  );

  return slides.map((slide, index) => ({
    ...slide,
    trailerKey: trailerKeys[index] || null,
  }));
}

export function getYoutubeEmbedUrl(videoKey, origin) {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
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
