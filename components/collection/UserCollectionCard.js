"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Film, User } from "lucide-react";
import CuratedCollectionCard from "./CuratedCollectionCard";

export default function UserCollectionCard({ collection, showProgress = false, onRemove }) {
  const href = collection.href || `/collection/view/${collection._id}`;
  const coverSrc =
    collection.imageUrl ||
    collection.coverImage ||
    (collection.firstMoviePoster
      ? `https://image.tmdb.org/t/p/w500${collection.firstMoviePoster}`
      : "");

  return (
    <article className="group relative flex-shrink-0 w-[260px] md:w-[280px] overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10">
      <Link href={href} className="block">
        <div className="relative h-40 overflow-hidden">
          {coverSrc ? (
            <Image
              src={coverSrc}
              alt={collection.name || collection.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="280px"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
              <Film size={32} className="text-zinc-600" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/50 backdrop-blur-md text-white border border-white/10">
              {collection.category || "Custom"}
            </span>
          </div>
          {collection.type === "community-saved" && collection.owner?.username && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-md text-[10px] text-zinc-300">
              <User size={10} />
              {collection.owner.username}
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-bold text-white text-base leading-tight mb-1.5 truncate">
            {collection.name || collection.title}
          </h3>
          {collection.description && (
            <p className="text-zinc-400 text-xs line-clamp-2 mb-3">{collection.description}</p>
          )}
          <div className="flex items-center gap-2 text-zinc-500 text-xs">
            <Film size={12} />
            <span>
              {collection.movies?.length || collection.totalItems || collection.totalCount || 0} titles
            </span>
            {collection.isPersonalized && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-purple-400">Personalized</span>
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

      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onRemove(collection);
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/60 border border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-500/30 opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10"
          aria-label="Remove from library"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </article>
  );
}

export function CollectionCardRow({ title, subtitle, collections, showProgress = false, onRemove, cardType = "user" }) {
  if (!collections?.length) return null;

  return (
    <section className="mb-12">
      <div className="mb-5 px-6 md:px-10">
        <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-zinc-500 text-sm mt-1">{subtitle}</p>}
      </div>
      <div className="flex gap-5 overflow-x-auto px-6 md:px-10 pb-4 no-scrollbar snap-x snap-mandatory">
        {collections.map((col) => {
          const type = cardType === "mixed" ? (col.type === "curated-saved" ? "curated" : "user") : cardType;
          return (
            <div key={col._id || col.slug || col.id} className="snap-start">
              {type === "curated" ? (
                <CuratedCollectionCardWrapper collection={col} showProgress={showProgress} onRemove={onRemove} />
              ) : (
                <UserCollectionCard collection={col} showProgress={showProgress} onRemove={onRemove} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CuratedCollectionCardWrapper({ collection, showProgress, onRemove }) {
  return (
    <div className="relative group">
      <CuratedCollectionCard collection={collection} showProgress={showProgress} />
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onRemove(collection);
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/60 border border-white/10 text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-20"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
