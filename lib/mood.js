// Mood Categories and their TMDB mappings
export const MOODS = {
  Emotional: {
    genres: [18, 10749], // Drama, Romance
    keywords: ["tears", "heartbreak", "emotional", "moving", "melodrama"],
    description: "Deeply moving and emotionally resonant.",
  },
  Dark: {
    genres: [53, 27, 80], // Thriller, Horror, Crime
    keywords: ["dark", "murder", "serial killer", "neo-noir", "gritty"],
    description: "Gritty, intense, and shadowy themes.",
  },
  Comfort: {
    genres: [35, 10751, 16], // Comedy, Family, Animation
    keywords: ["feel good", "heartwarming", "friendship", "coming of age", "pets"],
    description: "Lighthearted, cozy, and uplifting.",
  },
  "Mind-Bending": {
    genres: [878, 9648, 53], // Sci-Fi, Mystery, Thriller
    keywords: ["mindfuck", "time travel", "existentialism", "surreal", "plot twist"],
    description: "Psychological, surreal, and reality-bending.",
  },
  "Feel-Good": {
    genres: [35, 10402], // Comedy, Music
    keywords: ["uplifting", "happy", "inspirational", "triumph", "musical"],
    description: "Positive, joyful, and inspiring.",
  },
  Inspirational: {
    genres: [18, 36], // Drama, History
    keywords: ["sports", "overcoming adversity", "based on true story", "heroic"],
    description: "Motivating and uplifting stories of triumph.",
  },
  Suspenseful: {
    genres: [53, 9648], // Thriller, Mystery
    keywords: ["tension", "cat and mouse", "whodunit", "hostage", "escape"],
    description: "Edge-of-your-seat tension and thrills.",
  },
  Romantic: {
    genres: [10749], // Romance
    keywords: ["love", "romance", "marriage", "first love", "relationship"],
    description: "Stories focused on love and relationships.",
  },
  Psychological: {
    genres: [53, 18], // Thriller, Drama
    keywords: ["psychological", "madness", "paranoia", "obsession", "trauma"],
    description: "Deep dives into the human mind and psyche.",
  },
  Atmospheric: {
    genres: [878, 14, 27], // Sci-Fi, Fantasy, Horror
    keywords: ["atmospheric", "slow burn", "visually stunning", "moody", "gothic"],
    description: "Strong sense of place, mood, and visual style.",
  },
  Nostalgic: {
    genres: [10751, 10402], // Family, Music
    keywords: ["nostalgia", "childhood", "80s", "90s", "retro"],
    description: "Evokes fond memories of the past.",
  },
  Chaotic: {
    genres: [28, 35], // Action, Comedy
    keywords: ["chaos", "mayhem", "absurd", "satire", "fast paced"],
    description: "Wild, unpredictable, and frenetic energy.",
  },
  Intense: {
    genres: [28, 53, 10752], // Action, Thriller, War
    keywords: ["intense", "survival", "combat", "violence", "pulse pounding"],
    description: "High stakes, fast action, and extreme pressure.",
  },
  "Thought-Provoking": {
    genres: [878, 18], // Sci-Fi, Drama
    keywords: ["philosophical", "society", "ethics", "technology", "artificial intelligence"],
    description: "Explores deep philosophical or societal questions.",
  },
};

/**
 * Basic natural language matching to detect moods from a prompt.
 * In a real-world scenario, this would use an LLM or Vector DB.
 */
export function analyzePromptForMoods(prompt) {
  const lowercasePrompt = prompt.toLowerCase();
  const matchedMoods = [];
  
  for (const [moodName, data] of Object.entries(MOODS)) {
    if (lowercasePrompt.includes(moodName.toLowerCase())) {
      matchedMoods.push(moodName);
      continue;
    }
    
    // Check keywords
    for (const keyword of data.keywords) {
      if (lowercasePrompt.includes(keyword.toLowerCase())) {
        matchedMoods.push(moodName);
        break;
      }
    }
  }
  
  // Provide a default if no matches found
  if (matchedMoods.length === 0) {
    // If it looks somewhat serious
    if (lowercasePrompt.match(/sad|cry|lonely|breakup/)) {
      return ["Emotional", "Comfort"];
    }
    // If it looks happy
    if (lowercasePrompt.match(/happy|laugh|funny|friends/)) {
      return ["Feel-Good", "Comfort"];
    }
    // Random fallback
    return ["Atmospheric"];
  }
  
  return matchedMoods;
}

/**
 * Get TMDB discover query parameters for a given list of moods.
 */
export function getDiscoverParamsForMoods(moods) {
  const allGenres = new Set();
  const allKeywords = new Set();
  
  moods.forEach(mood => {
    const data = MOODS[mood];
    if (data) {
      data.genres.forEach(g => allGenres.add(g));
      // Keyword matching in TMDB is complex because you need their specific keyword IDs.
      // For simplicity in this demo, we'll rely primarily on genres for the actual API call,
      // and maybe do client-side filtering if needed, or use a few known TMDB keyword IDs.
    }
  });
  
  return {
    with_genres: Array.from(allGenres).join('|'),
    // In a real app, you would translate string keywords to TMDB keyword IDs:
    // with_keywords: "..." 
  };
}
