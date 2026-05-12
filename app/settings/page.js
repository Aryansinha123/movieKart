"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";

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
  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("token") || "";
  }, []);

  const userFromToken = useMemo(() => getUserFromToken(token), [token]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");

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

      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, avatar }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to save changes.");

      localStorage.setItem("token", data.token);
      setSuccess("Saved!");
      toast.success("Settings saved!");
    } catch (e) {
      setError(e?.message || "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-8 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Edit Profile</h1>
            <p className="text-zinc-400 mt-1">Update your avatar and username.</p>
          </div>
          <Link href="/" className="text-sm text-zinc-300 hover:text-white transition-colors">
            Back to Home
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
          {isLoading ? (
            <div className="text-zinc-400">Loading...</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : (
            <>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center">
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

                <div className="flex-1">
                  <p className="text-sm text-zinc-300 font-medium">Avatar</p>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFile(e.target.files?.[0])}
                      className="text-sm text-zinc-300"
                    />
                    <button
                      type="button"
                      onClick={() => setAvatar("")}
                      className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      Remove
                    </button>
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

              <div className="mt-6 flex items-center justify-between gap-3">
                <div className="text-sm">
                  {success ? <span className="text-emerald-400">{success}</span> : null}
                </div>
                <button
                  type="button"
                  onClick={save}
                  disabled={isSaving}
                  className="bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-2 rounded-lg font-semibold transition-colors"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

