"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  X,
  Heart,
  Eye,
  Users,
  Calendar,
  Shield,
  Check,
  Send,
  Sparkles,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import CollectionCoverBanner from "@/components/collection/CollectionCoverBanner";
import WatchNowButton from "@/components/collection/WatchNowButton";
import DraggableMovieList from "@/components/collection/DraggableMovieList";
import CollectionEditModal from "@/components/collection/CollectionEditModal";
import MovieCard from "@/components/movie/MovieCard";
import CollectionSearchBar from "@/components/collection/CollectionSearchBar";
import AddMoviesModal from "@/components/collection/AddMoviesModal";
import SaveCuratedButton from "@/components/collection/SaveCuratedButton";
import { getBannerGradient } from "@/lib/collectionConstants";
import Fuse from "fuse.js";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

// ----------------------------------------------------
// Comments Component
// ----------------------------------------------------
function CollectionComments({ collectionMongoId, isPublic }) {
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
    if (collectionMongoId && isPublic) load();
  }, [collectionMongoId, isPublic]);

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

  if (!isPublic) return null;

  return (
    <section className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5 md:p-8">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <MessageSquare size={18} className="text-purple-400" />
        Comments
      </h2>

      {comments.length === 0 && (
        <p className="text-sm text-zinc-500 mb-4">No comments yet. Be the first!</p>
      )}

      <ul className="space-y-4 mb-6">
        {comments.map((c) => (
          <li key={c._id} className="flex gap-3 border-b border-zinc-800/60 pb-4 last:border-0">
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

// ----------------------------------------------------
// Highlighted Text (Search)
// ----------------------------------------------------
function HighlightedText({ text, query }) {
  if (!text) return null;
  if (!query || !query.trim()) return <span>{text}</span>;

  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return <span>{text}</span>;

  const escapedWords = words.map((w) => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"));
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

const cleanString = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
};

// ----------------------------------------------------
// Main Collection Detail Page
// ----------------------------------------------------
export default function UniversalCollectionPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const [isCurated, setIsCurated] = useState(false);
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit / Reorder modes
  const [editOpen, setEditOpen] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [addMovieId, setAddMovieId] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [actionsDropdownOpen, setActionsDropdownOpen] = useState(false);

  // Search in movies
  const [localQuery, setLocalQuery] = useState("");
  const [debouncedLocalQuery, setDebouncedLocalQuery] = useState("");

  // Stats / Social States
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [followed, setFollowed] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [likeAnimating, setLikeAnimating] = useState(false);

  // Share Dialog State
  const [shareOpen, setShareOpen] = useState(false);

  // Collaborators & Timeline States
  const [collaborators, setCollaborators] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [inviteTarget, setInviteTarget] = useState("");
  const [inviting, setInviting] = useState(false);
  const [pendingInvite, setPendingInvite] = useState(null); // invite for current user on this collection

  // Auto-refresh timer for simulated real-time updates
  const [lastLoadedTime, setLastLoadedTime] = useState(new Date());

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLocalQuery(localQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery]);

  const loadData = useCallback(async () => {
    if (!slug) return;
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      // 1. Try loading custom collection first
      const userColRes = await fetch(`/api/collections/${slug}`, { headers });
      const userColData = await userColRes.json();

      if (userColData.success) {
        setIsCurated(false);
        setCollection(userColData.collection);
        setLiked(userColData.collection.likedByMe || false);
        setLikesCount(userColData.collection.stats?.likes || 0);
        setFollowed(userColData.collection.followedByMe || false);
        setFollowersCount(userColData.collection.stats?.followers || 0);
        setCollaborators(userColData.collection.collaborators || []);
        setLastLoadedTime(new Date());
        
        // Fetch activity timeline
        const actRes = await fetch(`/api/collections/activity?collectionId=${userColData.collection._id}`);
        const actData = await actRes.json();
        if (actData.success) {
          setTimeline(actData.activities || []);
        }

        // Check for a pending invite for the current user
        const token = getToken();
        if (token) {
          try {
            const invRes = await fetch("/api/collections/collaborators", {
              headers: { Authorization: `Bearer ${token}` },
            });
            const invData = await invRes.json();
            if (invData.success && Array.isArray(invData.invites)) {
              const thisInvite = invData.invites.find(
                (inv) => inv.collectionId?._id?.toString() === userColData.collection._id?.toString()
                  || inv.collectionId?.toString() === userColData.collection._id?.toString()
              );
              setPendingInvite(thisInvite || null);
            }
          } catch (_) {}
        }

        if (userColData.collection.name) {
          document.title = `${userColData.collection.name} | MovieKart`;
        }
        return;
      }

      // 2. Try loading curated collection fallback
      const curatedRes = await fetch(`/api/curated-collections/${slug}`, { headers });
      const curatedData = await curatedRes.json();

      if (curatedData.success) {
        setIsCurated(true);
        setCollection(curatedData.collection);
        if (curatedData.collection.title) {
          document.title = `${curatedData.collection.title} | MovieKart Collections`;
        }
      } else {
        throw new Error(userColData.message || curatedData.message || "Collection not found.");
      }
    } catch (e) {
      setError(e.message || "Failed to load collection");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time updates: poll details every 8 seconds if collaborative
  useEffect(() => {
    if (isCurated || !collection || loading) return;
    if (collection.visibility !== "collaborative_private" && collection.collaborators?.length === 0) return;

    const interval = setInterval(() => {
      loadData();
    }, 8000);

    return () => clearInterval(interval);
  }, [collection, isCurated, loading, loadData]);

  // ----------------------------------------------------
  // Interactive Actions
  // ----------------------------------------------------
  async function handleLike() {
    const token = getToken();
    if (!token) return toast.error("Sign in to like this collection.");
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 500);

    try {
      const res = await fetch("/api/collection-likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ collectionId: collection._id || collection.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setLiked(data.liked);
      setLikesCount(data.likesCount);
      toast.success(data.liked ? "Liked!" : "Unliked");
    } catch (e) {
      toast.error(e.message || "Failed to like");
    }
  }

  async function handleFollow() {
    const token = getToken();
    if (!token) return toast.error("Sign in to follow this collection.");

    try {
      const res = await fetch("/api/collections/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ collectionId: collection._id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setFollowed(data.followed);
      setFollowersCount(data.followersCount);
      toast.success(data.followed ? "Following collection" : "Unfollowed collection");
    } catch (e) {
      toast.error(e.message || "Failed to follow");
    }
  }

  async function handleRespondToInvite(action) {
    const token = getToken();
    if (!token || !pendingInvite) return;
    try {
      const res = await fetch("/api/collections/collaborators", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          collectionId: collection._id,
          action,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success(action === "accept" ? "Invitation accepted! You are now a collaborator." : "Invitation declined.");
      setPendingInvite(null);
      loadData();
    } catch (e) {
      toast.error(e.message || "Failed to respond to invitation");
    }
  }

  // ----------------------------------------------------
  // Share & Native Share API
  // ----------------------------------------------------
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/collection/${slug}` : "";

  async function triggerNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: collection.name || collection.title,
          text: collection.description || "Check out this movie collection on MovieKart!",
          url: shareUrl,
        });
        toast.success("Shared successfully!");
      } catch (e) {
        // ignore abort
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    }
  }

  function getShareLink(type) {
    const text = encodeURIComponent(
      `Check out this collection: "${collection.name || collection.title}" on MovieKart!`
    );
    const url = encodeURIComponent(shareUrl);

    switch (type) {
      case "twitter":
        return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
      case "facebook":
        return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      case "whatsapp":
        return `https://api.whatsapp.com/send?text=${text}%20${url}`;
      case "telegram":
        return `https://t.me/share/url?url=${url}&text=${text}`;
      case "reddit":
        return `https://www.reddit.com/submit?url=${url}&title=${text}`;
      default:
        return "";
    }
  }

  // ----------------------------------------------------
  // Collaborator Tool Actions (Owner)
  // ----------------------------------------------------
  async function handleInviteCollaborator(e) {
    e.preventDefault();
    if (!inviteTarget.trim()) return;
    const token = getToken();
    setInviting(true);

    try {
      const res = await fetch("/api/collections/collaborators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          collectionId: collection._id,
          action: "invite",
          target: inviteTarget.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      toast.success("Invitation sent successfully!");
      setInviteTarget("");
      loadData();
    } catch (e) {
      toast.error(e.message || "Failed to invite collaborator");
    } finally {
      setInviting(false);
    }
  }

  async function handleRevokeCollaborator(targetUserId) {
    if (!confirm("Are you sure you want to revoke edit access for this collaborator?")) return;
    const token = getToken();

    try {
      const res = await fetch("/api/collections/collaborators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          collectionId: collection._id,
          action: "remove",
          targetUserId,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      toast.success("Collaborator access revoked.");
      loadData();
    } catch (e) {
      toast.error(e.message || "Failed to revoke collaborator");
    }
  }

  async function handleTransferOwnership(targetUserId) {
    if (!confirm("WARNING: Are you sure you want to transfer ownership? You will lose full control.")) return;
    const token = getToken();

    try {
      const res = await fetch("/api/collections/collaborators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          collectionId: collection._id,
          action: "transfer",
          targetUserId,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      toast.success("Ownership transferred!");
      loadData();
    } catch (e) {
      toast.error(e.message || "Failed to transfer ownership");
    }
  }

  // ----------------------------------------------------
  // Movie Add / Delete / Reorder Actions
  // ----------------------------------------------------
  async function handleReorder(movieIds) {
    const token = getToken();
    const endpoint = isCurated
      ? "/api/curated-collections/saved/personalize"
      : `/api/collections/${collection._id}/movies`;

    const body = isCurated
      ? { slug, movies: movieIds }
      : { movies: movieIds, version: collection.updatedAt };

    try {
      const res = await fetch(endpoint, {
        method: isCurated ? "PUT" : "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.error("Conflict detected: This collection was updated by another collaborator. Please refresh.");
        return;
      }
      if (!data.success) throw new Error(data.message);
      loadData();
    } catch (e) {
      toast.error(e.message || "Failed to reorder");
    }
  }

  async function handleRemoveMovie(movieId) {
    const token = getToken();
    const isOwner = collection.isOwner;
    const endpoint = isCurated
      ? "/api/curated-collections/saved/personalize"
      : isOwner
      ? `/api/collections/${collection._id}/movies`
      : `/api/collections/${collection._id}/movies`;

    const body = isCurated
      ? { slug, movieId, action: "remove" }
      : { movieId, version: collection.updatedAt };

    try {
      const res = await fetch(endpoint, {
        method: isCurated ? "POST" : "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.error("Conflict detected: This collection was updated by another collaborator. Please refresh.");
        return;
      }
      if (!data.success) throw new Error(data.message);
      toast.success("Removed");
      loadData();
    } catch (e) {
      toast.error(e.message || "Failed to remove");
    }
  }

  async function handleAddMovieById(movieId) {
    const token = getToken();
    const isOwner = collection.isOwner;
    const endpoint = isCurated
      ? "/api/curated-collections/saved/personalize"
      : isOwner
      ? `/api/collections/${collection._id}/movies`
      : `/api/collections/${collection._id}/movies`;

    const body = isCurated
      ? { slug, movieId, action: "add" }
      : { movieId, version: collection.updatedAt };

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
      if (res.status === 409) {
        toast.error("Conflict detected: This collection was updated by another collaborator. Please refresh.");
        return;
      }
      if (!data.success) throw new Error(data.message);
      toast.success("Added");
      loadData();
    } catch (e) {
      toast.error(e.message || "Failed to add");
    }
  }

  async function handleDuplicate() {
    const token = getToken();
    try {
      const res = await fetch(`/api/collections/${collection._id}/duplicate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Collection duplicated!");
      router.push(`/collection/${data.collection.slug}`);
    } catch (e) {
      toast.error(e.message || "Failed to duplicate");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${collection.name}"?`)) return;
    const token = getToken();
    try {
      const res = await fetch(`/api/collections/${collection._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Collection deleted");
      router.push("/collections");
    } catch (e) {
      toast.error(e.message || "Failed to delete");
    }
  }

  // ----------------------------------------------------
  // Render States
  // ----------------------------------------------------
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
          <AlertCircle size={40} className="mx-auto text-red-500 mb-4" />
          <p className="text-red-400 mb-4">{error || "Collection not found"}</p>
          <Link href="/collections" className="text-purple-400 hover:underline text-sm">
            ← Back to Collections
          </Link>
        </div>
      </main>
    );
  }

  // Curated layout fallback
  if (isCurated) {
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
            </div>

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
              <button
                onClick={() => setShareOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all cursor-pointer"
              >
                <Share2 size={16} />
                Share
              </button>
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

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {collection.movies?.map((movie, idx) => (
              <div key={`${movie.id}-${idx}`} className="relative">
                <div className="absolute top-2 left-2 z-10 min-w-[1.5rem] h-6 px-1.5 rounded-full bg-black/70 backdrop-blur-sm text-[11px] font-bold text-white flex items-center justify-center border border-white/10">
                  {idx + 1}
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
        </section>

        {/* Share Modal for Curated */}
        {shareOpen && renderShareModal()}
      </main>
    );
  }

  // ----------------------------------------------------
  // Custom User Collection Rendering
  // ----------------------------------------------------
  const owner = collection.owner;
  const isOwner = collection.isOwner;
  const isCollaborator = collection.isCollaborator;
  const isSaved = collection.saved && !isOwner;
  const canEdit = isOwner || isCollaborator;
  const gradient = getBannerGradient(collection.bannerStyle);

  const filteredMovies = (() => {
    const movies = collection.movies || [];
    if (!debouncedLocalQuery.trim()) return movies;

    const q = debouncedLocalQuery.trim();
    const qLower = q.toLowerCase();
    const cq = cleanString(q);
    const queryWords = qLower.split(/\s+/).filter(Boolean);

    const fuse = new Fuse(movies, {
      keys: [
        { name: "title", weight: 0.5 },
        { name: "original_title", weight: 0.3 },
        { name: "genres.name", weight: 0.1 },
        { name: "release_date", weight: 0.1 },
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
      ignoreLocation: true,
    });

    const fuseResults = fuse.search(q);
    const fuseMap = new Map(fuseResults.map((res) => [res.item.id, res]));

    const scored = movies.map((movie) => {
      const titleLower = (movie.title || "").toLowerCase().trim();
      const cleanTitle = cleanString(movie.title);
      const cleanOriginal = cleanString(movie.original_title);

      const isExact = titleLower === qLower;
      const isStartsWith = titleLower.startsWith(qLower);
      const containsAll = queryWords.length > 0 && queryWords.every((w) => titleLower.includes(w));
      const isSubstring = cq.length >= 2 && (cleanTitle.includes(cq) || cleanOriginal.includes(cq));

      const fuseMatch = fuseMap.get(movie.id);
      const isFuzzy = !!fuseMatch;
      const fuzzyScore = fuseMatch ? fuseMatch.score ?? 1 : 1;

      let tier = 6;
      if (isExact) tier = 1;
      else if (isStartsWith) tier = 2;
      else if (containsAll) tier = 3;
      else if (isSubstring) tier = 4;
      else if (isFuzzy) tier = 5;

      return { movie, tier, fuzzyScore };
    });

    const matches = scored.filter((item) => item.tier < 6);

    matches.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.fuzzyScore - b.fuzzyScore;
    });

    return matches.map((item) => {
      const copy = { ...item.movie };
      copy.displayTitle = <HighlightedText text={item.movie.title} query={q} />;
      return copy;
    });
  })();

  function renderShareModal() {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl relative">
          <button
            onClick={() => setShareOpen(false)}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white"
          >
            <X size={20} />
          </button>
          <h2 className="text-xl font-bold mb-4">Share Collection</h2>

          {/* OG Preview Card Mockup */}
          <div className="border border-zinc-850 rounded-xl overflow-hidden bg-zinc-900/60 mb-6">
            <div className="h-32 bg-zinc-850 relative">
              <CollectionCoverBanner
                src={collection.bannerUrl}
                alt={collection.name || collection.title}
                gradient={gradient}
                bannerStyle={collection.bannerStyle}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <span className="px-2 py-0.5 rounded bg-purple-600/80 text-[10px] font-bold uppercase text-white">
                  {collection.category || "Custom"}
                </span>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-lg text-white mb-1">{collection.name || collection.title}</h3>
              <p className="text-xs text-zinc-400 mb-2 truncate">{collection.description || "No description provided."}</p>
              <div className="flex justify-between items-center text-[11px] text-zinc-500">
                <span>By {owner?.username || "MovieKart User"}</span>
                <span>{collection.movies?.length || 0} movies</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Link copied!");
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-semibold"
              >
                Copy Link
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2 pt-2">
              <a
                href={getShareLink("twitter")}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 transition-colors"
              >
                <span className="text-white font-bold text-sm">X</span>
              </a>
              <a
                href={getShareLink("facebook")}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 transition-colors"
              >
                <span className="text-blue-500 font-bold text-sm">FB</span>
              </a>
              <a
                href={getShareLink("whatsapp")}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 transition-colors"
              >
                <span className="text-green-500 font-bold text-sm">WA</span>
              </a>
              <a
                href={getShareLink("telegram")}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 transition-colors"
              >
                <span className="text-sky-400 font-bold text-sm">TG</span>
              </a>
              <a
                href={getShareLink("reddit")}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 transition-colors"
              >
                <span className="text-orange-500 font-bold text-sm">Reddit</span>
              </a>
            </div>

            <button
              onClick={triggerNativeShare}
              className="w-full py-3 bg-zinc-850 hover:bg-zinc-800 rounded-xl text-xs font-semibold mt-4 transition-colors flex items-center justify-center gap-2 border border-zinc-800 text-zinc-200"
            >
              <Share2 size={14} />
              Share via System / Native Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white pb-20">
      <div className="relative h-[42vh] md:h-[52vh] overflow-hidden">
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

          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 border border-white/15 text-zinc-300">
              {collection.category || "Custom"}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 border border-purple-500/30 text-purple-300">
              {collection.visibility || "private"}
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 max-w-3xl">
            {collection.name}
          </h1>

          {collection.description && <p className="text-zinc-300 max-w-2xl text-sm md:text-base leading-relaxed mb-4">{collection.description}</p>}

          <p className="text-zinc-500 text-sm mb-4">
            Created by{" "}
            {owner?.username ? (
              <Link href={`/profile/${owner.username}`} className="text-purple-400 hover:text-purple-300 font-semibold">
                {owner.username}
              </Link>
            ) : (
              "Unknown"
            )}
            {collaborators.length > 0 && ` + ${collaborators.length} collaborators`}
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
                <span>
                  {collection.watchedCount}/{collection.totalCount}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${collection.progressPercentage}%` }}
                />
              </div>
            </div>
          )}
          {/* Pending Invite Banner — visible to invited non-collaborators */}
          {pendingInvite && !collection.isCollaborator && !collection.isOwner && (
            <div className="mb-4 flex items-center gap-4 px-5 py-4 rounded-xl border border-purple-500/40 bg-purple-950/30 backdrop-blur-sm">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-purple-300">
                  You have been invited to collaborate on this collection.
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  As a collaborator you can add, remove, and reorder movies.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleRespondToInvite("accept")}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRespondToInvite("decline")}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors cursor-pointer border border-zinc-700"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Social Interactions Bar */}
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

            {/* Like Button — public or unlisted collections */}
            {(collection.visibility === "public" || collection.visibility === "unlisted") ? (
              <button
                onClick={handleLike}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                  liked
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : "bg-white/8 hover:bg-white/14 border-white/15 text-zinc-300"
                } ${likeAnimating ? "scale-125" : ""}`}
              >
                <Heart size={16} fill={liked ? "currentColor" : "none"} className={liked ? "text-red-400 animate-pulse" : ""} />
                {likesCount} {likesCount === 1 ? "Like" : "Likes"}
              </button>
            ) : null}

            {/* Follow Button — public or unlisted collections */}
            {(collection.visibility === "public" || collection.visibility === "unlisted") && (
              <button
                onClick={handleFollow}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                  followed
                    ? "bg-purple-600 border-purple-500 text-white"
                    : "bg-white/8 hover:bg-white/14 border-white/15 text-zinc-300"
                }`}
              >
                {followed ? "Following" : "Follow"}
                <span className="text-[11px] opacity-70">({followersCount})</span>
              </button>
            )}


            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all cursor-pointer text-zinc-300"
            >
              <Share2 size={16} />
              Share
            </button>

            {canEdit && (
              <>
                <button
                  onClick={() => setEditOpen(true)}
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-sm font-semibold transition-all cursor-pointer"
                >
                  <Pencil size={16} />
                  Edit Settings
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
              </>
            )}

            {isOwner && (
              <>
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
                  <div className="absolute right-0 bottom-full mb-2 w-48 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-2 z-[99] space-y-1">
                    <button
                      onClick={() => { setEditOpen(true); setActionsDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-900 transition-colors flex items-center gap-2 text-white"
                    >
                      <Pencil size={14} /> Edit Settings
                    </button>
                    <button
                      onClick={() => { setReorderMode(!reorderMode); setActionsDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-900 transition-colors flex items-center gap-2 text-white ${reorderMode ? "text-purple-400 font-bold" : ""}`}
                    >
                      <ListOrdered size={14} /> {reorderMode ? "Done" : "Reorder"}
                    </button>
                    {isOwner && (
                      <>
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
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Movies vs Stats Sidebar & Collaborators */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Movies */}
        <div className={isOwner ? "lg:col-span-8" : "lg:col-span-12"}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">
              Watch Order
              <span className="text-zinc-500 font-normal text-sm ml-2">({collection.movies?.length || 0})</span>
            </h2>
          </div>

          <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md py-4 border-b border-zinc-800/80 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-500">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search in this collection..."
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
                existingMovieIds={collection.movies?.map((m) => m.id) || []}
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
              <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 ${isOwner ? "" : "lg:grid-cols-5 xl:grid-cols-6"} gap-5`}>
                {filteredMovies.map((movie) => {
                  const originalIndex = (collection.movies || []).findIndex((m) => m.id === movie.id);
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
                <p className="text-sm mt-2">Use &quot;Add Movie&quot; button to add movies.</p>
              )}
            </div>
          )}

          {collection.isPublic && (
            <div className="pb-4">
              <CollectionComments collectionMongoId={collection._id} isPublic={collection.isPublic} />
            </div>
          )}
        </div>

        {/* Right Column: Collaborators, Stats & Activities */}
        <div className={isOwner ? "lg:col-span-4 space-y-6" : "lg:col-span-12 space-y-6"}>
          
          {/* 1. Collection Stats — owner only */}
          {isOwner && <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 md:p-6 space-y-4">
            <h3 className="font-bold text-md text-white border-b border-zinc-800 pb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              Collection Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-850">
                <span className="text-zinc-500 text-xs block">Views</span>
                <span className="font-bold text-white flex items-center gap-1.5 mt-1">
                  <Eye size={14} className="text-zinc-400" />
                  {collection.stats?.views || 0}
                </span>
              </div>
              <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-850">
                <span className="text-zinc-500 text-xs block">Likes</span>
                <span className="font-bold text-white flex items-center gap-1.5 mt-1">
                  <Heart size={14} className="text-red-400" fill="currentColor" />
                  {likesCount}
                </span>
              </div>
              <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-850">
                <span className="text-zinc-500 text-xs block">Followers</span>
                <span className="font-bold text-white flex items-center gap-1.5 mt-1">
                  <Users size={14} className="text-purple-400" />
                  {followersCount}
                </span>
              </div>
              <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-850">
                <span className="text-zinc-500 text-xs block">Avg Rating</span>
                <span className="font-bold text-white flex items-center gap-1.5 mt-1">
                  ★ {collection.stats?.averageRating || 0}
                </span>
              </div>
            </div>
            <div className="text-xs text-zinc-500 space-y-1.5 pt-2 border-t border-zinc-850">
              <div className="flex justify-between">
                <span>Created:</span>
                <span className="text-zinc-300">
                  {collection.stats?.createdDate ? new Date(collection.stats.createdDate).toLocaleDateString() : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="text-zinc-300">
                  {collection.stats?.lastUpdated ? new Date(collection.stats.lastUpdated).toLocaleDateString() : "-"}
                </span>
              </div>
              {collection.stats?.genresIncluded?.length > 0 && (
                <div className="pt-2">
                  <span className="block text-zinc-500 mb-1">Genres Included:</span>
                  <div className="flex flex-wrap gap-1">
                    {collection.stats.genresIncluded.slice(0, 5).map((g) => (
                      <span key={g} className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>}

          {/* 2. Collaboration Panel */}
          {(collection.visibility === "collaborative_private" || collaborators.length > 0 || isOwner) && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 md:p-6 space-y-4">
              <h3 className="font-bold text-md text-white border-b border-zinc-800 pb-2 flex items-center gap-2">
                <Shield size={16} className="text-cyan-400" />
                Collaborators
              </h3>

              {/* Owner and Collaborators Avatars */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/30 border border-zinc-850">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold text-black uppercase">
                      {owner?.username?.charAt(0)}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-white block">{owner?.username}</span>
                      <span className="text-[10px] text-zinc-500 block">Owner</span>
                    </div>
                  </div>
                </div>

                {collaborators.map((collab) => (
                  <div
                    key={collab.userId?._id || collab.userId}
                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/30 border border-zinc-850"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                        {collab.userId?.username?.charAt(0) || "C"}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-white block">
                          {collab.userId?.username || "Collaborator"}
                        </span>
                        <span className="text-[10px] text-cyan-400 block">Collaborator</span>
                      </div>
                    </div>

                    {isOwner && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleTransferOwnership(collab.userId?._id || collab.userId)}
                          title="Transfer Ownership"
                          className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        >
                          <Shield size={12} />
                        </button>
                        <button
                          onClick={() => handleRevokeCollaborator(collab.userId?._id || collab.userId)}
                          title="Revoke Access"
                          className="p-1.5 rounded-lg bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Invite Form (only for owner) */}
              {isOwner && (
                <form onSubmit={handleInviteCollaborator} className="pt-2 border-t border-zinc-850 space-y-2">
                  <span className="text-xs text-zinc-400 block">Invite a new collaborator</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Username or email..."
                      value={inviteTarget}
                      onChange={(e) => setInviteTarget(e.target.value)}
                      className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500/50"
                    />
                    <button
                      type="submit"
                      disabled={inviting || !inviteTarget.trim()}
                      className="p-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 3. Collection Activity Timeline — owner only */}
          {isOwner && timeline.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 md:p-6 space-y-4">
              <h3 className="font-bold text-md text-white border-b border-zinc-800 pb-2 flex items-center gap-2">
                <Clock size={16} className="text-yellow-500" />
                Activity Timeline
              </h3>
              <div className="relative border-l border-zinc-800 pl-4 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                {timeline.map((act) => (
                  <div key={act._id} className="relative text-xs text-zinc-400">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-800 border-2 border-black" />
                    <div className="mb-0.5">
                      <span className="font-semibold text-zinc-200">{act.username}</span>{" "}
                      <span className="opacity-90">{act.meta?.details || act.type.replace("_", " ")}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600">
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
                      · {new Date(act.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {editOpen && (
        <CollectionEditModal
          collection={collection}
          isPersonalized={isSaved}
          onClose={() => setEditOpen(false)}
          onSaved={loadData}
        />
      )}

      <AddMoviesModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAddMovie={handleAddMovieById}
        existingMovieIds={collection.movies?.map((m) => m.id) || []}
      />

      {shareOpen && renderShareModal()}
    </main>
  );
}
