"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useUserMovies } from "@/components/providers/UserProvider";

function getUserFromToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload?.exp && payload.exp * 1000 > Date.now()) return payload;
    return null;
  } catch {
    return null;
  }
}

export default function SettingsPage() {
  const [token, setToken] = useState("");
  const userFromToken = useMemo(() => getUserFromToken(token), [token]);
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "hidden"

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("token") || "");
    }
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [preferredLanguages, setPreferredLanguages] = useState([]);

  const availableLanguages = [
    { id: "hi", name: "Hindi (Bollywood)" },
    { id: "en", name: "English (Hollywood)" },
    { id: "te", name: "Telugu" },
    { id: "ta", name: "Tamil" },
    { id: "ml", name: "Malayalam" },
    { id: "kn", name: "Kannada" },
    { id: "ko", name: "Korean" },
    { id: "ja", name: "Japanese" },
  ];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setError("");

        if (!token) {
          setError("Please login to edit your profile.");
          return;
        }

        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to load profile.");

        if (cancelled) return;
        setUsername(data.user?.username || "");
        setAvatar(data.user?.avatar || "");
        setPreferredLanguages(data.user?.preferredLanguages || []);
        console.log("Profile loaded from server:", data.user);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load profile.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function handleFile(file) {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result?.toString() || "");
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!token) return;

    try {
      setIsSaving(true);
      setError("");
      setSuccess("");

      console.log("Saving preferences to server:", { username, avatar, preferredLanguages });

      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, avatar, preferredLanguages }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to save changes.");

      localStorage.setItem("token", data.token);
      setToken(data.token); // Update local state!
      setSuccess("Saved!");
      toast.success("Settings saved!");
    } catch (e) {
      setError(e?.message || "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleLanguage(langId) {
    setPreferredLanguages((prev) =>
      prev.includes(langId) ? prev.filter((id) => id !== langId) : [...prev, langId]
    );
  }

  function moveLanguage(index, direction) {
    const next = [...preferredLanguages];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setPreferredLanguages(next);
  }

  return (
    <main className="min-h-screen bg-black text-white px-8 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-zinc-400 mt-1">Manage your account preferences and hidden content.</p>
          </div>
          <Link href="/" className="text-sm text-zinc-300 hover:text-white transition-colors">
            Back to Home
          </Link>
        </div>

        <div className="flex border-b border-zinc-800 mt-8 gap-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "profile" 
                ? "text-red-500 border-red-500" 
                : "text-zinc-400 border-transparent hover:text-white"
            }`}
          >
            Edit Profile
          </button>
          <button
            onClick={() => setActiveTab("hidden")}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "hidden" 
                ? "text-red-500 border-red-500" 
                : "text-zinc-400 border-transparent hover:text-white"
            }`}
          >
            Hidden Titles
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
          {activeTab === "profile" ? (
            isLoading ? (
              <div className="text-zinc-400">Loading...</div>
            ) : error ? (
              <div className="text-red-400">{error}</div>
            ) : (
              <>
                <div className="flex items-center gap-6">
                  <div className="relative group/avatar">
                    <div className="w-20 h-20 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center border-2 border-zinc-800 group-hover/avatar:border-red-500/50 transition-colors">
                      {avatar ? (
                        <Image
                          src={avatar}
                          alt="Avatar"
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-zinc-200">
                          {(username || userFromToken?.username || "U").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {avatar && (
                      <button
                        type="button"
                        onClick={() => setAvatar("")}
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                        title="Remove Avatar"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm text-zinc-300 font-medium">Avatar</p>
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        id="avatar-upload"
                        onChange={(e) => handleFile(e.target.files?.[0])}
                        className="hidden"
                      />
                      <label
                        htmlFor="avatar-upload"
                        className="cursor-pointer text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                      >
                        Upload New
                      </label>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                      Tip: use a small image (under ~300KB) for best performance.
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <label className="text-sm font-medium text-zinc-300">Username</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="mt-2 w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white outline-none"
                  />
                  <p className="text-xs text-zinc-500 mt-2">
                    Note: username cannot contain “/” and must be 50 characters or less.
                  </p>
                </div>

                {/* Language Preferences */}
                <div className="mt-10 border-t border-zinc-800 pt-8">
                  <h3 className="text-lg font-semibold text-white">Language Preferences</h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Select your preferred languages. The order determines the priority of recommendations.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {availableLanguages.map((lang) => {
                      const isSelected = preferredLanguages.includes(lang.id);
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => toggleLanguage(lang.id)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            isSelected
                              ? "bg-red-500 text-white border-red-500"
                              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                          }`}
                        >
                          {lang.name}
                        </button>
                      );
                    })}
                  </div>

                  {preferredLanguages.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Priority Order (Drag to reorder - Coming Soon, Use Arrows for now)
                      </p>
                      {preferredLanguages.map((langId, index) => {
                        const lang = availableLanguages.find((l) => l.id === langId);
                        return (
                          <div
                            key={langId}
                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 group"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-zinc-500 font-mono text-xs w-4">{index + 1}.</span>
                              <span className="text-sm font-medium text-zinc-200">{lang?.name}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => moveLanguage(index, -1)}
                                disabled={index === 0}
                                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 disabled:opacity-30"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => moveLanguage(index, 1)}
                                disabled={index === preferredLanguages.length - 1}
                                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 disabled:opacity-30"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <div className="text-sm">
                    {success ? <span className="text-emerald-400">{success}</span> : null}
                  </div>
                  <button
                    type="button"
                    onClick={save}
                    disabled={isSaving}
                    className="bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-2 rounded-lg font-semibold transition-colors animate-fade-in"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </>
            )
          ) : (
            <HiddenTitlesSection />
          )}
        </div>
      </div>
    </main>
  );
}

// ─── Hidden Titles Section Component ───────────────────
function HiddenTitlesSection() {
  const { notInterestedMovies, restoreTitle, restoreAllTitles } = useUserMovies() || { notInterestedMovies: [] };
  const [searchQuery, setSearchQuery] = useState("");
  const [posters, setPosters] = useState({});
  const [isRestoringAll, setIsRestoringAll] = useState(false);

  useEffect(() => {
    if (!notInterestedMovies?.length) return;
    
    // Hydrate posters dynamically from TMDB via client wrapper
    async function fetchPosters() {
      const promises = notInterestedMovies.map(async (m) => {
        try {
          const res = await fetch(`/api/movies/${m.movieId}`);
          if (!res.ok) return [m.movieId, null];
          const data = await res.json();
          return [m.movieId, data.poster_path];
        } catch {
          return [m.movieId, null];
        }
      });
      const results = await Promise.all(promises);
      const next = {};
      results.forEach(([id, path]) => {
        if (id) next[id] = path;
      });
      setPosters(next);
    }
    fetchPosters();
  }, [notInterestedMovies]);

  const seenIds = new Set();
  const filtered = (notInterestedMovies || []).filter((m) => {
    const id = Number(m.movieId);
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    return m.title?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleRestore = async (movieId) => {
    const success = await restoreTitle?.(movieId);
    if (success) {
      toast.success("Title restored successfully.");
    } else {
      toast.error("Failed to restore title.");
    }
  };

  const handleRestoreAll = async () => {
    if (!window.confirm("Are you sure you want to restore all hidden titles?")) return;
    setIsRestoringAll(true);
    const success = await restoreAllTitles?.();
    setIsRestoringAll(false);
    if (success) {
      toast.success("All titles restored successfully.");
    } else {
      toast.error("Failed to restore all titles.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Hidden Titles</h2>
          <p className="text-sm text-zinc-400 mt-1">Manage movies and TV shows you have marked as Not Interested.</p>
        </div>
        {notInterestedMovies?.length > 0 && (
          <button
            onClick={handleRestoreAll}
            disabled={isRestoringAll}
            className="self-start sm:self-auto px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 cursor-pointer shadow-lg hover:shadow-red-500/5"
          >
            {isRestoringAll ? "Restoring..." : "Restore All Titles"}
          </button>
        )}
      </div>

      {notInterestedMovies?.length > 0 && (
        <div className="relative group">
          <input
            type="text"
            placeholder="Search hidden titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-zinc-700 transition-all text-sm shadow-md"
          />
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>
      )}

      {!notInterestedMovies || notInterestedMovies.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/10 border border-zinc-800/40 rounded-2xl">
          <p className="text-zinc-500 text-sm">No hidden titles found.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/10 border border-zinc-800/40 rounded-2xl">
          <p className="text-zinc-500 text-sm">No matching hidden titles found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {filtered.map((item) => {
            const posterPath = posters[item.movieId];
            const displayDate = item.createdAt 
              ? new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
              : "Date unknown";

            return (
              <div
                key={item.movieId}
                className="group relative rounded-xl border border-zinc-800/60 bg-zinc-900/20 overflow-hidden flex flex-col hover:border-zinc-700 transition-all shadow-lg hover:shadow-zinc-800/10"
              >
                <div className="relative aspect-[2/3] w-full bg-zinc-800">
                  {posterPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w300${posterPath}`}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 150px, 200px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-center p-4 text-xs text-zinc-500 font-semibold bg-zinc-900">
                      {item.title}
                    </div>
                  )}
                  
                  {/* Hover Actions overlay */}
                  <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-3 p-4 backdrop-blur-sm">
                    <button
                      onClick={() => handleRestore(item.movieId)}
                      className="px-4 py-2.5 rounded-xl bg-white text-black font-extrabold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors shadow-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      Restore
                    </button>
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between bg-zinc-900/40 border-t border-zinc-800/50">
                  <h3 className="font-bold text-sm text-zinc-200 line-clamp-1 group-hover:text-white transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Hidden: {displayDate}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

