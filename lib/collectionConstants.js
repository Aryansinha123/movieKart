export const COLLECTION_CATEGORIES = [
  "Custom",
  "Franchise",
  "Essentials",
  "Genre",
  "Director",
  "Decade",
  "TV",
  "Curated",
];

export const BANNER_GRADIENTS = [
  { id: "purple-cyan", label: "Aurora", class: "from-purple-900 via-violet-800 to-cyan-900" },
  { id: "rose-amber", label: "Sunset", class: "from-rose-900 via-orange-800 to-amber-900" },
  { id: "emerald-teal", label: "Forest", class: "from-emerald-900 via-green-800 to-teal-900" },
  { id: "blue-indigo", label: "Ocean", class: "from-blue-900 via-indigo-800 to-slate-900" },
  { id: "fuchsia-pink", label: "Neon", class: "from-fuchsia-900 via-pink-800 to-rose-900" },
  { id: "zinc", label: "Midnight", class: "from-zinc-900 via-zinc-800 to-black" },
];

export const THEME_COLORS = [
  "#a855f7",
  "#06b6d4",
  "#f43f5e",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
];

export function getBannerGradient(bannerStyle = {}) {
  if (bannerStyle?.gradient) {
    const found = BANNER_GRADIENTS.find((g) => g.id === bannerStyle.gradient);
    if (found) return found.class;
  }
  return "from-zinc-800 to-black";
}
