export function slugify(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")     // Replace spaces with -
    .replace(/[^\w-]+/g, "")   // Remove all non-word chars
    .replace(/--+/g, "-")     // Replace multiple - with single -
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing -
}

export function getMovieUrl(id, title) {
  if (!id) return "/movie";
  const cleanTitle = title ? slugify(title) : "";
  if (!cleanTitle) return `/movie/${id}`;
  return `/movie/${cleanTitle}-${id}`;
}

export function getPersonUrl(id, name) {
  if (!name) return `/${id}`;
  return `/${slugify(name)}`;
}

export function parseMovieSlug(slug) {
  if (!slug) return { id: null, titleSlug: "" };

  // Match the ID at the end of the slug. Supports positive/negative numbers.
  const match = slug.match(/-(-?\d+)$/);
  if (match) {
    const id = parseInt(match[1], 10);
    const titleSlug = slug.substring(0, match.index);
    return { id, titleSlug };
  }

  // Fallback if the slug is purely a numeric ID
  if (/^-?\d+$/.test(slug)) {
    return { id: parseInt(slug, 10), titleSlug: "" };
  }

  return { id: null, titleSlug: slug };
}
