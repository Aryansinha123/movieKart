import React from "react";

export function SkeletonCard() {
  return (
    <div className="w-[45vw] sm:w-[240px] md:w-[260px] flex-shrink-0 rounded-xl border border-zinc-800/40 bg-zinc-900/20 overflow-hidden animate-pulse">
      <div className="w-full h-[350px] bg-zinc-800/40" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-zinc-800/50 rounded w-3/4" />
        <div className="flex gap-2">
          <div className="h-3.5 bg-zinc-800/40 rounded-full w-12" />
          <div className="h-3.5 bg-zinc-800/40 rounded-full w-10" />
        </div>
      </div>
    </div>
  );
}

export default function SkeletonRow({ title }) {
  return (
    <section className="py-10 border-t border-zinc-800/40">
      {title && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/40 flex items-center justify-center animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 bg-zinc-800/50 rounded w-36 animate-pulse" />
            <div className="h-3 bg-zinc-800/30 rounded w-56 animate-pulse" />
          </div>
        </div>
      )}
      <div className="flex overflow-x-auto gap-6 pb-6 pt-2 no-scrollbar">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </section>
  );
}
