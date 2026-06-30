"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { getImagePath } from "@/utils/imagePath";
import { X, Calendar, Star, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { getPersonUrl } from "@/utils/slugify";

export default function SeasonsList({ seasons = [], seriesId }) {
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(null);
  const [seasonDetails, setSeasonDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const detailsRef = useRef(null);

  // Scroll to details section on selection
  useEffect(() => {
    if (selectedSeasonNumber !== null && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedSeasonNumber, loading]);

  const handleSeasonClick = async (seasonNumber) => {
    if (selectedSeasonNumber === seasonNumber) {
      // Toggle off
      setSelectedSeasonNumber(null);
      setSeasonDetails(null);
      return;
    }

    setSelectedSeasonNumber(seasonNumber);
    setLoading(true);
    setError(null);
    setSeasonDetails(null);

    try {
      const res = await fetch(`/api/movies/${seriesId}/season/${seasonNumber}`);
      const data = await res.json();
      if (data && data.success !== false) {
        setSeasonDetails(data);
      } else {
        setError("Failed to load season details.");
      }
    } catch (err) {
      setError("An error occurred while loading episodes.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeSeason = seasons.find((s) => s.season_number === selectedSeasonNumber);

  const getCombinedCast = () => {
    if (!seasonDetails) return [];
    const castList = [...(seasonDetails.credits?.cast || [])];
    const seen = new Set(castList.map((c) => c.id));

    if (seasonDetails.episodes) {
      for (const ep of seasonDetails.episodes) {
        if (ep.guest_stars) {
          for (const gs of ep.guest_stars) {
            if (!seen.has(gs.id)) {
              seen.add(gs.id);
              castList.push(gs);
            }
          }
        }
      }
    }
    return castList;
  };

  return (
    <div className="space-y-8">
      {/* Seasons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {seasons
          .filter((s) => s.season_number > 0)
          .map((season) => {
            const isSelected = selectedSeasonNumber === season.season_number;
            return (
              <button
                key={season.id}
                onClick={() => handleSeasonClick(season.season_number)}
                className={`flex gap-4 rounded-xl border p-4 text-left transition-all duration-300 group hover:scale-[1.02] cursor-pointer ${
                  isSelected
                    ? "border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/10"
                    : "border-zinc-850 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50"
                }`}
              >
                <div className="relative w-20 h-28 shrink-0 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950">
                  {season.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${season.poster_path}`}
                      alt={season.name}
                      fill
                      sizes="80px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-700 bg-zinc-900 text-[10px] font-bold">
                      No Poster
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-base text-white truncate group-hover:text-cyan-400 transition-colors">
                      {season.name}
                    </h3>
                    {isSelected ? (
                      <ChevronUp size={16} className="text-cyan-400 shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-zinc-500 shrink-0 group-hover:text-zinc-300" />
                    )}
                  </div>
                  <p className="text-xs text-amber-500 font-semibold mt-1">
                    {season.episode_count} Episodes
                  </p>
                  {season.air_date && (
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Aired: {new Date(season.air_date).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
                    </p>
                  )}
                  {season.overview && (
                    <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                      {season.overview}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
      </div>

      {/* Season Detail Panel / Expanded Section */}
      {selectedSeasonNumber !== null && (
        <div
          ref={detailsRef}
          className="rounded-2xl border border-zinc-850 bg-zinc-950/70 p-6 md:p-8 space-y-6 md:space-y-8 shadow-2xl relative scroll-mt-24"
        >
          {/* Header */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex gap-4 md:gap-6 items-center md:items-start flex-col md:flex-row">
              {activeSeason?.poster_path && (
                <div className="relative w-24 h-36 shrink-0 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-lg hidden md:block">
                  <Image
                    src={`https://image.tmdb.org/t/p/w185${activeSeason.poster_path}`}
                    alt={activeSeason.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-2xl font-bold text-white flex items-center justify-center md:justify-start gap-3">
                  {activeSeason?.name || `Season ${selectedSeasonNumber}`}
                </h3>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <span className="text-amber-500">{activeSeason?.episode_count} Episodes</span>
                  {activeSeason?.air_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Aired {new Date(activeSeason.air_date).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                    </span>
                  )}
                </div>
                {seasonDetails?.overview && (
                  <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed mt-2">
                    {seasonDetails.overview}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedSeasonNumber(null);
                setSeasonDetails(null);
              }}
              className="p-2 hover:bg-zinc-900 rounded-full border border-zinc-800 hover:border-zinc-700 transition-all text-zinc-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Error State */}
          {error && (
            <div className="text-center py-8 text-sm text-red-400 font-medium bg-red-950/10 border border-red-900/30 rounded-xl">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border border-zinc-900 bg-zinc-900/20 animate-pulse">
                  <div className="w-28 aspect-video shrink-0 bg-zinc-900 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-900 rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-zinc-900 rounded w-1/4 animate-pulse" />
                    <div className="h-3 bg-zinc-900 rounded w-5/6 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Season Cast */}
          {seasonDetails && getCombinedCast().length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-zinc-300 uppercase tracking-widest text-xs border-b border-zinc-900/60 pb-3">
                Season Cast & Contestants
              </h4>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {getCombinedCast().slice(0, 50).map((p) => (
                  <Link
                    key={p.credit_id || p.id}
                    href={getPersonUrl(p.id, p.name)}
                    className="w-28 shrink-0 rounded-xl border border-zinc-900 bg-zinc-900/20 overflow-hidden hover:border-cyan-500/50 transition-all group flex flex-col"
                  >
                    <div className="relative w-full aspect-[3/4] bg-zinc-900">
                      {p.profile_path ? (
                        <Image
                          src={getImagePath(p.profile_path)}
                          alt={p.name}
                          fill
                          sizes="112px"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-xs">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="p-2 flex-1 min-w-0 flex flex-col justify-center bg-zinc-950/40">
                      <p className="font-semibold text-xs text-white truncate group-hover:text-cyan-400 transition-colors">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                        {p.character}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Episodes List */}
          {seasonDetails && seasonDetails.episodes && (
            <div className="space-y-6">
              <h4 className="text-lg font-bold text-zinc-300 uppercase tracking-widest text-xs border-b border-zinc-900 pb-3">
                Episodes
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {seasonDetails.episodes.map((episode) => (
                  <div
                    key={episode.id}
                    className="flex gap-4 p-4 rounded-xl border border-zinc-900 bg-zinc-900/20 hover:border-zinc-805 hover:bg-zinc-900/40 transition-colors"
                  >
                    <div className="relative w-28 aspect-video shrink-0 rounded-lg overflow-hidden border border-zinc-850 bg-zinc-950">
                      {episode.still_path ? (
                        <Image
                          src={getImagePath(episode.still_path)}
                          alt={episode.name}
                          fill
                          sizes="112px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-700 bg-zinc-900 text-[10px] font-bold">
                          No Image
                        </div>
                      )}
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur border border-zinc-800 text-[10px] font-bold text-zinc-300">
                        EP {episode.episode_number}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-semibold text-sm text-white truncate">
                          {episode.name}
                        </h5>
                        {episode.vote_average > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-500 text-xs font-bold shrink-0">
                            <Star size={10} fill="currentColor" /> {episode.vote_average.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {episode.air_date && (
                        <p className="text-[10px] text-zinc-500">
                          Aired: {new Date(episode.air_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                      {episode.overview ? (
                        <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                          {episode.overview}
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-600 italic">
                          No description available.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
