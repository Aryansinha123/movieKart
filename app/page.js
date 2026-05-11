import HeroSection from "@/components/movie/HeroSection";
import TrendingMovies from "@/components/movie/TrendingMovies";
import SearchBar from "@/components/movie/SearchBar";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <HeroSection />

      <SearchBar />

      <TrendingMovies />
    </main>
  );
}