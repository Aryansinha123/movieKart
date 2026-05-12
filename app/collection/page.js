"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export default function CollectionsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [collections, setCollections] = useState([]);

  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCollections, setSavedCollections] = useState([]);

  // Edit states
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");

  async function load() {
    try {
      setIsLoading(true);
      setError("");

      const token = getToken();
      if (!token) {
        setCollections([]);
        setError("Please login to view your collections.");
        return;
      }

      const res = await fetch("/api/collections", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (res.status === 431) {
        localStorage.removeItem("token");
        throw new Error("Your login token was too large. Please login again.");
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to load collections.");

      setCollections(Array.isArray(data.collections) ? data.collections : []);
      await loadSaved(token);
    } catch (e) {
      setError(e?.message || "Failed to load collections.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        body: JSON.stringify({ name, isPublic }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to create collection.");

      setName("");
      setIsPublic(false);
      await load();
      toast.success("Collection created");
    } catch (e) {
      toast.error(e?.message || "Failed to create collection.");
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePrivacy(collection) {
    try {
      setIsSaving(true);
      const token = getToken();
      const res = await fetch(`/api/collections/${collection._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublic: !collection.isPublic }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to update collection.");

      setCollections((prev) => prev.map((c) => (c._id === data.collection._id ? data.collection : c)));
      toast.success("Collection updated");
    } catch (e) {
      toast.error(e?.message || "Failed to update collection.");
    } finally {
      setIsSaving(false);
    }
  }

  async function loadSaved(token) {
    try {
      const res = await fetch("/api/saved-collections", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setSavedCollections(Array.isArray(data.collections) ? data.collections : []);
      }
    } catch {
      setSavedCollections([]);
    }
  }

  async function saveEdit(collection) {
    if (!editName.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      setIsSaving(true);
      const token = getToken();
      const res = await fetch(`/api/collections/${collection._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editName, imageUrl: editImageUrl }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to update collection.");

      // Preserve firstMoviePoster from previous state
      const updatedColl = { ...data.collection, firstMoviePoster: collection.firstMoviePoster };
      setCollections((prev) => prev.map((c) => (c._id === updatedColl._id ? updatedColl : c)));
      setEditingId(null);
      toast.success("Collection updated");
    } catch (e) {
      toast.error(e?.message || "Failed to update collection.");
    } finally {
      setIsSaving(false);
    }
  }

  async function enableShare(collection) {
    if (!collection.isPublic) {
      toast.error("Make the collection public first, then you can share it.");
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (collection.shareEnabled && collection.shareToken) {
      const url = `${origin}/collection/share/${collection.shareToken}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success(`Share link copied!`);
      } catch {
        toast.success(`Share link: ${url}`);
      }
      return;
    }
    try {
      setIsSaving(true);
      const token = getToken();
      const res = await fetch(`/api/collections/${collection._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shareEnabled: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to enable sharing.");

      setCollections((prev) => prev.map((x) => (x._id === data.collection._id ? data.collection : x)));
      const url = `${origin}/collection/share/${data.collection.shareToken}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success(`Share link copied!`);
    } catch (e) {
      toast.error(e?.message || "Failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCollection(collection) {
    if (!confirm(`Delete "${collection.name}"?`)) return;
    try {
      setIsSaving(true);
      const token = getToken();
      const res = await fetch(`/api/collections/${collection._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to delete collection.");

      setCollections((prev) => prev.filter((c) => c._id !== collection._id));
      toast.success("Collection deleted");
    } catch (e) {
      toast.error(e?.message || "Failed to delete collection.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-8 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Collections</h1>
            <p className="text-zinc-400 mt-1">Organize movies into lists (public or private).</p>
          </div>
          <Link href="/" className="text-sm text-zinc-300 hover:text-white transition-colors">
            Back to Home
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
          <h2 className="text-xl font-bold">Create new</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-center">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Collection name"
              className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white outline-none"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              Public
            </label>
            <button
              type="button"
              disabled={isSaving}
              onClick={createCollection}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-3 rounded-xl font-semibold transition-colors"
            >
              {isSaving ? "Please wait..." : "Create"}
            </button>
          </div>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <div className="text-zinc-400">Loading...</div>
          ) : error ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-red-400">
              {error}
            </div>
          ) : collections.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-zinc-400">
              No collections yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {collections.map((c) => (
                <div key={c._id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col sm:flex-row gap-6">
                  {/* Thumbnail */}
                  <div className="relative group/thumb shrink-0 w-full sm:w-28 h-40 sm:h-40 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center border border-zinc-700/50">
                    {c.imageUrl || c.firstMoviePoster ? (
                      <Image
                        src={c.imageUrl || `https://image.tmdb.org/t/p/w300${c.firstMoviePoster}`}
                        alt={c.name}
                        width={112}
                        height={160}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-zinc-600 text-sm">No Image</span>
                    )}

                    {editingId === c._id && editImageUrl && (
                      <button
                        type="button"
                        onClick={() => setEditImageUrl("")}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-10"
                        title="Remove Custom Image"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col">
                    {editingId === c._id ? (
                      <div className="space-y-3 mb-4">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Collection name"
                          className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white outline-none text-sm"
                        />
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          <div className="relative w-full sm:w-1/2">
                            <input
                              value={editImageUrl}
                              onChange={(e) => setEditImageUrl(e.target.value)}
                              placeholder="Custom Image URL (Optional)"
                              className="w-full p-2 pr-10 rounded-lg bg-zinc-950 border border-zinc-800 text-white outline-none text-sm"
                            />
                            {editImageUrl && (
                              <button
                                type="button"
                                onClick={() => setEditImageUrl("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-red-400 transition-colors"
                                title="Clear Image"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                              </button>
                            )}
                          </div>
                          <span className="text-zinc-500 text-xs font-bold">OR</span>
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <input
                              type="file"
                              accept="image/*"
                              id={`collection-upload-${c._id}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 2 * 1024 * 1024) {
                                    alert("Please select an image smaller than 2MB.");
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = () => setEditImageUrl(reader.result?.toString() || "");
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                            />
                            <label
                              htmlFor={`collection-upload-${c._id}`}
                              className="cursor-pointer text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg font-semibold transition-colors border border-zinc-700/50"
                            >
                              Upload
                            </label>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => saveEdit(c)}
                            disabled={isSaving}
                            className="bg-purple-600 hover:bg-purple-700 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            disabled={isSaving}
                            className="bg-zinc-800 hover:bg-zinc-700 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xl font-bold truncate">{c.name}</p>
                          <p className="text-sm text-zinc-400 mt-1">
                            {c.isPublic ? "Public" : "Private"} • {c.movies?.length || 0} movies
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <button
                            onClick={() => {
                              setEditingId(c._id);
                              setEditName(c.name);
                              setEditImageUrl(c.imageUrl || "");
                            }}
                            className="text-sm px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => togglePrivacy(c)}
                            className="text-sm px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-60 transition-colors"
                          >
                            Make {c.isPublic ? "Private" : "Public"}
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => deleteCollection(c)}
                            className="text-sm px-3 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-60 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-auto pt-4 flex flex-wrap gap-2 border-t border-zinc-800/60">
                      <Link
                        href={`/collection/view/${c._id}`}
                        className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700"
                      >
                        {c.isPublic ? "Public page" : "View movies"}
                      </Link>
                      {c.isPublic ? (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => enableShare(c)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 disabled:opacity-50"
                        >
                          {c.shareEnabled ? "Copy share link" : "Create share link"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {savedCollections.length > 0 ? (
          <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
            <h2 className="text-xl font-bold">Saved collections</h2>
            <p className="text-sm text-zinc-500 mt-1">Lists you bookmarked from the community.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {savedCollections.map((c) => (
                <div
                  key={c._id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{c.name}</p>
                    <p className="text-xs text-zinc-500">
                      {c.owner?.username ? `by ${c.owner.username}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/collection/view/${c._id}`}
                    className="text-xs self-center px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 shrink-0"
                  >
                    Open
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

