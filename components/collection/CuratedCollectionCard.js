"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Film } from "lucide-react";
import SaveCuratedButton from "./SaveCuratedButton";

const CATEGORY_COLORS = {
  Franchise: "from-violet-600/80 to-purple-900/80",
  Essentials: "from-amber-600/80 to-orange-900/80",
  Genre: "from-cyan-600/80 to-blue-900/80",
  Director: "from-rose-600/80 to-red-900/80",
  Decade: "from-emerald-600/80 to-teal-900/80",
  TV: "from-fuchsia-600/80 to-pink-900/80",
};

function CoverImage({ src, alt, gradient, isLarge }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover transition-transform duration-500 group-hover:scale-110"
      sizes="(max-width: 768px) 320px, 380px"
      onError={() => setFailed(true)}
    />
  );
}

export default function CuratedCollectionCard({ collection, variant = "default", showProgress = false }) {
  const gradient = CATEGORY_COLORS[collection.category] || "from-zinc-700/80 to-zinc-900/80";
  const isLarge = variant === "featured";

  return (
    <article
      className={`group relative flex-shrink-0 overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10 ${
        isLarge ? "w-[320px] md:w-[380px]" : "w-[260px] md:w-[280px]"
      }`}
    >
      <Link href={`/collections/${collection.slug}`} className="block">
        <div className={`relative ${isLarge ? "h-48 md:h-56" : "h-40"} overflow-hidden`}>
          <CoverImage
            src={collection.coverImage}
            alt={collection.title}
            gradient={gradient}
            isLarge={isLarge}
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${gradient} via-black/20 to-transparent`} />
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/50 backdrop-blur-md text-white border border-white/10">
              {collection.category}
            </span>
          </div>
          {collection.featured && (
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-black">
              Featured
            </div>
          )}
        </div>

        <div className="p-4 pr-14">
          <h3 className={`font-bold text-white leading-tight mb-1.5 truncate ${isLarge ? "text-lg" : "text-base"}`}>
            {collection.title}
          </h3>
          <p className="text-zinc-400 text-xs line-clamp-2 mb-3 leading-relaxed h-8">
            {collection.description || "No description provided."}
          </p>
          <div className="flex items-center gap-2 text-zinc-500 text-xs">
            <Film size={12} />
            <span>{collection.totalItems || collection.totalCount || 0} titles</span>
            {collection.tags?.[0] && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="truncate max-w-[100px]">{collection.tags[0]}</span>
              </>
            )}
          </div>

          {showProgress && collection.totalCount > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                <span>{collection.watchedCount || 0} of {collection.totalCount} watched</span>
                <span>{collection.progressPercentage || 0}%</span>
              </div>
              <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${collection.progressPercentage || 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </Link>

      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <SaveCuratedButton
          slug={collection.slug}
          saved={collection.saved}
          compact
        />
      </div>

    </article>
  );
}

export function CuratedCollectionRow({ title, subtitle, collections, variant = "default", showProgress = false }) {
  if (!collections?.length) return null;

  return (
    <section className="mb-12">
      <div className="mb-5 px-6 md:px-10">
        <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-zinc-500 text-sm mt-1">{subtitle}</p>}
      </div>
      <div className="flex gap-5 overflow-x-auto px-6 md:px-10 pb-4 no-scrollbar snap-x snap-mandatory">
        {collections.map((col) => (
          <div key={col.slug || col.id} className="snap-start">
            <CuratedCollectionCard
              collection={col}
              variant={variant}
              showProgress={showProgress}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
