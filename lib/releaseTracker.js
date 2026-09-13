import User from "@/models/User";
import Collection from "@/models/Collection";
import ReleaseTracker from "@/models/ReleaseTracker";
import { tmdbRequest } from "@/lib/tmdb";

/**
 * Synchronizes release tracking state for a specific user.
 * Establishes initial baseline state for newly added titles so retro-notifications are NOT sent.
 * Deactivates tracking when a title is removed from all sources.
 */
export async function syncUserReleaseTracking(userId) {
  try {
    const user = await User.findById(userId).lean();
    if (!user) return;

    // Fetch user's collections (owned or collaborated)
    const collections = await Collection.find({
      $or: [{ ownerId: userId }, { "collaborators.userId": userId }],
    }).lean();

    // Map to hold aggregated tracked sources per unique title key
    // Key format: "tv:12345" or "movie:67890"
    const trackedMap = new Map();

    const addTitle = (id, sourceKey, customTitle = "") => {
      if (typeof id !== "number" || isNaN(id) || id === 0) return;
      const isTv = id < 0;
      const tmdbId = Math.abs(id);
      const mediaType = isTv ? "tv" : "movie";
      const key = `${mediaType}:${tmdbId}`;

      if (!trackedMap.has(key)) {
        trackedMap.set(key, {
          tmdbId,
          mediaType,
          title: customTitle,
          trackedSources: {
            watchlist: false,
            favorite: false,
            watched: false,
            collection: false,
          },
        });
      }

      const item = trackedMap.get(key);
      item.trackedSources[sourceKey] = true;
    };

    (user.watchlist || []).forEach((id) => addTitle(id, "watchlist"));
    (user.favorites || []).forEach((id) => addTitle(id, "favorite"));
    (user.watchedMovies || []).forEach((id) => addTitle(id, "watched"));

    collections.forEach((col) => {
      (col.movies || []).forEach((id) => addTitle(id, "collection"));
    });

    const existingTrackers = await ReleaseTracker.find({ userId });
    const existingMap = new Map(
      existingTrackers.map((t) => [`${t.mediaType}:${t.tmdbId}`, t])
    );

    // Process all currently tracked titles
    for (const [key, item] of trackedMap.entries()) {
      const existing = existingMap.get(key);

      if (existing) {
        // Update tracked sources and reactivate if inactive
        existing.trackedSources = item.trackedSources;
        existing.active = true;
        await existing.save();
      } else {
        // New tracked title: fetch baseline state from TMDB
        let baselineData = {
          userId,
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
          title: item.title,
          trackedSources: item.trackedSources,
          lastCheckedAt: new Date(),
          active: true,
        };

        if (item.mediaType === "tv") {
          const res = await tmdbRequest(`/tv/${item.tmdbId}`);
          if (res.ok) {
            const tvData = await res.json();
            baselineData.title = tvData.name || tvData.original_name || item.title;
            baselineData.lastKnownSeason = tvData.number_of_seasons || 0;
            baselineData.lastKnownEpisodeCount = tvData.number_of_episodes || 0;
            baselineData.knownSeasonIds = (tvData.seasons || [])
              .map((s) => s.id)
              .filter(Boolean);
            if (tvData.last_air_date) {
              baselineData.lastKnownReleaseDate = new Date(tvData.last_air_date);
            }
          }
        } else {
          // Movie baseline
          const res = await tmdbRequest(`/movie/${item.tmdbId}`);
          if (res.ok) {
            const movieData = await res.json();
            baselineData.title = movieData.title || movieData.original_title || item.title;
            if (movieData.release_date) {
              baselineData.lastKnownReleaseDate = new Date(movieData.release_date);
            }

            if (movieData.belongs_to_collection?.id) {
              baselineData.knownCollectionId = movieData.belongs_to_collection.id;
              const colRes = await tmdbRequest(`/collection/${movieData.belongs_to_collection.id}`);
              if (colRes.ok) {
                const colData = await colRes.json();
                baselineData.knownCollectionMovieIds = (colData.parts || [])
                  .map((p) => p.id)
                  .filter(Boolean);
              }
            }
          }
        }

        await ReleaseTracker.create(baselineData);
      }
    }

    // Deactivate trackers for titles no longer in user's library
    for (const tracker of existingTrackers) {
      const key = `${tracker.mediaType}:${tracker.tmdbId}`;
      if (!trackedMap.has(key) && tracker.active) {
        tracker.active = false;
        tracker.trackedSources = {
          watchlist: false,
          favorite: false,
          watched: false,
          collection: false,
        };
        await tracker.save();
      }
    }
  } catch (error) {
    console.error(`[ReleaseTracker] Error syncing user ${userId}:`, error.message);
  }
}
