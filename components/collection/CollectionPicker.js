"use client";

import { useEffect, useMemo, useState } from "react";
import { BookmarkPlus, X } from "lucide-react";
import toast from "react-hot-toast";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export default function CollectionPicker({ movieId, className, children }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [collections, setCollections] = useState([]);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState("private");

  async function loadCollections() {
    const token = getToken();
    if (!token) {
      toast.error("Please login first");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/collections", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 431) {
        localStorage.removeItem("token");
        throw new Error("Your login token was too large. Please login again.");
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        const fallback = !res.ok ? `Request failed (${res.status})` : "Failed to load collections.";
        throw new Error(data?.message || fallback);
      }
      setCollections(Array.isArray(data.collections) ? data.collections : []);
    } catch (e) {
      toast.error(e?.message || "Failed to load collections.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (open) loadCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function createCollection() {
    const token = getToken();
    if (!token) {
      toast.error("Please login first");
      return;
    }
    if (!name.trim()) {
      toast.error("Collection name is required.");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, visibility }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to create collection.");
      setName("");
      setVisibility("private");
      await loadCollections();
    } catch (e) {
      toast.error(e?.message || "Failed to create collection.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleMovie(collection) {
    const token = getToken();
    if (!token) {
      toast.error("Please login first");
      return;
    }
    const hasMovie = Array.isArray(collection.movies) && collection.movies.includes(movieId);

    try {
      setIsSaving(true);
      const res = await fetch(`/api/collections/${collection._id}/movies`, {
        method: hasMovie ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ movieId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        const fallback = !res.ok ? `Request failed (${res.status})` : "Failed to update collection.";
        throw new Error(data?.message || fallback);
      }

      setCollections((prev) =>
        prev.map((c) => (c._id === data.collection._id ? data.collection : c))
      );
    } catch (e) {
      toast.error(e?.message || "Failed to update collection.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e?.preventDefault?.();
          e?.stopPropagation?.();
          if (!getToken()) {
            toast.error("Please login first");
            return;
          }
          setOpen(true);
        }}
        className={className || "bg-zinc-800 px-4 py-3 rounded-lg font-semibold hover:bg-zinc-700 flex items-center gap-2"}
      >
        {children || (
          <>
            <BookmarkPlus size={18} />
            Collections
          </>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-bold">Save to collections</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-zinc-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4">
              <p className="text-sm text-zinc-400">Your collections</p>
              <div className="mt-2 space-y-2 max-h-[260px] overflow-auto pr-1">
                {isLoading ? (
                  <div className="text-zinc-400">Loading...</div>
                ) : collections.length === 0 ? (
                  <div className="text-zinc-400">No collections yet.</div>
                ) : (
                  collections.map((c) => {
                    const hasMovie = Array.isArray(c.movies) && c.movies.includes(movieId);
                    return (
                      <button
                        key={c._id}
                        type="button"
                        disabled={isSaving}
                        onClick={() => toggleMovie(c)}
                        className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 px-4 py-3 flex items-center justify-between gap-3 disabled:opacity-60"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{c.name}</p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {c.visibility || (c.isPublic ? "Public" : "Private")} • {c.movies?.length || 0} movies
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            hasMovie
                              ? "bg-emerald-600/20 text-emerald-300 border border-emerald-700/50"
                              : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                          }`}
                        >
                          {hasMovie ? "Saved" : "Save"}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-zinc-800">
              <p className="text-sm text-zinc-400">Create new collection</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Collection name"
                className="mt-2 w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white outline-none text-sm"
              />

              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="mt-3 w-full p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="private">Private</option>
                <option value="unlisted">Unlisted (Link Only)</option>
                <option value="public">Public</option>
                <option value="collaborative_private">Collaborative Private</option>
              </select>

              <button
                type="button"
                disabled={isSaving}
                onClick={createCollection}
                className="mt-4 w-full bg-red-505 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer text-white"
              >
                {isSaving ? "Please wait..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
