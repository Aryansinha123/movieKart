"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Trophy, Clock, MapPin, Zap } from "lucide-react";

function formatCountdown(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function TeamLogo({ team, size = "md" }) {
  const dim = size === "lg" ? "w-14 h-14 text-lg" : "w-11 h-11 text-sm";
  return (
    <div
      className={`${dim} rounded-2xl flex items-center justify-center font-bold text-white shadow-lg border border-white/10`}
      style={{ background: `linear-gradient(135deg, ${team.color}cc, ${team.color}88)` }}
    >
      {team.abbr}
    </div>
  );
}

function LiveBadge({ accent }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{
        background: `${accent}22`,
        color: accent,
        border: `1px solid ${accent}55`,
      }}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: accent }}
        />
        <span
          className="relative inline-flex rounded-full h-1.5 w-1.5"
          style={{ backgroundColor: accent }}
        />
      </span>
      Live
    </span>
  );
}

function MatchCard({ match, index }) {
  const [countdown, setCountdown] = useState(match.countdownSeconds);

  useEffect(() => {
    if (match.status !== "upcoming") return;
    setCountdown(match.countdownSeconds);
    const timer = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [match.status, match.countdownSeconds]);

  const kickoffTime = new Date(match.kickoff).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-zinc-900/80 to-zinc-950/90 backdrop-blur-xl transition-all duration-500 hover:border-white/15 hover:shadow-2xl hover:-translate-y-1"
      style={{
        boxShadow: match.status === "live" ? `0 0 40px ${match.accent}18` : undefined,
      }}
    >
      {/* Accent top bar */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${match.accent}, ${match.accentSecondary})`,
        }}
      />

      <div className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
              {match.league}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">{match.sport}</p>
          </div>
          {match.status === "live" && <LiveBadge accent={match.accent} />}
          {match.status === "upcoming" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/25">
              <Clock size={10} />
              Upcoming
            </span>
          )}
          {match.status === "finished" && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-zinc-800 text-zinc-500">
              FT
            </span>
          )}
        </div>

        {/* Teams & scores */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <TeamLogo team={match.homeTeam} size="lg" />
            <p className="text-xs md:text-sm font-medium text-zinc-300 text-center truncate w-full">
              {match.homeTeam.name}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            {match.status === "live" || match.status === "finished" ? (
              <div className="flex items-center gap-3">
                <span
                  className="text-3xl md:text-4xl font-black tabular-nums"
                  style={{ color: match.accentSecondary }}
                >
                  {match.scores.home}
                </span>
                <span className="text-zinc-600 text-xl font-light">:</span>
                <span
                  className="text-3xl md:text-4xl font-black tabular-nums"
                  style={{ color: match.accentSecondary }}
                >
                  {match.scores.away}
                </span>
              </div>
            ) : (
              <div
                className="text-2xl font-black tracking-wider"
                style={{ color: match.accent }}
              >
                VS
              </div>
            )}
            {match.status === "live" && match.elapsedMinutes != null && (
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                {match.elapsedMinutes}&apos; elapsed
              </span>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <TeamLogo team={match.awayTeam} size="lg" />
            <p className="text-xs md:text-sm font-medium text-zinc-300 text-center truncate w-full">
              {match.awayTeam.name}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
            <MapPin size={12} />
            <span className="truncate max-w-[120px]">{match.venue}</span>
          </div>

          {match.status === "upcoming" ? (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tabular-nums"
              style={{
                background: `${match.accent}15`,
                color: match.accentSecondary,
                border: `1px solid ${match.accent}33`,
              }}
            >
              <Clock size={12} />
              {countdown > 0 ? formatCountdown(countdown) : kickoffTime}
            </div>
          ) : match.status === "live" ? (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${match.accent}, ${match.accentSecondary})`,
              }}
            >
              <Zap size={12} />
              Watch Live
            </button>
          ) : (
            <span className="text-xs text-zinc-600">{kickoffTime}</span>
          )}
        </div>
      </div>

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${match.accent}12, transparent 60%)`,
        }}
      />
    </motion.article>
  );
}

export default function LiveSportsSection() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch("/api/sports/live");
      const data = await res.json();
      if (data?.matches) setMatches(data.matches);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const liveCount = matches.filter((m) => m.status === "live").length;

  return (
    <section id="live-sports" className="relative py-16 md:py-20 overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-[1600px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold uppercase tracking-widest">
              <Trophy size={12} />
              Live Sports
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Real-Time Action
            </h2>
            <p className="text-zinc-500 mt-2 text-sm md:text-base max-w-xl">
              Live scores, upcoming fixtures, and premium sports coverage — all in one place.
            </p>
          </div>

          {liveCount > 0 && (
            <div className="glass-panel inline-flex items-center gap-2 px-4 py-2.5 rounded-xl self-start md:self-auto">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-sm font-medium text-zinc-300">
                {liveCount} {liveCount === 1 ? "match" : "matches"} live now
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl hero-shimmer border border-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {matches.map((match, i) => (
              <MatchCard key={match.id} match={match} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
