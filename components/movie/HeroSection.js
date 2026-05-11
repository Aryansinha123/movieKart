export default function HeroSection() {
  return (
    <section className="h-[80vh] flex flex-col justify-center items-center text-center px-6">
      <h1 className="text-6xl font-extrabold max-w-5xl leading-tight">
        Build Your Personal Movie Universe 🎬
      </h1>

      <p className="text-zinc-400 mt-6 max-w-2xl text-lg">
        Track watched movies, create collections, share profiles,
        discover trending films, and get AI-powered recommendations.
      </p>

      <div className="flex gap-4 mt-8">
        <button className="bg-red-500 px-6 py-3 rounded-lg font-semibold hover:bg-red-600">
          Explore Movies
        </button>

        <button className="bg-zinc-800 px-6 py-3 rounded-lg font-semibold hover:bg-zinc-700">
          Create Collection
        </button>
      </div>
    </section>
  );
}