"use client";

import { useState } from "react";
import Image from "next/image";
import { Upload, Wand2, X } from "lucide-react";
import { BANNER_GRADIENTS, THEME_COLORS } from "@/lib/collectionConstants";

export default function CollectionBannerEditor({
  bannerUrl,
  coverUrl,
  bannerStyle = {},
  onBannerUrlChange,
  onCoverUrlChange,
  onBannerStyleChange,
  onAutoGenerate,
  movies = [],
}) {
  const [tab, setTab] = useState("banner");

  function handleBannerUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Please select an image smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onBannerUrlChange(reader.result?.toString() || "");
    reader.readAsDataURL(file);
  }

  function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Please select an image smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onCoverUrlChange(reader.result?.toString() || "");
    reader.readAsDataURL(file);
  }

  const gradientClass = BANNER_GRADIENTS.find((g) => g.id === bannerStyle.gradient)?.class;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 space-y-4">
      <div className="flex gap-2">
        {["banner", "cover", "style"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              tab === t ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {t === "banner" ? "Banner" : t === "cover" ? "Cover" : "Theme"}
          </button>
        ))}
      </div>

      {tab === "banner" && (
        <div className="space-y-3">
          <div className="relative h-32 rounded-xl overflow-hidden border border-zinc-800">
            {bannerUrl ? (
              <Image src={bannerUrl} alt="Banner preview" fill className="object-cover" />
            ) : gradientClass ? (
              <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`} />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold transition-colors">
              <Upload size={14} />
              Upload Banner
              <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
            </label>
            {onAutoGenerate && movies.length > 0 && (
              <button
                onClick={onAutoGenerate}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Wand2 size={14} />
                Auto-generate from posters
              </button>
            )}
            {bannerUrl && (
              <button
                onClick={() => onBannerUrlChange("")}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-red-500/20 text-xs text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>
          <input
            type="text"
            value={bannerUrl?.startsWith("data:") ? "" : bannerUrl || ""}
            onChange={(e) => onBannerUrlChange(e.target.value)}
            placeholder="Or paste banner image URL..."
            className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm outline-none focus:border-purple-500/50"
          />
        </div>
      )}

      {tab === "cover" && (
        <div className="space-y-3">
          <div className="relative w-24 h-32 rounded-xl overflow-hidden border border-zinc-800 mx-auto">
            {coverUrl ? (
              <Image src={coverUrl} alt="Cover preview" fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs">
                No cover
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold">
              <Upload size={14} />
              Upload Cover
              <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
            </label>
            {coverUrl && (
              <button
                onClick={() => onCoverUrlChange("")}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-zinc-800 text-xs text-zinc-400 hover:text-red-400 cursor-pointer"
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>
          <input
            type="text"
            value={coverUrl?.startsWith("data:") ? "" : coverUrl || ""}
            onChange={(e) => onCoverUrlChange(e.target.value)}
            placeholder="Or paste cover image URL..."
            className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm outline-none focus:border-purple-500/50"
          />
        </div>
      )}

      {tab === "style" && (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wider">Gradient Background</p>
            <div className="grid grid-cols-3 gap-2">
              {BANNER_GRADIENTS.map((g) => (
                <button
                  key={g.id}
                  onClick={() =>
                    onBannerStyleChange({ ...bannerStyle, gradient: g.id, autoGenerate: false })
                  }
                  className={`h-12 rounded-lg bg-gradient-to-br ${g.class} border-2 transition-all cursor-pointer ${
                    bannerStyle.gradient === g.id ? "border-white scale-105" : "border-transparent hover:border-white/30"
                  }`}
                  title={g.label}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wider">Theme Color</p>
            <div className="flex flex-wrap gap-2">
              {THEME_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => onBannerStyleChange({ ...bannerStyle, themeColor: color })}
                  className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                    bannerStyle.themeColor === color ? "border-white scale-110" : "border-transparent hover:border-white/30"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
