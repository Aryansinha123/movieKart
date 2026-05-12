"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

import MovieCard from "@/components/movie/MovieCard";

function CollectionMovieCard({ movieId }) {
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

export default function PublicCollectionViewPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/collections/public/${id}`, { cache: "no-store" });
        const j = await res.json();
        if (!j.success) throw new Error(j.message || "Not found");
        setData(j.collection);
      } catch (e) {
        setErr(e.message || "Failed to load");
      }
    })();
  }, [id]);

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
    <main className="min-h-screen bg-black text-white px-8 py-12 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">{data.name}</h1>
      <p className="text-zinc-400 mt-2 text-lg">
        Public Collection ·{" "}
        {owner?.username ? (
          <Link href={`/profile/${owner.username}`} className="text-purple-400 hover:text-purple-300 transition-colors font-medium">
            {owner.username}
          </Link>
        ) : null}
      </p>
      
      {data.movies?.length > 0 ? (
        <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {data.movies.map((mid) => (
            <CollectionMovieCard key={mid} movieId={mid} />
          ))}
        </div>
      ) : (
        <div className="mt-10 p-8 border border-zinc-800/50 rounded-xl bg-zinc-900/30 text-center">
          <p className="text-zinc-500">This collection is currently empty.</p>
        </div>
      )}
      <CollectionComments collectionMongoId={id} />
      <Link href="/" className="inline-block mt-10 text-sm text-zinc-400 hover:text-white">
        ← Home
      </Link>
    </main>
  );
}

function CollectionComments({ collectionMongoId }) {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const token = getToken();

  async function load() {
    const res = await fetch(
      `/api/comments?targetType=collection&targetId=${collectionMongoId}`,
      { cache: "no-store" }
    );
    const j = await res.json();
    if (j.success) setComments(j.comments || []);
  }

  useEffect(() => {
    if (collectionMongoId) load();
  }, [collectionMongoId]);

  async function submit(e) {
    e.preventDefault();
    if (!token) return toast.error("Sign in to comment.");
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        targetType: "collection",
        targetId: collectionMongoId,
        body,
      }),
    });
    const j = await res.json();
    if (j.success) {
      setBody("");
      load();
      toast.success("Comment posted");
    } else toast.error(j.message || "Failed");
  }

  return (
    <section className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
      <h2 className="text-lg font-bold">Comments</h2>
      <ul className="mt-4 space-y-3">
        {comments.map((c) => (
          <li key={c._id} className="text-sm border-b border-zinc-800/80 pb-3">
            <span className="font-semibold text-white">{c.username}</span>
            <p className="text-zinc-300 mt-1 whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
      </ul>
      {token ? (
        <form onSubmit={submit} className="mt-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={2000}
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-sm"
            placeholder="Add a comment…"
          />
          <button
            type="submit"
            className="mt-2 text-sm px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 font-medium"
          >
            Post
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">Sign in to join the discussion.</p>
      )}
    </section>
  );
}
