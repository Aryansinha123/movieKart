"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import MovieCard from "@/components/movie/MovieCard";

function SharedMovieCard({ movieId }) {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/movies/${movieId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.id) {
          setMovie(data);
        }
      })
      .finally(() => setLoading(false));
  }, [movieId]);

  if (loading) {
    return <div className="w-full h-[350px] bg-zinc-900 rounded-xl animate-pulse"></div>;
  }
  
  if (!movie) return null;

  return <MovieCard movie={movie} />;
}

export default function SharedCollectionPage() {
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : "";
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/collections/shared/${token}`, { cache: "no-store" });
        const j = await res.json();
        if (!j.success) throw new Error(j.message || "Not found");
        setData(j.collection);
      } catch (e) {
        setErr(e.message || "Failed to load");
      }
    })();
  }, [token]);

  if (err) {
    return (
      <main className="min-h-screen bg-black text-white px-8 py-16 text-center text-red-400">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p className="bg-zinc-900/50 p-4 rounded-xl border border-red-500/20 inline-block">{err}</p>
        <div className="mt-8">
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
            Return to Home
          </Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 font-medium">Loading collection…</p>
        </div>
      </main>
    );
  }

  const owner = data.ownerId;

  return (
    <main className="min-h-screen bg-black text-white px-8 py-12 max-w-7xl mx-auto">
      <div className="space-y-2 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-widest">
          Shared collection
        </div>
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          {data.name}
        </h1>
        <p className="text-zinc-400 text-lg">
          Curated by{" "}
          {owner?.username ? (
            <Link href={`/profile/${owner.username}`} className="text-white hover:text-purple-400 transition-colors font-bold underline decoration-purple-500/30 underline-offset-4">
              {owner.username}
            </Link>
          ) : (
            <span className="font-bold">a MovieKart user</span>
          )}
        </p>
      </div>

      {data.movies?.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {(data.movies || []).map((id) => (
            <SharedMovieCard key={id} movieId={id} />
          ))}
        </div>
      ) : (
        <div className="p-20 border-2 border-dashed border-zinc-800 rounded-3xl text-center">
          <p className="text-zinc-500 text-xl font-medium">This collection is currently empty.</p>
        </div>
      )}

      <div className="mt-16 pt-8 border-t border-zinc-800">
        <LinkNext href="/" className="group inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors">
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          Discover more on MovieKart
        </LinkNext>
      </div>
    </main>
  );
}
