import Link from "next/link";

export const metadata = {
  title: "Page Not Found | MovieKart",
  description: "The page you are looking for does not exist.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500">
          404
        </h1>
        <h2 className="text-3xl font-bold">Lost in Space?</h2>
        <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
          We couldn’t find the page you’re looking for. It might have been moved, deleted, or never existed in the first place.
        </p>
        <div>
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold px-8 py-3 rounded-xl transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
