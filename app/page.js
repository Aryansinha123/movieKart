import HomeClient from "@/components/home/HomeClient";
import { SITE_NAME } from "@/lib/seo.config";

export const metadata = {
  title: "MovieKart | Watch Movies, TV Shows & Trailers",
  description: "Discover thousands of movies and TV shows. Watch trailers, explore ratings, cast, reviews, recommendations, and trending entertainment only on MovieKart.",
  keywords: [
    "MovieKart",
    "Movies",
    "TV Shows",
    "Trailers",
    "Trending Movies",
    "Watch Movies",
    "AI Recommendations"
  ],
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return <HomeClient />;
}