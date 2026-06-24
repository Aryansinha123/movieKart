"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Film,
  CheckCircle2,
  Pencil,
  Plus,
  Share2,
  Copy,
  Trash2,
  ListOrdered,
  ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";
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
    <section className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5 md:p-8">
      <h2 className="text-lg font-bold mb-4">Comments</h2>

      {comments.length === 0 && (
        <p className="text-sm text-zinc-500 mb-4">No comments yet. Be the first!</p>
      )}

      <ul className="space-y-4 mb-6">
        {comments.map((c) => (
          <li key={c._id} className="flex gap-3 border-b border-zinc-800/60 pb-4 last:border-0">
            {/* Avatar initial */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white select-none">
              {c.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-white">{c.username}</span>
                {c.createdAt && (
                  <span className="text-[11px] text-zinc-600">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
                {c.body}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {token ? (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-sm resize-none focus:outline-none focus:border-purple-500/50 transition-colors placeholder:text-zinc-600"
            placeholder="Add a comment…"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600">{body.length}/2000</span>
            <button
              type="submit"
              disabled={!body.trim()}
              className="text-sm px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer transition-colors"
            >
              Post
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-zinc-500">Sign in to join the discussion.</p>
      )}
    </section>
  );
}

export default function CollectionViewPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
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
    const res = await fetch(`/api/collections/${id}`, { headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.collection;
  }

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const col = await loadCollection();
        setCollection(col);
        if (col?.name) document.title = `${col.name} | MovieKart`;
      } catch (e) {
        setError(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleReorder(movieIds) {
    const token = getToken();
    try {
      const res = await fetch(`/api/collections/${id}/movies`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ movies: movieIds }),
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
    const endpoint = collection.isOwner
      ? `/api/collections/${id}/movies`
      : "/api/saved-collections/personalize";

    const body = collection.isOwner
      ? { movieId }
      : { collectionId: id, movieId, action: "remove" };

    try {
      const res = await fetch(endpoint, {
        method: collection.isOwner ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Removed");
      const col = await loadCollection();
      setCollection(col);
    } catch (e) {
      toast.error(e.message || "Failed to remove");
    }
  }

  async function handleAddMovie() {
    const movieId = Number(addMovieId);
    if (!Number.isFinite(movieId)) {
      toast.error("Enter a valid TMDB movie ID");
      return;
    }
    const token = getToken();
    const endpoint = collection.isOwner
      ? `/api/collections/${id}/movies`
      : "/api/saved-collections/personalize";

    const body = collection.isOwner
      ? { movieId }
      : { collectionId: id, movieId, action: "add" };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Added");
      setAddMovieId("");
      const col = await loadCollection();
      setCollection(col);
    } catch (e) {
      toast.error(e.message || "Failed to add");
    }
  }

  async function handleDuplicate() {
    const token = getToken();
    try {
      const res = await fetch(`/api/collections/${id}/duplicate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Collection duplicated!");
      window.location.href = `/collection/view/${data.collection._id}`;
    } catch (e) {
      toast.error(e.message || "Failed to duplicate");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${collection.name}"?`)) return;
    const token = getToken();
    try {
      const res = await fetch(`/api/collections/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Collection deleted");
      window.location.href = "/collections";
    } catch (e) {
      toast.error(e.message || "Failed to delete");
    }
  }

  async function handleShare() {
    const token = getToken();
    if (collection.isOwner && collection.isPublic) {
      if (!collection.shareEnabled) {
        const res = await fetch(`/api/collections/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ shareEnabled: true }),
        });
        const data = await res.json();
        if (data.success && data.collection?.shareToken) {
          const url = `${window.location.origin}/collection/share/${data.collection.shareToken}`;
          await navigator.clipboard.writeText(url).catch(() => {});
          toast.success("Share link copied!");
          return;
        }
      }
      if (collection.shareToken) {
        const url = `${window.location.origin}/collection/share/${collection.shareToken}`;
        await navigator.clipboard.writeText(url).catch(() => {});
        toast.success("Share link copied!");
        return;
      }
    }
    const url = `${window.location.origin}/collection/view/${id}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success("Link copied!");
  }

  async function handleRemoveFromLibrary() {
    const token = getToken();
    try {
      const res = await fetch(`/api/saved-collections?collectionId=${id}`, {
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
        <p className="text-red-400">{error || "Not found"}</p>
      </main>
    );
  }

  const owner = collection.owner;
  const isOwner = collection.isOwner;
  const isSaved = collection.saved && !isOwner;
  const canEdit = isOwner || isSaved;
  const gradient = getBannerGradient(collection.bannerStyle);

  return (
    <main className="min-h-screen bg-black text-white pb-20">
      <div className="relative h-[40vh] md:h-[50vh] overflow-hidden">
        <CollectionCoverBanner
          src={collection.bannerUrl}
          alt={collection.name}
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
            Collections
          </Link>

          <span className="inline-block w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 border border-white/15 text-zinc-300 mb-3">
            {collection.category || "Custom"}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 max-w-3xl">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="text-zinc-300 max-w-2xl text-sm md:text-base leading-relaxed mb-4">
              {collection.description}
            </p>
          )}
          <p className="text-zinc-500 text-sm mb-4">
            {collection.isPublic ? "Public" : "Private"} ·{" "}
            {owner?.username && !isOwner ? (
              <>
                by{" "}
                <Link href={`/profile/${owner.username}`} className="text-purple-400 hover:text-purple-300">
                  {owner.username}
                </Link>
              </>
            ) : isOwner ? (
              "Your collection"
            ) : null}
            {isSaved && <span className="text-purple-400 ml-2">· Saved copy</span>}
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Film size={14} />
              {collection.totalCount} titles
            </span>
            {collection.totalRuntimeFormatted && (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} />
                {collection.totalRuntimeFormatted} total
              </span>
            )}
            {collection.watchedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-green-400">
                <CheckCircle2 size={14} />
                {collection.watchedCount} of {collection.totalCount} watched
              </span>
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

            {isOwner && (
              <>
                <button
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all cursor-pointer"
                >
                  <Pencil size={16} />
                  Edit
                </button>
                <button
                  onClick={() => setReorderMode(!reorderMode)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    reorderMode ? "bg-purple-600 border-purple-500" : "bg-white/8 hover:bg-white/14 border-white/15"
                  }`}
                >
                  <ListOrdered size={16} />
                  {reorderMode ? "Done" : "Reorder"}
                </button>
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all cursor-pointer"
                >
                  <Share2 size={16} />
                  Share
                </button>
                <button
                  onClick={handleDuplicate}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all cursor-pointer"
                >
                  <Copy size={16} />
                  Duplicate
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold transition-all cursor-pointer"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </>
            )}

            {isSaved && (
              <>
                <button
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all cursor-pointer"
                >
                  <ImageIcon size={16} />
                  Personalize
                </button>
                <button
                  onClick={() => setReorderMode(!reorderMode)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    reorderMode ? "bg-purple-600 border-purple-500" : "bg-white/8 hover:bg-white/14 border-white/15"
                  }`}
                >
                  <ListOrdered size={16} />
                  Reorder
                </button>
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all cursor-pointer"
                >
                  <Share2 size={16} />
                  Share
                </button>
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

      <section className="max-w-[1600px] mx-auto px-6 md:px-10 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            Watch Order
            <span className="text-zinc-500 font-normal text-sm ml-2">({collection.movies?.length || 0})</span>
          </h2>
          {canEdit && reorderMode && (
            <div className="flex items-center gap-2">
              <input
                value={addMovieId}
                onChange={(e) => setAddMovieId(e.target.value)}
                placeholder="TMDB ID..."
                className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none w-32"
              />
              <button
                onClick={handleAddMovie}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm font-semibold cursor-pointer"
              >
                <Plus size={14} />
                Add Movie
              </button>
            </div>
          )}
        </div>

        {collection.movies?.length > 0 ? (
          reorderMode && canEdit ? (
            <DraggableMovieList
              movies={collection.movies}
              onReorder={handleReorder}
              onRemove={handleRemoveMovie}
              canEdit
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {collection.movies.map((movie, index) => (
                <div key={movie.id} className="relative">
                  <div className="absolute top-2 left-2 z-10 min-w-[1.5rem] h-6 px-1.5 rounded-full bg-black/70 backdrop-blur-sm text-[11px] font-bold text-white flex items-center justify-center border border-white/10">
                    {index + 1}
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
          )
        ) : (
          <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
            <p>This collection is empty.</p>
            {canEdit && (
              <p className="text-sm mt-2">Use &quot;Reorder&quot; mode to add movies by TMDB ID, or add from any movie page.</p>
            )}
          </div>
        )}
      </section>

      {collection.isPublic && (
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 pb-4">
          <CollectionComments collectionMongoId={id} />
        </div>
      )}

      {editOpen && (
        <CollectionEditModal
          collection={collection}
          isPersonalized={isSaved}
          personalizeEndpoint={isSaved ? "/api/saved-collections/personalize" : undefined}
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
