// Mood categories + richer aliases for advanced NL detection.
export const MOODS = {
  Emotional: {
    genres: [18, 10749],
    keywords: ["tears", "heartbreak", "emotional", "moving", "melodrama", "bittersweet", "soulful"],
    aliases: ["sad", "cry", "heart-touching", "touching"],
    description: "Deeply moving and emotionally resonant.",
    imageUrl: "https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?auto=format&fit=crop&q=80&w=600",
  },
  Dark: {
    genres: [53, 27, 80],
    keywords: ["dark", "murder", "serial killer", "neo-noir", "gritty", "violent", "bleak"],
    aliases: ["grim", "edgy", "moody"],
    description: "Gritty, intense, and shadowy themes.",
    imageUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=600",
  },
  Comfort: {
    genres: [35, 10751, 16],
    keywords: ["feel good", "heartwarming", "friendship", "coming of age", "cozy", "warm"],
    aliases: ["comfort watch", "safe", "soft"],
    description: "Lighthearted, cozy, and uplifting.",
    imageUrl: "https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&q=80&w=600",
  },
  "Mind-Bending": {
    genres: [878, 9648, 53],
    keywords: ["mindfuck", "time travel", "existential", "surreal", "plot twist", "simulation"],
    aliases: ["brainy", "mind bending", "twisty", "trippy"],
    description: "Psychological, surreal, and reality-bending.",
    imageUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=600",
  },
  "Feel-Good": {
    genres: [35, 10402],
    keywords: ["uplifting", "happy", "inspirational", "triumph", "musical", "joyful"],
    aliases: ["positive", "cheerful"],
    description: "Positive, joyful, and inspiring.",
    imageUrl: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&q=80&w=600",
  },
  Inspirational: {
    genres: [18, 36],
    keywords: ["sports", "overcoming adversity", "true story", "heroic", "underdog"],
    aliases: ["motivational", "inspiring"],
    description: "Motivating and uplifting stories of triumph.",
    imageUrl: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&q=80&w=600",
  },
  Suspenseful: {
    genres: [53, 9648],
    keywords: ["tension", "cat and mouse", "whodunit", "hostage", "escape", "suspense"],
    aliases: ["tense", "edge of seat"],
    description: "Edge-of-your-seat tension and thrills.",
    imageUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=600",
  },
  Romantic: {
    genres: [10749],
    keywords: ["love", "romance", "marriage", "first love", "relationship"],
    aliases: ["romcom", "date night"],
    description: "Stories focused on love and relationships.",
    imageUrl: "https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?auto=format&fit=crop&q=80&w=600",
  },
  Psychological: {
    genres: [53, 18],
    keywords: ["psychological", "madness", "paranoia", "obsession", "trauma", "identity"],
    aliases: ["mind game", "unreliable narrator"],
    description: "Deep dives into the human mind and psyche.",
    imageUrl: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=600",
  },
  Atmospheric: {
    genres: [878, 14, 27],
    keywords: ["atmospheric", "slow burn", "visually stunning", "moody", "gothic"],
    aliases: ["cinematic", "vibe"],
    description: "Strong sense of place, mood, and visual style.",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600",
  },
  Nostalgic: {
    genres: [10751, 10402],
    keywords: ["nostalgia", "childhood", "80s", "90s", "retro", "throwback"],
    aliases: ["classic vibe"],
    description: "Evokes fond memories of the past.",
    imageUrl: "https://images.unsplash.com/photo-1533158326339-7f3cf2404354?auto=format&fit=crop&q=80&w=600",
  },
  Chaotic: {
    genres: [28, 35],
    keywords: ["chaos", "mayhem", "absurd", "satire", "fast paced", "wild"],
    aliases: ["crazy", "unhinged"],
    description: "Wild, unpredictable, and frenetic energy.",
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=600",
  },
  Intense: {
    genres: [28, 53, 10752],
    keywords: ["intense", "survival", "combat", "violence", "pulse pounding", "adrenaline"],
    aliases: ["hardcore", "high stakes"],
    description: "High stakes, fast action, and extreme pressure.",
    imageUrl: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&q=80&w=600",
  },
  "Thought-Provoking": {
    genres: [878, 18],
    keywords: ["philosophical", "society", "ethics", "technology", "artificial intelligence", "moral"],
    aliases: ["deep", "intellectual"],
    description: "Explores deep philosophical or societal questions.",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600",
  },
};

/**
 * Basic natural language matching to detect moods from a prompt.
 * In a real-world scenario, this would use an LLM or Vector DB.
 */
export function analyzePromptForMoods(prompt) {
  const lowercasePrompt = String(prompt || "").toLowerCase();
  const scored = [];

  for (const [moodName, data] of Object.entries(MOODS)) {
    let score = 0;
    if (lowercasePrompt.includes(moodName.toLowerCase())) score += 3;
    for (const alias of data.aliases || []) {
      if (lowercasePrompt.includes(alias.toLowerCase())) score += 2;
    }
    for (const keyword of data.keywords || []) {
      if (lowercasePrompt.includes(keyword.toLowerCase())) score += 1;
    }
    if (score > 0) scored.push({ moodName, score });
  }

  if (scored.length === 0) {
    if (lowercasePrompt.match(/sad|cry|lonely|breakup|grief/)) return ["Emotional", "Comfort"];
    if (lowercasePrompt.match(/happy|laugh|funny|friends|light/)) return ["Feel-Good", "Comfort"];
    if (lowercasePrompt.match(/sci[- ]?fi|space|future|alien/)) return ["Mind-Bending", "Thought-Provoking"];
    return ["Atmospheric"];
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.moodName);
}

/**
 * Get TMDB discover query parameters for a given list of moods.
 */
export function getDiscoverParamsForMoods(moods) {
  const allGenres = new Set();
  moods.forEach((mood) => {
    const data = MOODS[mood];
    if (data) {
      data.genres.forEach((g) => allGenres.add(g));
    }
  });

  return {
    with_genres: Array.from(allGenres).join("|"),
    vote_count_gte: 120,
    include_adult: false,
  };
}

export function parseAdvancedMoodPrompt(prompt) {
  const raw = String(prompt || "").trim();
  const lower = raw.toLowerCase();

  const matchedMoods = analyzePromptForMoods(raw);
  const yearRange = (() => {
    const m = lower.match(/(19\d{2}|20\d{2})\s*[-to]+\s*(19\d{2}|20\d{2})/);
    if (!m) return null;
    return { from: Number(m[1]), to: Number(m[2]) };
  })();

  const minYear = (() => {
    const m = lower.match(/after\s+(19\d{2}|20\d{2})/);
    return m ? Number(m[1]) : null;
  })();
  const maxYear = (() => {
    const m = lower.match(/before\s+(19\d{2}|20\d{2})/);
    return m ? Number(m[1]) : null;
  })();

  const includeTV = /\btv|series|show\b/.test(lower);
  const preferMovies = !includeTV || /\bmovie|film|cinema\b/.test(lower);
  const language = /\bkorean|k-drama\b/.test(lower)
    ? "ko"
    : /\bjapanese|anime\b/.test(lower)
      ? "ja"
      : /\bhindi|bollywood\b/.test(lower)
        ? "hi"
        : /\bspanish\b/.test(lower)
          ? "es"
          : null;

  const anchorTitle = (() => {
    const m = raw.match(/similar to\s+["“]?([^"”]+)["”]?/i);
    return m ? m[1].trim() : null;
  })();

  return {
    matchedMoods,
    yearRange,
    minYear,
    maxYear,
    includeTV,
    preferMovies,
    language,
    anchorTitle,
    rawPrompt: raw,
  };
}
