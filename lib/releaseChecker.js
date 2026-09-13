import { connectDB } from "@/lib/mongodb";
import ReleaseTracker from "@/models/ReleaseTracker";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { tmdbRequest } from "@/lib/tmdb";
import { sendPushToUser } from "@/lib/pushNotifications";
import { getMovieUrl } from "@/utils/slugify";

/**
 * Main release checking engine called by Vercel Cron.
 * Collects all active tracked titles, queries TMDB once per unique title,
 * detects new releases, creates idempotent in-app notifications, and triggers Web Push.
 */
export async function checkAllReleases() {
  await connectDB();

  console.log("[ReleaseChecker] Starting release check process...");

  const activeTrackers = await ReleaseTracker.find({ active: true }).lean();
  if (!activeTrackers || activeTrackers.length === 0) {
    console.log("[ReleaseChecker] No active release trackers found.");
    return { checked: 0, releasesFound: 0, notificationsSent: 0 };
  }

  // Group trackers by unique title key ("tv:123" or "movie:456")
  const groupedTrackers = new Map();
  for (const tracker of activeTrackers) {
    const key = `${tracker.mediaType}:${tracker.tmdbId}`;
    if (!groupedTrackers.has(key)) {
      groupedTrackers.set(key, []);
    }
    groupedTrackers.get(key).push(tracker);
  }

  console.log(
    `[ReleaseChecker] Tracking ${activeTrackers.length} total user entries across ${groupedTrackers.size} unique titles.`
  );

  let titlesChecked = 0;
  let releasesFound = 0;
  let notificationsSent = 0;
  let pushSentCount = 0;

  const todayStr = new Date().toISOString().split("T")[0];

  for (const [key, userTrackers] of groupedTrackers.entries()) {
    const [mediaType, tmdbIdStr] = key.split(":");
    const tmdbId = parseInt(tmdbIdStr, 10);
    titlesChecked++;

    try {
      if (mediaType === "tv") {
        const res = await tmdbRequest(`/tv/${tmdbId}`);
        if (!res.ok) {
          console.warn(`[ReleaseChecker] Failed to fetch TV show ${tmdbId} from TMDB.`);
          continue;
        }

        const tvData = await res.json();
        const currentSeasons = tvData.seasons || [];
        const currentNumSeasons = tvData.number_of_seasons || 0;
        const lastEpisode = tvData.last_episode_to_air;
        const showTitle = tvData.name || tvData.original_name || "TV Series";
        const posterPath = tvData.poster_path || "";
        const signedMovieId = -tmdbId;

        for (const tracker of userTrackers) {
          const user = await User.findById(tracker.userId).lean();
          if (!user) continue;

          const prefs = user.notificationPreferences || {};
          const inAppEnabled = prefs.inAppEnabled !== false;
          const pushEnabled = prefs.pushEnabled !== false;
          const tvReleaseMode = prefs.tvReleaseMode || "seasons"; // "seasons", "episodes", "both"

          let updatedSeasonIds = new Set(tracker.knownSeasonIds || []);
          let updatedEpisodeIds = new Set(tracker.knownEpisodeIds || []);
          let trackerUpdated = false;
          let maxSeasonNum = tracker.lastKnownSeason || 0;

          // 1. Check for New Season
          for (const season of currentSeasons) {
            const seasonNum = season.season_number;
            if (!seasonNum || seasonNum <= 0) continue;

            const isNewSeasonNum = seasonNum > (tracker.lastKnownSeason || 0);
            const isNewSeasonId = season.id && !updatedSeasonIds.has(season.id);

            if (isNewSeasonNum || isNewSeasonId) {
              const releaseDate = season.air_date || tvData.first_air_date;
              // Ensure it's not a future unreleased season unless it has an air date <= today
              if (releaseDate && releaseDate > todayStr && !isNewSeasonNum) {
                continue;
              }

              releasesFound++;
              if (season.id) updatedSeasonIds.add(season.id);
              if (seasonNum > maxSeasonNum) maxSeasonNum = seasonNum;
              trackerUpdated = true;

              if (inAppEnabled && tvReleaseMode !== "episodes") {
                const dedupKey = `${user._id}_tv_${tmdbId}_season_${seasonNum}`;
                const message = `${showTitle} — Season ${seasonNum} is now available!`;
                const pageUrl = getMovieUrl(signedMovieId, showTitle);

                try {
                  const existingNotif = await Notification.findOne({ dedupKey }).lean();
                  if (!existingNotif) {
                    await Notification.create({
                      recipientId: user._id,
                      senderUsername: "MovieKart",
                      type: "new_season",
                      movieId: signedMovieId,
                      mediaType: "tv",
                      releaseId: String(season.id || seasonNum),
                      releaseType: "season",
                      dedupKey,
                      message,
                      metadata: {
                        tmdbId,
                        mediaType: "tv",
                        showTitle,
                        seasonNumber: seasonNum,
                        posterPath,
                        url: pageUrl,
                      },
                    });
                    notificationsSent++;

                    if (pushEnabled) {
                      const pushRes = await sendPushToUser(user._id, {
                        title: "New Season Released 🎬",
                        body: message,
                        icon: posterPath ? `https://image.tmdb.org/t/p/w185${posterPath}` : "/icon.png",
                        url: pageUrl,
                        movieId: signedMovieId,
                        mediaType: "tv",
                      });
                      if (pushRes.sent > 0) pushSentCount += pushRes.sent;
                    }
                  }
                } catch (err) {
                  // Duplicate key error swallow
                  if (err.code !== 11000) {
                    console.error(`[ReleaseChecker] Error creating notification for user ${user._id}:`, err.message);
                  }
                }
              }
            }
          }

          // 2. Check for New Episode (if enabled in user preferences)
          if ((tvReleaseMode === "episodes" || tvReleaseMode === "both") && lastEpisode) {
            const epId = lastEpisode.id;
            if (epId && !updatedEpisodeIds.has(epId)) {
              updatedEpisodeIds.add(epId);
              trackerUpdated = true;
              releasesFound++;

              if (inAppEnabled) {
                const epNum = lastEpisode.episode_number;
                const seasonNum = lastEpisode.season_number;
                const epTitle = lastEpisode.name ? ` "${lastEpisode.name}"` : "";
                const dedupKey = `${user._id}_tv_${tmdbId}_ep_${epId}`;
                const message = `${showTitle} — Season ${seasonNum} Episode ${epNum}${epTitle} is now available!`;
                const pageUrl = getMovieUrl(signedMovieId, showTitle);

                try {
                  const existingNotif = await Notification.findOne({ dedupKey }).lean();
                  if (!existingNotif) {
                    await Notification.create({
                      recipientId: user._id,
                      senderUsername: "MovieKart",
                      type: "new_episode",
                      movieId: signedMovieId,
                      mediaType: "tv",
                      releaseId: String(epId),
                      releaseType: "episode",
                      dedupKey,
                      message,
                      metadata: {
                        tmdbId,
                        mediaType: "tv",
                        showTitle,
                        seasonNumber: seasonNum,
                        episodeNumber: epNum,
                        episodeName: lastEpisode.name,
                        posterPath,
                        url: pageUrl,
                      },
                    });
                    notificationsSent++;

                    if (pushEnabled) {
                      const pushRes = await sendPushToUser(user._id, {
                        title: "New Episode Released 📺",
                        body: message,
                        icon: posterPath ? `https://image.tmdb.org/t/p/w185${posterPath}` : "/icon.png",
                        url: pageUrl,
                        movieId: signedMovieId,
                        mediaType: "tv",
                      });
                      if (pushRes.sent > 0) pushSentCount += pushRes.sent;
                    }
                  }
                } catch (err) {
                  if (err.code !== 11000) {
                    console.error(`[ReleaseChecker] Error creating episode notification:`, err.message);
                  }
                }
              }
            }
          }

          // Update ReleaseTracker document for this user
          await ReleaseTracker.updateOne(
            { _id: tracker._id },
            {
              $set: {
                lastKnownSeason: Math.max(maxSeasonNum, currentNumSeasons),
                knownSeasonIds: Array.from(updatedSeasonIds),
                knownEpisodeIds: Array.from(updatedEpisodeIds),
                lastCheckedAt: new Date(),
              },
            }
          );
        }
      } else {
        // Media type is "movie"
        const res = await tmdbRequest(`/movie/${tmdbId}`);
        if (!res.ok) {
          console.warn(`[ReleaseChecker] Failed to fetch movie ${tmdbId} from TMDB.`);
          continue;
        }

        const movieData = await res.json();
        const collection = movieData.belongs_to_collection;

        if (collection?.id) {
          const colRes = await tmdbRequest(`/collection/${collection.id}`);
          if (colRes.ok) {
            const colData = await colRes.json();
            const collectionParts = colData.parts || [];
            const collectionName = colData.name || collection.name || "Movie Franchise";

            for (const tracker of userTrackers) {
              const user = await User.findById(tracker.userId).lean();
              if (!user) continue;

              const prefs = user.notificationPreferences || {};
              const inAppEnabled = prefs.inAppEnabled !== false;
              const pushEnabled = prefs.pushEnabled !== false;
              const movieInstallmentsEnabled = prefs.movieInstallmentsEnabled !== false;

              let knownMovieIds = new Set(tracker.knownCollectionMovieIds || [tmdbId]);
              let trackerUpdated = false;

              for (const part of collectionParts) {
                if (!part.id) continue;
                const isNewPart = !knownMovieIds.has(part.id);

                if (isNewPart) {
                  const partReleaseDate = part.release_date || "";
                  // Only notify if release date is present and released (or releasing today)
                  if (!partReleaseDate || partReleaseDate > todayStr) {
                    continue;
                  }

                  releasesFound++;
                  knownMovieIds.add(part.id);
                  trackerUpdated = true;

                  if (inAppEnabled && movieInstallmentsEnabled) {
                    const newMovieTitle = part.title || part.original_title || "New Installment";
                    const newSignedMovieId = part.id;
                    const dedupKey = `${user._id}_movie_${tmdbId}_installment_${part.id}`;
                    const message = `New ${collectionName} movie released! ${newMovieTitle} is now available.`;
                    const pageUrl = getMovieUrl(newSignedMovieId, newMovieTitle);
                    const partPoster = part.poster_path || colData.poster_path || movieData.poster_path;

                    try {
                      const existingNotif = await Notification.findOne({ dedupKey }).lean();
                      if (!existingNotif) {
                        await Notification.create({
                          recipientId: user._id,
                          senderUsername: "MovieKart",
                          type: "new_movie_installment",
                          movieId: newSignedMovieId,
                          mediaType: "movie",
                          releaseId: String(part.id),
                          releaseType: "movie_installment",
                          dedupKey,
                          message,
                          metadata: {
                            tmdbId: part.id,
                            mediaType: "movie",
                            collectionName,
                            movieTitle: newMovieTitle,
                            posterPath: partPoster,
                            url: pageUrl,
                          },
                        });
                        notificationsSent++;

                        if (pushEnabled) {
                          const pushRes = await sendPushToUser(user._id, {
                            title: "New Movie Released 🎬",
                            body: message,
                            icon: partPoster ? `https://image.tmdb.org/t/p/w185${partPoster}` : "/icon.png",
                            url: pageUrl,
                            movieId: newSignedMovieId,
                            mediaType: "movie",
                          });
                          if (pushRes.sent > 0) pushSentCount += pushRes.sent;
                        }
                      }
                    } catch (err) {
                      if (err.code !== 11000) {
                        console.error(`[ReleaseChecker] Error creating movie notification:`, err.message);
                      }
                    }
                  }
                }
              }

              await ReleaseTracker.updateOne(
                { _id: tracker._id },
                {
                  $set: {
                    knownCollectionId: collection.id,
                    knownCollectionMovieIds: Array.from(knownMovieIds),
                    lastCheckedAt: new Date(),
                  },
                }
              );
            }
          }
        } else {
          // Movie has no collection, just update lastCheckedAt timestamp
          await ReleaseTracker.updateMany(
            { tmdbId, mediaType: "movie" },
            { $set: { lastCheckedAt: new Date() } }
          );
        }
      }
    } catch (error) {
      console.error(`[ReleaseChecker] Error processing release check for key ${key}:`, error.message);
    }
  }

  console.log(
    `[ReleaseChecker] Finished. Titles checked: ${titlesChecked}, Releases found: ${releasesFound}, Notifications created: ${notificationsSent}, Push delivered: ${pushSentCount}`
  );

  return {
    checked: titlesChecked,
    releasesFound,
    notificationsSent,
    pushSentCount,
  };
}
