"use client";

import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { COLLECTION_CATEGORIES } from "@/lib/collectionConstants";
import CollectionBannerEditor from "./CollectionBannerEditor";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export default function CollectionEditModal({
  collection,
  onClose,
  onSaved,
  isPersonalized = false,
  personalizeEndpoint,
}) {
  const [name, setName] = useState(collection.name || collection.title || "");
  const [description, setDescription] = useState(collection.description || "");
  const [category, setCategory] = useState(collection.category || "Custom");
  const [isPublic, setIsPublic] = useState(collection.isPublic || false);
  const [bannerUrl, setBannerUrl] = useState(collection.bannerUrl || "");
  const [coverUrl, setCoverUrl] = useState(collection.imageUrl || collection.coverImage || "");
  const [bannerStyle, setBannerStyle] = useState(collection.bannerStyle || {});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Please login");
      return;
    }

    setSaving(true);
    try {
      let res;
      if (isPersonalized && personalizeEndpoint) {
        const personalizeBody = {
          personalBannerUrl: bannerUrl,
          bannerStyle,
        };
        if (collection._id || collection.id) {
          personalizeBody.collectionId = collection._id || collection.id;
        }
        if (collection.slug) {
          personalizeBody.slug = collection.slug;
        }
        res = await fetch(personalizeEndpoint, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(personalizeBody),
        });
      } else {
        res = await fetch(`/api/collections/${collection._id || collection.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            description,
            category,
            isPublic,
            bannerUrl,
            imageUrl: coverUrl,
            bannerStyle,
          }),
        });
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Collection updated");
      onSaved?.(data.collection || data.personalization);
      onClose();
    } catch (e) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleAutoGenerate() {
    const posters = (collection.movies || [])
      .filter((m) => m.backdrop_path || m.poster_path)
      .slice(0, 1);
    if (posters[0]?.backdrop_path) {
      setBannerUrl(`https://image.tmdb.org/t/p/w1280${posters[0].backdrop_path}`);
      setBannerStyle({ ...bannerStyle, autoGenerate: true });
      toast.success("Banner generated from movie poster");
    } else if (posters[0]?.poster_path) {
      setBannerUrl(`https://image.tmdb.org/t/p/w1280${posters[0].poster_path}`);
      toast.success("Banner generated from movie poster");
    } else {
      toast.error("No posters available");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-lg font-bold">
            {isPersonalized ? "Personalize Collection" : "Edit Collection"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!isPersonalized && (
            <>
              <div>
                <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-purple-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="mt-1 w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-purple-500/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white outline-none cursor-pointer"
                  >
                    {COLLECTION_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    Public collection
                  </label>
                </div>
              </div>
            </>
          )}

          <CollectionBannerEditor
            bannerUrl={bannerUrl}
            coverUrl={isPersonalized ? "" : coverUrl}
            bannerStyle={bannerStyle}
            onBannerUrlChange={setBannerUrl}
            onCoverUrlChange={setCoverUrl}
            onBannerStyleChange={setBannerStyle}
            onAutoGenerate={handleAutoGenerate}
            movies={collection.movies || []}
          />
        </div>

        <div className="flex gap-3 p-5 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-semibold text-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 font-semibold text-sm transition-colors cursor-pointer"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
