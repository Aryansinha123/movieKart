"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
        {err}
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-400">Loading…</p>
      </main>
    );
  }

  const owner = data.ownerId;

  return (
    <main className="min-h-screen bg-black text-white px-8 py-12 max-w-3xl mx-auto">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">Shared collection</p>
      <h1 className="text-3xl font-bold mt-2">{data.name}</h1>
      <p className="text-zinc-400 mt-2">
        Curated by{" "}
        {owner?.username ? (
          <Link href={`/profile/${owner.username}`} className="text-purple-300 hover:underline">
            {owner.username}
          </Link>
        ) : (
          "a MovieKart user"
        )}
      </p>
      <div className="mt-8 flex flex-wrap gap-2">
        {(data.movies || []).map((id) => (
          <Link
            key={id}
            href={`/movie/${id}`}
            className="text-sm px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-purple-500/40"
          >
            Open movie #{id}
          </Link>
        ))}
      </div>
      <Link href="/" className="inline-block mt-10 text-sm text-zinc-400 hover:text-white">
        ← Back to home
      </Link>
    </main>
  );
}
