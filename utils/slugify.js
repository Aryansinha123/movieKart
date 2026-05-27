export function slugify(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")     // Replace spaces with -
    .replace(/[^\w-]+/g, "")   // Remove all non-word chars
    .replace(/--+/g, "-");    // Replace multiple - with single -
}

export function getMovieUrl(id, title) {
  if (!title) return `/movie/${id}`;
  return `/movie/${id}-${slugify(title)}`;
}

export function getPersonUrl(id, name) {
  if (!name) return `/person/${id}`;
  return `/person/${slugify(name)}`;
}
