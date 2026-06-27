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
  MoreVertical,
  Search,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import CollectionCoverBanner from "@/components/collection/CollectionCoverBanner";
import WatchNowButton from "@/components/collection/WatchNowButton";
import DraggableMovieList from "@/components/collection/DraggableMovieList";
import CollectionEditModal from "@/components/collection/CollectionEditModal";
import MovieCard from "@/components/movie/MovieCard";
import CollectionSearchBar from "@/components/collection/CollectionSearchBar";
import AddMoviesModal from "@/components/collection/AddMoviesModal";
import { getBannerGradient } from "@/lib/collectionConstants";
import Fuse from "fuse.js";

const cleanString = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents/diacritics
    .replace(/[^a-z0-9]/g, ""); // remove spaces, punctuation, special characters
};

function HighlightedText({ text, query }) {
  if (!text) return null;
  if (!query || !query.trim()) return <span>{text}</span>;

  // Split query by spaces to highlight individual words/tokens
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return <span>{text}</span>;

  // Escape regex special chars
  const escapedWords = words.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"));
  
  // Try to match exact query as a contiguous phrase first if possible
  const fullEscaped = query.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`(${fullEscaped}|${escapedWords.join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-purple-500/40 text-purple-100 rounded px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

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

function DescriptionWithReadMore({ text }) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = text.length > 200;
  
  if (!shouldTruncate) {
    return (
      <p className="text-zinc-300 max-w-2xl text-sm md:text-base leading-relaxed mb-4">
        {text}
      </p>
    );
  }

  return (
    <p className="text-zinc-300 max-w-2xl text-sm md:text-base leading-relaxed mb-4">
      {expanded ? text : `${text.substring(0, 200)}... `}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-purple-400 hover:text-purple-300 ml-1 font-bold focus:outline-none inline cursor-pointer text-xs uppercase tracking-wider"
      >
        {expanded ? "Read Less" : "Read More"}
      </button>
    </p>
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
  const [actionsDropdownOpen, setActionsDropdownOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState("");
  const [debouncedLocalQuery, setDebouncedLocalQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLocalQuery(localQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery]);

  async function loadCollection() {
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`/api/collections/${id}`, { headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    if (data.collection?.slug && typeof window !== "undefined") {
      window.location.replace(`/collection/${data.collection.slug}`);
    }
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

  async function handleAddMovieById(movieId) {
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

  const filteredMovies = (() => {
    const movies = collection.movies || [];
    if (!debouncedLocalQuery.trim()) return movies;

    const q = debouncedLocalQuery.trim();
    const qLower = q.toLowerCase();
    const cq = cleanString(q);
    const queryWords = qLower.split(/\s+/).filter(Boolean);

    // Initialize and run Fuse.js search
    const fuse = new Fuse(movies, {
      keys: [
        { name: "title", weight: 0.5 },
        { name: "original_title", weight: 0.3 },
        { name: "genres.name", weight: 0.1 },
        { name: "release_date", weight: 0.1 }
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
      ignoreLocation: true
    });

    const fuseResults = fuse.search(q);
    const fuseMap = new Map(fuseResults.map(res => [res.item.id, res]));

    const scored = movies.map(movie => {
      const titleLower = (movie.title || "").toLowerCase().trim();
      const cleanTitle = cleanString(movie.title);
      const cleanOriginal = cleanString(movie.original_title);
      
      const isExact = titleLower === qLower;
      const isStartsWith = titleLower.startsWith(qLower);
      const containsAll = queryWords.length > 0 && queryWords.every(w => titleLower.includes(w));
      const isSubstring = cq.length >= 2 && (cleanTitle.includes(cq) || cleanOriginal.includes(cq));
      
      const fuseMatch = fuseMap.get(movie.id);
      const isFuzzy = !!fuseMatch;
      const fuzzyScore = fuseMatch ? (fuseMatch.score ?? 1) : 1;

      // Determine highest matching tier (smaller rank value = higher priority)
      let tier = 6; // no match
      if (isExact) tier = 1;
      else if (isStartsWith) tier = 2;
      else if (containsAll) tier = 3;
      else if (isSubstring) tier = 4;
      else if (isFuzzy) tier = 5;

      return {
        movie,
        tier,
        fuzzyScore
      };
    });

    // Filter matching movies
    const matches = scored.filter(item => item.tier < 6);

    // Sort by match tier (1 to 5), then by fuzzy match score
    matches.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.fuzzyScore - b.fuzzyScore;
    });

    // Attach displayTitle element for title highlighting
    return matches.map(item => {
      const copy = { ...item.movie };
      copy.displayTitle = <HighlightedText text={item.movie.title} query={q} />;
      return copy;
    });
  })();

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
            <DescriptionWithReadMore text={collection.description} />
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

          <div className="flex flex-wrap items-center gap-3">
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
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all cursor-pointer"
                >
                  <Pencil size={16} />
                  Edit
                </button>
                <button
                  onClick={() => setReorderMode(!reorderMode)}
                  className={`hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    reorderMode ? "bg-purple-600 border-purple-500" : "bg-white/8 hover:bg-white/14 border-white/15"
                  }`}
                >
                  <ListOrdered size={16} />
                  {reorderMode ? "Done" : "Reorder"}
                </button>
                <button
                  onClick={handleShare}
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all cursor-pointer"
                >
                  <Share2 size={16} />
                  Share
                </button>
                <button
                  onClick={handleDuplicate}
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all cursor-pointer"
                >
                  <Copy size={16} />
                  Duplicate
                </button>
                <button
                  onClick={handleDelete}
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold transition-all cursor-pointer"
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
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all cursor-pointer"
                >
                  <ImageIcon size={16} />
                  Personalize
                </button>
                <button
                  onClick={() => setReorderMode(!reorderMode)}
                  className={`hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    reorderMode ? "bg-purple-600 border-purple-500" : "bg-white/8 hover:bg-white/14 border-white/15"
                  }`}
                >
                  <ListOrdered size={16} />
                  Reorder
                </button>
                <button
                  onClick={handleShare}
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all cursor-pointer"
                >
                  <Share2 size={16} />
                  Share
                </button>
                <button
                  onClick={handleRemoveFromLibrary}
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold transition-all cursor-pointer"
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              </>
            )}

            {/* Mobile Actions Dropdown Menu */}
            {canEdit && (
              <div className="relative md:hidden shrink-0">
                <button
                  onClick={() => setActionsDropdownOpen(!actionsDropdownOpen)}
                  className="inline-flex items-center justify-center p-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all cursor-pointer text-zinc-300"
                  aria-label="More Actions"
                >
                  <MoreVertical size={18} />
                </button>
                {actionsDropdownOpen && (
                  <div className="absolute right-0 bottom-full mb-2 w-48 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-2 z-[999] space-y-1">
                    {isOwner && (
                      <>
                        <button
                          onClick={() => { setEditOpen(true); setActionsDropdownOpen(false); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-900 transition-colors flex items-center gap-2 text-white"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          onClick={() => { setReorderMode(!reorderMode); setActionsDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-900 transition-colors flex items-center gap-2 text-white ${reorderMode ? "text-purple-400 font-bold" : ""}`}
                        >
                          <ListOrdered size={14} /> {reorderMode ? "Done" : "Reorder"}
                        </button>
                        <button
                          onClick={() => { handleShare(); setActionsDropdownOpen(false); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-900 transition-colors flex items-center gap-2 text-white"
                        >
                          <Share2 size={14} /> Share
                        </button>
                        <button
                          onClick={() => { handleDuplicate(); setActionsDropdownOpen(false); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-900 transition-colors flex items-center gap-2 text-white"
                        >
                          <Copy size={14} /> Duplicate
                        </button>
                        <button
                          onClick={() => { handleDelete(); setActionsDropdownOpen(false); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-900 transition-colors flex items-center gap-2 text-red-400"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </>
                    )}
                    {isSaved && (
                      <>
                        <button
                          onClick={() => { setEditOpen(true); setActionsDropdownOpen(false); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-900 transition-colors flex items-center gap-2 text-white"
                        >
                          <ImageIcon size={14} /> Personalize
                        </button>
                        <button
                          onClick={() => { setReorderMode(!reorderMode); setActionsDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-900 transition-colors flex items-center gap-2 text-white ${reorderMode ? "text-purple-400 font-bold" : ""}`}
                        >
                          <ListOrdered size={14} /> Reorder
                        </button>
                        <button
                          onClick={() => { handleShare(); setActionsDropdownOpen(false); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-900 transition-colors flex items-center gap-2 text-white"
                        >
                          <Share2 size={14} /> Share
                        </button>
                        <button
                          onClick={() => { handleRemoveFromLibrary(); setActionsDropdownOpen(false); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-900 transition-colors flex items-center gap-2 text-red-400"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
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
        </div>

        {/* Sticky Search and Add Button Panel */}
        <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md py-4 border-b border-zinc-800/80 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-2xl">
            <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-500">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search in this collection by title, year, or genre..."
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-900 border border-zinc-850 text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/5 transition-all text-sm"
            />
            {localQuery && (
              <button
                onClick={() => setLocalQuery("")}
                className="absolute inset-y-0 right-3.5 flex items-center text-zinc-500 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {canEdit && (
            <button
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all cursor-pointer shadow-lg shadow-purple-650/10"
            >
              <Plus size={16} />
              Add Movie
            </button>
          )}
        </div>

        {canEdit && reorderMode && (
          <div className="w-full mb-8">
            <CollectionSearchBar
              onAddMovie={handleAddMovieById}
              existingMovieIds={collection.movies?.map(m => m.id) || []}
            />
          </div>
        )}

        {filteredMovies.length > 0 ? (
          reorderMode && canEdit ? (
            <DraggableMovieList
              movies={filteredMovies}
              onReorder={handleReorder}
              onRemove={handleRemoveMovie}
              canEdit
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {filteredMovies.map((movie) => {
                const originalIndex = (collection.movies || []).findIndex(m => m.id === movie.id);
                return (
                  <div key={movie.id} className="relative">
                    <div className="absolute top-2 left-2 z-10 min-w-[1.5rem] h-6 px-1.5 rounded-full bg-black/70 backdrop-blur-sm text-[11px] font-bold text-white flex items-center justify-center border border-white/10">
                      {originalIndex + 1}
                    </div>
                    {movie.watched && (
                      <div className="absolute top-2 right-2 z-10 p-1 rounded-full bg-green-500/90 text-black">
                        <CheckCircle2 size={14} />
                      </div>
                    )}
                    <MovieCard movie={movie} />
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
            <p>{localQuery ? "No movies found matching your search." : "This collection is empty."}</p>
            {canEdit && !localQuery && (
              <p className="text-sm mt-2">Use &quot;Add Movie&quot; button to add movies, or add from any movie page.</p>
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

      <AddMoviesModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAddMovie={handleAddMovieById}
        existingMovieIds={collection.movies?.map(m => m.id) || []}
      />
    </main>
  );
}
