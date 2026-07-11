import { ImageResponse } from "next/og";
import { slugify, parseMovieSlug } from "@/utils/slugify";

export const alt = "MovieKart Discovery & Recommendation Platform";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Helper to fetch details by ID or slug
async function fetchMovieInfo(rawId) {
  if (!process.env.TMDB_API_KEY || !rawId) return null;
  
  const { id: numericId } = parseMovieSlug(rawId);
  if (numericId === null) return null;

  try {
    const isTv = numericId < 0;
    const realId = Math.abs(numericId);
    const path = isTv ? `/tv/${realId}` : `/movie/${realId}`;
    
    const res = await fetch(`https://api.themoviedb.org/3${path}`, {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}`, accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title || data.name,
      overview: data.overview,
      poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
      backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null,
      rating: data.vote_average ? data.vote_average.toFixed(1) : "0.0",
      year: (data.release_date || data.first_air_date || "").substring(0, 4) || "N/A",
      runtime: isTv ? (data.episode_run_time?.[0] ? `${data.episode_run_time[0]} mins` : "TV Show") : `${data.runtime || 0} mins`,
    };
  } catch {
    return null;
  }
}

export default async function Image({ params }) {
  const { id } = await params;
  const movie = await fetchMovieInfo(id);

  if (!movie) {
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000",
            color: "#fff",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ fontSize: 60, fontWeight: "bold", color: "#ef4444" }}>MovieKart</div>
          <div style={{ fontSize: 24, color: "#a1a1aa", marginTop: 20 }}>
            Watch trailers, discover movies & TV shows
          </div>
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#080808",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Background Backdrop Image with Overlay */}
        {movie.backdrop && (
          <img
            src={movie.backdrop}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.25,
            }}
          />
        )}
        {/* Dark Gradient Overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "linear-gradient(to right, #080808 60%, rgba(8, 8, 8, 0.4) 100%)",
          }}
        />

        {/* Content Section */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: "700px",
            height: "100%",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
            <span style={{ fontSize: "20px", fontWeight: "bold", color: "#ef4444", letterSpacing: "2px" }}>
              MOVIEKART
            </span>
          </div>

          <h1 style={{ fontSize: "56px", fontWeight: "bold", margin: "0 0 10px 0", color: "#ffffff", lineHeight: 1.1 }}>
            {movie.title}
          </h1>

          <div style={{ display: "flex", gap: "15px", fontSize: "18px", color: "#a1a1aa", margin: "10px 0 20px 0", alignItems: "center" }}>
            <span style={{ color: "#fbbf24", fontWeight: "bold" }}>★ {movie.rating}</span>
            <span>|</span>
            <span>{movie.year}</span>
            <span>|</span>
            <span>{movie.runtime}</span>
          </div>

          <p style={{ fontSize: "20px", color: "#d4d4d8", margin: 0, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {movie.overview}
          </p>
        </div>

        {/* Poster Section */}
        {movie.poster && (
          <div
            style={{
              display: "flex",
              width: "300px",
              height: "450px",
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              zIndex: 10,
            }}
          >
            <img
              src={movie.poster}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
