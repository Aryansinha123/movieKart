"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
      alert("Please login first");
      return;
    }
    if (!name.trim()) {
      alert("Collection name is required.");
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
    } catch (e) {
      alert(e?.message || "Failed to create collection.");
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
    } catch (e) {
      alert(e?.message || "Failed to update collection.");
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
    } catch (e) {
      alert(e?.message || "Failed to delete collection.");
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
                <div key={c._id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xl font-bold truncate">{c.name}</p>
                      <p className="text-sm text-zinc-400 mt-1">
                        {c.isPublic ? "Public" : "Private"} • {c.movies?.length || 0} movies
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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

                  {Array.isArray(c.movies) && c.movies.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {c.movies.slice(0, 12).map((id) => (
                        <Link
                          key={id}
                          href={`/movie/${id}`}
                          className="text-sm px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
                        >
                          #{id}
                        </Link>
                      ))}
                      {c.movies.length > 12 ? (
                        <span className="text-sm text-zinc-500 px-2 py-1">
                          +{c.movies.length - 12} more
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-zinc-500">
                      No movies yet. Open a movie page and click “Collections”.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

