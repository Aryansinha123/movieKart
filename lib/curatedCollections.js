import { connectDB } from "@/lib/mongodb";
import CuratedCollection from "@/models/CuratedCollection";
import User from "@/models/User";
import UserCuratedCollection from "@/models/UserCuratedCollection";
import { CURATED_COLLECTION_DEFS } from "@/lib/curatedCollectionsData";
import { fetchMovieDetails, tmdbRequest } from "@/lib/tmdb";

async function fetchItemsFromDiscover(path, limit = 20, tvItems = false) {
  const res = await tmdbRequest(`${path}${path.includes("?") ? "&" : "?"}page=1`);
  if (!res.ok) return [];
  const data = await res.json();
  const results = (data.results || []).slice(0, limit);
  return results.map((item) => {
    if (tvItems || item.name) return -Math.abs(item.id);
    return item.id;
  });
}

async function resolveDefinitionItems(def) {
  if (def.items?.length) return def.items;
  if (!def.discoverPath) return [];
  return fetchItemsFromDiscover(def.discoverPath, def.limit || 20, def.tvItems);
}

export function buildTmdbImageUrl(path, size = "w780") {
  if (!path) return "";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/** Resolve a valid cover from the first available title in the collection. */
export async function resolveCoverImage(items = []) {
  for (const id of items.slice(0, 6)) {
    const detail = await fetchMovieDetails(id);
    if (!detail) continue;
    if (detail.backdrop_path) return buildTmdbImageUrl(detail.backdrop_path);
    if (detail.poster_path) return buildTmdbImageUrl(detail.poster_path);
  }
  return "";
}

async function refreshCollectionCovers() {
  const collections = await CuratedCollection.find({ coverResolved: { $ne: true } }).lean();
  for (const col of collections) {
    if (!col.items?.length) continue;
    const coverImage = await resolveCoverImage(col.items);
    await CuratedCollection.updateOne(
      { _id: col._id },
      { $set: { coverImage: coverImage || "", coverResolved: true } }
    );
  }
}

export async function ensureCuratedCollectionsSeeded() {
  await connectDB();

  for (const def of CURATED_COLLECTION_DEFS) {
    const items = await resolveDefinitionItems(def);
    const filteredItems = items.filter(Boolean);
    const existing = await CuratedCollection.findOne({ slug: def.slug });

    if (existing) {
      if (def.itemsVersion != null && existing.itemsVersion !== def.itemsVersion && def.items?.length) {
        await CuratedCollection.updateOne(
          { slug: def.slug },
          {
            $set: {
              title: def.title,
              description: def.description,
              items: filteredItems,
              totalItems: filteredItems.length,
              mediaType: def.mediaType || existing.mediaType,
              tags: def.tags || existing.tags,
              featured: def.featured ?? existing.featured,
              popularity: def.popularity ?? existing.popularity,
              plannedTitles: def.plannedTitles || [],
              itemsVersion: def.itemsVersion,
              coverResolved: false,
            },
          }
        );
      }
      continue;
    }

    const coverImage = await resolveCoverImage(filteredItems);

    await CuratedCollection.create({
      slug: def.slug,
      title: def.title,
      description: def.description,
      coverImage,
      coverResolved: Boolean(coverImage),
      category: def.category,
      tags: def.tags || [],
      items: filteredItems,
      totalItems: filteredItems.length,
      mediaType: def.mediaType || "movie",
      createdBy: "system",
      featured: def.featured || false,
      popularity: def.popularity || 0,
      plannedTitles: def.plannedTitles || [],
      itemsVersion: def.itemsVersion || 1,
    });
  }

  await refreshCollectionCovers();
}

export function computeCollectionProgress(watchedMovies = [], items = []) {
  const watchedSet = new Set(watchedMovies);
  const watchedItems = items.filter((id) => watchedSet.has(id));
  const total = items.length;
  const watchedCount = watchedItems.length;
  const progressPercentage = total > 0 ? Math.round((watchedCount / total) * 100) : 0;
  const nextUnwatched = items.find((id) => !watchedSet.has(id)) ?? null;

  return { watchedCount, totalCount: total, progressPercentage, watchedItems, nextUnwatched };
}

export async function resolveCollectionMovies(items = []) {
  const resolved = await Promise.all(
    items.map(async (id, orderIndex) => {
      const detail = await fetchMovieDetails(id);
      if (!detail) return null;
      return {
        id: detail.id,
        title: detail.title,
        overview: detail.overview,
        poster_path: detail.poster_path,
        backdrop_path: detail.backdrop_path,
        release_date: detail.release_date,
        vote_average: detail.vote_average,
        runtime: detail.runtime || detail.episode_run_time?.[0] || 0,
        media_type: detail.media_type || (id < 0 ? "tv" : "movie"),
        genres: detail.genres || [],
        orderIndex,
      };
    })
  );
  return resolved.filter(Boolean);
}

export function getTotalRuntime(movies = []) {
  return movies.reduce((sum, m) => sum + (m.runtime || 0), 0);
}

export function formatRuntime(minutes) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export async function getUserSavedCuratedIds(userId) {
  if (!userId) return new Set();
  const saves = await UserCuratedCollection.find({ userId }).lean();
  return new Set(saves.map((s) => s.curatedCollectionId.toString()));
}

export async function getUserWatchedMovies(userId) {
  if (!userId) return [];
  const user = await User.findById(userId).select("watchedMovies").lean();
  return user?.watchedMovies || [];
}

export async function enrichCollectionList(collections, userId) {
  const savedIds = await getUserSavedCuratedIds(userId);
  const watched = await getUserWatchedMovies(userId);

  return collections.map((col) => {
    const progress = computeCollectionProgress(watched, col.items || []);
    return {
      ...col,
      id: col._id?.toString(),
      saved: savedIds.has(col._id.toString()),
      ...progress,
    };
  });
}

export async function enrichCollectionDetail(collection, userId) {
  const savedIds = await getUserSavedCuratedIds(userId);
  const watched = await getUserWatchedMovies(userId);
  const movies = await resolveCollectionMovies(collection.items || []);
  const progress = computeCollectionProgress(watched, collection.items || []);
  const watchedSet = new Set(watched);

  return {
    ...collection,
    id: collection._id?.toString(),
    movies: movies.map((m) => ({ ...m, watched: watchedSet.has(m.id) })),
    totalRuntime: getTotalRuntime(movies),
    totalRuntimeFormatted: formatRuntime(getTotalRuntime(movies)),
    saved: savedIds.has(collection._id.toString()),
    ...progress,
  };
}

export async function queryCuratedCollections({
  search = "",
  category = "",
  mediaType = "",
  sort = "popularity",
  featured,
}) {
  await ensureCuratedCollectionsSeeded();

  const filter = {};
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } },
    ];
  }
  if (category && category !== "all") filter.category = category;
  if (mediaType && mediaType !== "all") filter.mediaType = mediaType;
  if (featured === "true") filter.featured = true;

  const sortMap = {
    popularity: { popularity: -1, totalItems: -1 },
    title: { title: 1 },
    newest: { createdAt: -1 },
    size: { totalItems: -1 },
  };

  return CuratedCollection.find(filter)
    .sort(sortMap[sort] || sortMap.popularity)
    .lean();
}
