export const BADGE_RARITY = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  secret: "Secret",
};

export const BADGE_CATALOG = [
  // Watch milestones
  { key: "first_watch", title: "First Movie Watched", rarity: "common", category: "watch", check: (s) => s.watchedCount >= 1 },
  { key: "watch_10", title: "10 Movies Watched", rarity: "common", category: "watch", check: (s) => s.watchedCount >= 10 },
  { key: "watch_100_club", title: "100 Movies Club", rarity: "rare", category: "watch", check: (s) => s.watchedCount >= 100 },
  { key: "cinema_addict", title: "Cinema Addict", rarity: "epic", category: "watch", check: (s) => s.watchedCount >= 300 },
  { key: "marathon_master", title: "Marathon Master", rarity: "epic", category: "watch", check: (s) => s.maxDailyWatched >= 5 },
  { key: "thousand_hours", title: "1000 Hours Watched", rarity: "legendary", category: "watch", check: (s) => s.totalRuntimeHours >= 1000 },

  // Genre specialists
  { key: "scifi_expert", title: "Sci-Fi Expert", rarity: "rare", category: "genre", check: (s) => (s.genreCounts[878] || 0) >= 25 },
  { key: "horror_enthusiast", title: "Horror Enthusiast", rarity: "rare", category: "genre", check: (s) => (s.genreCounts[27] || 0) >= 25 },
  { key: "drama_critic", title: "Drama Critic", rarity: "rare", category: "genre", check: (s) => (s.genreCounts[18] || 0) >= 30 },
  { key: "romance_lover", title: "Romance Lover", rarity: "rare", category: "genre", check: (s) => (s.genreCounts[10749] || 0) >= 20 },
  { key: "thriller_specialist", title: "Thriller Specialist", rarity: "rare", category: "genre", check: (s) => (s.genreCounts[53] || 0) >= 25 },
  { key: "anime_explorer", title: "Anime Explorer", rarity: "epic", category: "genre", check: (s) => (s.genreCounts[16] || 0) >= 20 },

  // Review/rating
  { key: "first_review", title: "First Review", rarity: "common", category: "review", check: (s) => s.reviewCount >= 1 },
  { key: "critic", title: "Critic", rarity: "rare", category: "review", check: (s) => s.reviewCount >= 25 },
  { key: "top_reviewer", title: "Top Reviewer", rarity: "epic", category: "review", check: (s) => s.reviewCount >= 100 },
  { key: "review_master", title: "Review Master", rarity: "legendary", category: "review", check: (s) => s.reviewCount >= 300 },
  { key: "rating_500", title: "500 Ratings Given", rarity: "legendary", category: "review", check: (s) => s.reviewCount >= 500 },
  { key: "review_loved", title: "Community Favorite Reviewer", rarity: "epic", category: "review", check: (s) => s.reviewLikesReceived >= 100 },
  { key: "long_form_critic", title: "Long-form Critic", rarity: "rare", category: "review", check: (s) => s.maxReviewLength >= 700 },

  // Collection curation
  { key: "playlist_creator", title: "Playlist Creator", rarity: "common", category: "collection", check: (s) => s.collectionCount >= 1 },
  { key: "master_curator", title: "Master Curator", rarity: "rare", category: "collection", check: (s) => s.collectionCount >= 5 },
  { key: "collection_architect", title: "Collection Architect", rarity: "epic", category: "collection", check: (s) => s.collectionCount >= 12 },
  { key: "top_collector", title: "Top Collector", rarity: "legendary", category: "collection", check: (s) => s.collectionMovieTotal >= 100 },
  { key: "viral_collection", title: "Viral Collection", rarity: "epic", category: "collection", check: (s) => s.collectionLikesReceived >= 50 || s.collectionSavesReceived >= 30 },

  // Social
  { key: "first_follower", title: "First Follower", rarity: "common", category: "social", check: (s) => s.followersCount >= 1 },
  { key: "influencer", title: "Influencer", rarity: "rare", category: "social", check: (s) => s.followersCount >= 25 },
  { key: "community_favorite", title: "Community Favorite", rarity: "epic", category: "social", check: (s) => s.followersCount >= 100 },
  { key: "social_critic", title: "Social Critic", rarity: "rare", category: "social", check: (s) => s.commentCount >= 30 },
  { key: "trend_setter", title: "Trend Setter", rarity: "epic", category: "social", check: (s) => s.totalEngagement >= 200 },

  // Streaks
  { key: "watch_streak_7", title: "7-Day Watch Streak", rarity: "rare", category: "streak", check: (s) => s.currentActivityStreak >= 7 },
  { key: "weekend_reviewer", title: "Weekend Reviewer", rarity: "rare", category: "streak", check: (s) => s.weekendReviewCount >= 10 },
  { key: "daily_critic", title: "Daily Critic", rarity: "epic", category: "streak", check: (s) => s.currentReviewStreak >= 5 },
  { key: "consistent_viewer", title: "Consistent Viewer", rarity: "epic", category: "streak", check: (s) => s.longestActivityStreak >= 14 },
  { key: "night_owl_cinephile", title: "Night Owl Cinephile", rarity: "rare", category: "streak", check: (s) => s.lateNightActivities >= 15 },

  // Secret
  { key: "secret_3am", title: "3AM Cinephile", rarity: "secret", category: "secret", check: (s) => s.activitiesAt3AM >= 1 },
  { key: "secret_horror_50", title: "Horror Ritualist", rarity: "secret", category: "secret", check: (s) => (s.genreCounts[27] || 0) >= 50 },
  { key: "secret_20_countries", title: "World Cinema Voyager", rarity: "secret", category: "secret", check: (s) => s.countryCount >= 20 },
];

export function computeDayStreak(datesLike) {
  if (!datesLike?.length) return { current: 0, longest: 0 };
  const days = [...new Set(datesLike.map((d) => new Date(d).toISOString().slice(0, 10)))].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(`${days[i - 1]}T00:00:00.000Z`).getTime();
    const cur = new Date(`${days[i]}T00:00:00.000Z`).getTime();
    const diff = (cur - prev) / 86400000;
    if (diff === 1) run += 1;
    else run = 1;
    if (run > longest) longest = run;
  }
  const today = new Date();
  const dayKey = today.toISOString().slice(0, 10);
  const yesterdayKey = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
  let current = 0;
  if (days.includes(dayKey) || days.includes(yesterdayKey)) {
    current = 1;
    for (let i = days.length - 1; i > 0; i--) {
      const a = new Date(`${days[i]}T00:00:00.000Z`).getTime();
      const b = new Date(`${days[i - 1]}T00:00:00.000Z`).getTime();
      if ((a - b) / 86400000 === 1) current += 1;
      else break;
    }
  }
  return { current, longest };
}

export function evaluateAchievements(stats) {
  const unlocked = [];
  for (const badge of BADGE_CATALOG) {
    if (badge.check(stats)) unlocked.push(badge.key);
  }
  return unlocked;
}

export function badgeMeta(keys = []) {
  const set = new Set(keys);
  return BADGE_CATALOG.filter((b) => set.has(b.key)).map((b) => ({
    ...b,
    rarityLabel: BADGE_RARITY[b.rarity] || b.rarity,
  }));
}

export function recommendedGenreBoostFromBadges(unlockedKeys = []) {
  const set = new Set(unlockedKeys);
  const boosts = [];
  if (set.has("scifi_expert")) boosts.push(878);
  if (set.has("horror_enthusiast") || set.has("secret_horror_50")) boosts.push(27);
  if (set.has("drama_critic")) boosts.push(18);
  if (set.has("romance_lover")) boosts.push(10749);
  if (set.has("thriller_specialist")) boosts.push(53);
  if (set.has("anime_explorer")) boosts.push(16);
  return [...new Set(boosts)];
}

