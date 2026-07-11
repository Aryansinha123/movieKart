export default function manifest() {
  return {
    name: "MovieKart",
    short_name: "MovieKart",
    description: "Discover thousands of movies and TV shows. Watch trailers, explore ratings, cast, reviews, and recommendations.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#111827",
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
