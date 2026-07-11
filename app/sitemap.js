import { SITE_URL } from "@/lib/seo.config";
import { slugify } from "@/utils/slugify";
import { connectDB } from "@/lib/mongodb";
import Collection from "@/models/Collection";

async function fetchWithRetry(url, init, { retries = 2, timeoutMs = 8000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
    }
  }
  throw lastError;
}

export default async function sitemap() {
  const now = new Date().toISOString();
  const routes = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/collections`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // 1. Fetch Trending & Popular Movies/TV Shows to index
  if (process.env.TMDB_API_KEY) {
    try {
      const [trendingMoviesRes, popularTvRes] = await Promise.all([
        fetchWithRetry(`https://api.themoviedb.org/3/trending/movie/week`, {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}`, accept: "application/json" },
          next: { revalidate: 3600 },
        }),
        fetchWithRetry(`https://api.themoviedb.org/3/tv/popular`, {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}`, accept: "application/json" },
          next: { revalidate: 3600 },
        }),
      ]);

      const trendingMovies = trendingMoviesRes.ok ? await trendingMoviesRes.json() : { results: [] };
      const popularTv = popularTvRes.ok ? await popularTvRes.json() : { results: [] };

      // Add movie detail pages
      trendingMovies.results?.slice(0, 50).forEach((movie) => {
        const slug = slugify(movie.title);
        if (slug) {
          routes.push({
            url: `${SITE_URL}/movie/${slug}`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.7,
          });
        }
      });

      // Add TV show detail pages
      popularTv.results?.slice(0, 30).forEach((tv) => {
        const slug = slugify(tv.name);
        if (slug) {
          routes.push({
            url: `${SITE_URL}/movie/${slug}`, // TV shows are also served under /movie/[id] in this app
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.7,
          });
        }
      });
    } catch (e) {
      console.error("Error fetching sitemap dynamic TMDB items:", e);
    }
  }

  // 2. Fetch Public Collections from MongoDB database
  try {
    await connectDB();
    const publicCollections = await Collection.find({ visibility: "public" })
      .select("slug updatedAt")
      .limit(50)
      .lean();

    publicCollections.forEach((col) => {
      if (col.slug) {
        routes.push({
          url: `${SITE_URL}/collection/${col.slug}`,
          lastModified: col.updatedAt ? new Date(col.updatedAt).toISOString() : now,
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
    });
  } catch (e) {
    console.error("Error loading sitemap collection items:", e);
  }

  return routes;
}
