"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Film,
  CheckCircle2,
  Plus,
  Share2,
  Trash2,
  ListOrdered,
  ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import SaveCuratedButton from "@/components/collection/SaveCuratedButton";
import CollectionCoverBanner from "@/components/collection/CollectionCoverBanner";
import WatchNowButton from "@/components/collection/WatchNowButton";
import DraggableMovieList from "@/components/collection/DraggableMovieList";
import CollectionEditModal from "@/components/collection/CollectionEditModal";
import MovieCard from "@/components/movie/MovieCard";
import { getBannerGradient } from "@/lib/collectionConstants";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export default function CollectionDetailPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [addMovieId, setAddMovieId] = useState("");

  async function loadCollection() {
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`/api/curated-collections/${slug}`, { headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.collection;
  }

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const col = await loadCollection();
        setCollection(col);
        if (col?.title) document.title = `${col.title} | MovieKart Collections`;
      } catch (e) {
        setError(e.message || "Failed to load collection");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  async function handleReorder(movieIds) {
    if (!collection.canPersonalize) return;
    const token = getToken();
    try {
      const res = await fetch("/api/curated-collections/saved/personalize", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slug, movies: movieIds }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      const col = await loadCollection();
      setCollection(col);
    } catch (e) {
      toast.error(e.message || "Failed to reorder");
    }
  }

  async function handleRemoveMovie(movieId) {
    const token = getToken();
    try {
      const res = await fetch("/api/curated-collections/saved/personalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slug, movieId, action: "remove" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Removed from your copy");
      const col = await loadCollection();
      setCollection(col);
    } catch (e) {
      toast.error(e.message || "Failed to remove");
    }
  }

  async function handleAddMovie() {
    const id = Number(addMovieId);
    if (!Number.isFinite(id)) {
      toast.error("Enter a valid TMDB movie ID");
      return;
    }
    const token = getToken();
    try {
      const res = await fetch("/api/curated-collections/saved/personalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slug, movieId: id, action: "add" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Added to your copy");
      setAddMovieId("");
      const col = await loadCollection();
      setCollection(col);
    } catch (e) {
      toast.error(e.message || "Failed to add");
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/collections/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    } catch {
      toast.success(`Share: ${url}`);
    }
  }

  async function handleRemoveFromLibrary() {
    const token = getToken();
    try {
      const res = await fetch(`/api/curated-collections/saved?slug=${slug}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Removed from library");
      window.location.href = "/collections";
    } catch (e) {
      toast.error(e.message || "Failed to remove");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
      </main>
    );
  }

  if (error || !collection) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Collection not found"}</p>
          <Link href="/collections" className="text-purple-400 hover:underline text-sm">
            ← Back to Collections
          </Link>
        </div>
      </main>
    );
  }

  const gradient = getBannerGradient(collection.bannerStyle);
  const canPersonalize = collection.saved && collection.canPersonalize;

  return (
    <main className="min-h-screen bg-black text-white pb-20">
      <div className="relative h-[45vh] md:h-[55vh] overflow-hidden">
        <CollectionCoverBanner
          src={collection.bannerUrl || collection.coverImage}
          alt={collection.title}
          gradient={gradient}
          bannerStyle={collection.bannerStyle}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <div className="relative h-full max-w-[1600px] mx-auto px-6 md:px-10 flex flex-col justify-end pb-10">
          <Link
            href="/collections"
            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-6 transition-colors w-fit"
          >
            <ArrowLeft size={14} />
            All Collections
          </Link>

          <span className="inline-block w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 border border-white/15 text-zinc-300 mb-3">
            {collection.category}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 max-w-3xl">
            {collection.title}
          </h1>
          <p className="text-zinc-300 max-w-2xl text-sm md:text-base leading-relaxed mb-6">
            {collection.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Film size={14} />
              {collection.totalCount} titles
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} />
              {collection.totalRuntimeFormatted} total
            </span>
            {collection.watchedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-green-400">
                <CheckCircle2 size={14} />
                {collection.watchedCount} of {collection.totalCount} watched
              </span>
            )}
            {collection.isPersonalized && (
              <span className="text-purple-400 text-xs font-semibold">Personalized copy</span>
            )}
          </div>

          {collection.totalCount > 0 && (
            <div className="max-w-md mb-6">
              <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                <span>{collection.progressPercentage}% Complete</span>
                <span>{collection.watchedCount}/{collection.totalCount}</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${collection.progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <WatchNowButton
              collection={collection}
              items={collection.items}
              nextUnwatched={collection.nextUnwatched}
              progressPercentage={collection.progressPercentage}
              watchedCount={collection.watchedCount}
              totalCount={collection.totalCount}
              size="large"
            />
            <SaveCuratedButton slug={collection.slug} saved={collection.saved} />
            {collection.saved && (
              <>
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all cursor-pointer"
                >
                  <Share2 size={16} />
                  Share
                </button>
                {canPersonalize && (
                  <>
                    <button
                      onClick={() => setEditOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all cursor-pointer"
                    >
                      <ImageIcon size={16} />
                      Banner
                    </button>
                    <button
                      onClick={() => setReorderMode(!reorderMode)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        reorderMode
                          ? "bg-purple-600 border-purple-500 text-white"
                          : "bg-white/8 hover:bg-white/14 border-white/15"
                      }`}
                    >
                      <ListOrdered size={16} />
                      {reorderMode ? "Done Reordering" : "Reorder"}
                    </button>
                  </>
                )}
                <button
                  onClick={handleRemoveFromLibrary}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold transition-all cursor-pointer"
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {collection.tags?.length > 0 && (
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-4 flex flex-wrap gap-2">
          {collection.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-xs bg-zinc-900 border border-zinc-800 text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <section className="max-w-[1600px] mx-auto px-6 md:px-10 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            Watch Order
            <span className="text-zinc-500 font-normal text-sm ml-2">({collection.movies?.length || 0})</span>
          </h2>
          {canPersonalize && reorderMode && (
            <div className="flex items-center gap-2">
              <input
                value={addMovieId}
                onChange={(e) => setAddMovieId(e.target.value)}
                placeholder="TMDB ID to add..."
                className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none w-36"
              />
              <button
                onClick={handleAddMovie}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm font-semibold cursor-pointer"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          )}
        </div>

        {reorderMode && canPersonalize ? (
          <DraggableMovieList
            movies={collection.movies}
            onReorder={handleReorder}
            onRemove={handleRemoveMovie}
            canEdit
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {collection.movies?.map((movie) => (
              <div key={`${movie.orderIndex}-${movie.id}`} className="relative">
                <div className="absolute top-2 left-2 z-10 min-w-[1.5rem] h-6 px-1.5 rounded-full bg-black/70 backdrop-blur-sm text-[11px] font-bold text-white flex items-center justify-center border border-white/10">
                  {(movie.orderIndex ?? 0) + 1}
                </div>
                {movie.watched && (
                  <div className="absolute top-2 right-2 z-10 p-1 rounded-full bg-green-500/90 text-black">
                    <CheckCircle2 size={14} />
                  </div>
                )}
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        )}
      </section>

      {collection.plannedTitles?.length > 0 && (
        <section className="max-w-[1600px] mx-auto px-6 md:px-10 pt-10 pb-4">
          <h2 className="text-xl font-bold mb-4">
            Upcoming / TBD
            <span className="text-zinc-500 font-normal text-sm ml-2">({collection.plannedTitles.length})</span>
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {collection.plannedTitles.map((title) => (
              <li
                key={title}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
              >
                <span className="h-2 w-2 rounded-full bg-amber-500/80 shrink-0" />
                {title}
              </li>
            ))}
          </ul>
        </section>
      )}

      {editOpen && canPersonalize && (
        <CollectionEditModal
          collection={collection}
          isPersonalized
          personalizeEndpoint="/api/curated-collections/saved/personalize"
          onClose={() => setEditOpen(false)}
          onSaved={async () => {
            const col = await loadCollection();
            setCollection(col);
          }}
        />
      )}
    </main>
  );
}
