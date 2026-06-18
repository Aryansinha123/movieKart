import {
  computeCollectionProgress,
  resolveCollectionMovies,
  getTotalRuntime,
  formatRuntime,
  buildTmdbImageUrl,
} from "@/lib/curatedCollections";

/** Merge base items with personal overrides (reorder, add, remove). */
export function getEffectiveItems(baseItems = [], personalItems = null) {
  if (personalItems && personalItems.length > 0) return [...personalItems];
  return [...baseItems];
}

export async function enrichUserCollectionDetail(collection, watched = [], options = {}) {
  const items = getEffectiveItems(collection.movies || [], options.personalItems);
  const movies = await resolveCollectionMovies(items);
  const progress = computeCollectionProgress(watched, items);
  const watchedSet = new Set(watched);

  const bannerUrl =
    options.personalBannerUrl ||
    collection.bannerUrl ||
    collection.imageUrl ||
    (movies[0]?.backdrop_path ? buildTmdbImageUrl(movies[0].backdrop_path) : "");

  const coverImage =
    collection.imageUrl ||
    (movies[0]?.poster_path ? buildTmdbImageUrl(movies[0].poster_path, "w500") : "");

  return {
    ...collection,
    id: collection._id?.toString(),
    items,
    movies: movies.map((m) => ({ ...m, watched: watchedSet.has(m.id) })),
    totalCount: items.length,
    totalRuntime: getTotalRuntime(movies),
    totalRuntimeFormatted: formatRuntime(getTotalRuntime(movies)),
    bannerUrl,
    coverImage,
    bannerStyle: options.bannerStyle || collection.bannerStyle || {},
    ...progress,
  };
}

export async function enrichCuratedWithPersonalization(curated, personalization, watched = []) {
  const personalItems =
    personalization?.personalItems?.length > 0 ? personalization.personalItems : null;
  const items = getEffectiveItems(curated.items || [], personalItems);
  const movies = await resolveCollectionMovies(items);
  const progress = computeCollectionProgress(watched, items);
  const watchedSet = new Set(watched);

  const bannerUrl =
    personalization?.personalBannerUrl ||
    curated.coverImage ||
    (movies[0]?.backdrop_path ? buildTmdbImageUrl(movies[0].backdrop_path) : "");

  return {
    ...curated,
    id: curated._id?.toString(),
    items,
    movies: movies.map((m) => ({ ...m, watched: watchedSet.has(m.id) })),
    totalCount: items.length,
    totalRuntime: getTotalRuntime(movies),
    totalRuntimeFormatted: formatRuntime(getTotalRuntime(movies)),
    bannerUrl,
    bannerStyle: personalization?.bannerStyle || {},
    isPersonalized: Boolean(personalItems || personalization?.personalBannerUrl),
    personalizationId: personalization?._id?.toString(),
    ...progress,
  };
}
