const SPORTS_MATCHES = [
  {
    id: "sport-1",
    league: "UEFA Champions League",
    sport: "Football",
    accent: "#6366f1",
    accentSecondary: "#818cf8",
    homeTeam: { name: "Real Madrid", abbr: "RMA", color: "#ffffff" },
    awayTeam: { name: "Manchester City", abbr: "MCI", color: "#6cabdd" },
    venue: "Santiago Bernabéu",
    durationMinutes: 105,
    offsetMinutes: -38,
    baseHomeScore: 1,
    baseAwayScore: 1,
    heroBackdrop:
      "https://images.unsplash.com/photo-1574629810360-7abca0662a27?auto=format&fit=crop&w=2400&q=80",
  },
  {
    id: "sport-2",
    league: "NBA",
    sport: "Basketball",
    accent: "#f97316",
    accentSecondary: "#fb923c",
    homeTeam: { name: "Los Angeles Lakers", abbr: "LAL", color: "#552583" },
    awayTeam: { name: "Boston Celtics", abbr: "BOS", color: "#007a33" },
    venue: "Crypto.com Arena",
    durationMinutes: 150,
    offsetMinutes: -72,
    baseHomeScore: 98,
    baseAwayScore: 102,
    heroBackdrop:
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=2400&q=80",
  },
  {
    id: "sport-3",
    league: "Premier League",
    sport: "Football",
    accent: "#22c55e",
    accentSecondary: "#4ade80",
    homeTeam: { name: "Arsenal", abbr: "ARS", color: "#ef0107" },
    awayTeam: { name: "Liverpool", abbr: "LIV", color: "#c8102e" },
    venue: "Emirates Stadium",
    durationMinutes: 105,
    offsetMinutes: 145,
    baseHomeScore: 0,
    baseAwayScore: 0,
    heroBackdrop:
      "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=2400&q=80",
  },
  {
    id: "sport-4",
    league: "Formula 1",
    sport: "Motorsport",
    accent: "#ef4444",
    accentSecondary: "#f87171",
    homeTeam: { name: "Monaco GP", abbr: "MON", color: "#dc2626" },
    awayTeam: { name: "Race Day", abbr: "F1", color: "#ffffff" },
    venue: "Circuit de Monaco",
    durationMinutes: 120,
    offsetMinutes: 320,
    baseHomeScore: 0,
    baseAwayScore: 0,
    heroBackdrop:
      "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=2400&q=80",
  },
  {
    id: "sport-5",
    league: "IPL",
    sport: "Cricket",
    accent: "#a855f7",
    accentSecondary: "#c084fc",
    homeTeam: { name: "Mumbai Indians", abbr: "MI", color: "#004ba0" },
    awayTeam: { name: "Chennai Super Kings", abbr: "CSK", color: "#ffdd00" },
    venue: "Wankhede Stadium",
    durationMinutes: 210,
    offsetMinutes: 480,
    baseHomeScore: 0,
    baseAwayScore: 0,
    heroBackdrop:
      "https://images.unsplash.com/photo-1531415071318-deee9da13575?auto=format&fit=crop&w=2400&q=80",
  },
  {
    id: "sport-6",
    league: "UFC",
    sport: "MMA",
    accent: "#06b6d4",
    accentSecondary: "#22d3ee",
    homeTeam: { name: "Alex Pereira", abbr: "AP", color: "#0891b2" },
    awayTeam: { name: "Israel Adesanya", abbr: "IA", color: "#64748b" },
    venue: "T-Mobile Arena",
    durationMinutes: 60,
    offsetMinutes: 720,
    baseHomeScore: 0,
    baseAwayScore: 0,
    heroBackdrop:
      "https://images.unsplash.com/photo-1549719386-74df5e2065f1?auto=format&fit=crop&w=2400&q=80",
  },
];

function getKickoffTime(offsetMinutes) {
  const now = new Date();
  return new Date(now.getTime() + offsetMinutes * 60 * 1000);
}

function simulateLiveScore(match, elapsedMinutes) {
  if (match.sport === "Basketball") {
    const pace = Math.floor(elapsedMinutes / 3);
    return {
      home: match.baseHomeScore + pace + (match.id.charCodeAt(6) % 4),
      away: match.baseAwayScore + pace + 1,
    };
  }

  if (match.sport === "Football" || match.sport === "Cricket") {
    const pace = Math.floor(elapsedMinutes / 25);
    return {
      home: match.baseHomeScore + (pace > 0 ? pace : 0),
      away: match.baseAwayScore + (pace > 1 ? pace - 1 : 0),
    };
  }

  return { home: match.baseHomeScore, away: match.baseAwayScore };
}

function enrichMatch(match) {
  const kickoff = getKickoffTime(match.offsetMinutes);
  const now = Date.now();
  const kickoffMs = kickoff.getTime();
  const endMs = kickoffMs + match.durationMinutes * 60 * 1000;

  let status = "upcoming";
  if (now >= kickoffMs && now <= endMs) status = "live";
  if (now > endMs) status = "finished";

  const elapsedMinutes = Math.max(0, Math.floor((now - kickoffMs) / 60000));
  const scores =
    status === "live" || status === "finished"
      ? simulateLiveScore(match, elapsedMinutes)
      : { home: null, away: null };

  return {
    ...match,
    kickoff: kickoff.toISOString(),
    status,
    scores,
    countdownSeconds: status === "upcoming" ? Math.max(0, Math.floor((kickoffMs - now) / 1000)) : 0,
    elapsedMinutes: status === "live" ? elapsedMinutes : null,
  };
}

export function getLiveSportsData() {
  return SPORTS_MATCHES.map(enrichMatch).sort((a, b) => {
    const order = { live: 0, upcoming: 1, finished: 2 };
    return order[a.status] - order[b.status] || new Date(a.kickoff) - new Date(b.kickoff);
  });
}

export function getSportsHeroSlides(limit = 2) {
  return getLiveSportsData()
    .filter((m) => m.status === "live" || m.status === "upcoming")
    .slice(0, limit)
    .map((match) => ({
      id: match.id,
      type: "sport",
      title:
        match.status === "live"
          ? `${match.homeTeam.name} vs ${match.awayTeam.name}`
          : `${match.league} — ${match.homeTeam.abbr} vs ${match.awayTeam.abbr}`,
      overview:
        match.status === "live"
          ? `Live now at ${match.venue}. ${match.league} action with premium coverage and real-time stats.`
          : `Upcoming ${match.sport} showdown at ${match.venue}. Set your reminder and catch every moment live.`,
      genres: [match.sport, match.league.split(" ").slice(0, 2).join(" ")],
      vote_average: null,
      backdrop: match.heroBackdrop,
      accent: match.accent,
      accentSecondary: match.accentSecondary,
      badge: match.status === "live" ? "Live Now" : "Upcoming",
      match,
    }));
}
