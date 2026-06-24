"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { GripVertical, X, CheckCircle2 } from "lucide-react";
import { getMovieUrl } from "@/utils/slugify";

function MovieListItem({ movie, index, onRemove, canEdit, onDragStart, onDragOver, onDrop, isDragging }) {
  const poster = movie.poster_path
    ? `https://image.tmdb.org/t/p/w154${movie.poster_path}`
    : null;

  return (
    <div
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/50 hover:border-zinc-700 transition-all group ${
        isDragging ? "opacity-40 scale-[0.98]" : ""
      } ${canEdit ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {canEdit && (
        <div className="p-1 text-zinc-600 hover:text-zinc-400 touch-none">
          <GripVertical size={18} />
        </div>
      )}
      <span className="w-7 h-7 rounded-full bg-zinc-800 text-xs font-bold flex items-center justify-center text-zinc-400 shrink-0">
        {index + 1}
      </span>
      {poster ? (
        <div className="relative w-12 h-16 rounded-lg overflow-hidden shrink-0">
          <Image src={poster} alt={movie.title} fill className="object-cover" sizes="48px" />
        </div>
      ) : (
        <div className="w-12 h-16 rounded-lg bg-zinc-800 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <Link
          href={getMovieUrl(movie.id, movie.title)}
          onClick={() => console.log(`[Client-DraggableMovieList] Clicked Movie ID: ${movie.id}, Title: "${movie.title}"`)}
          className="font-medium text-white text-sm hover:text-purple-400 transition-colors truncate block"
        >
          {movie.title}
        </Link>
        {movie.release_date && (
          <p className="text-xs text-zinc-500">{movie.release_date?.slice(0, 4)}</p>
        )}
      </div>
      {movie.watched && <CheckCircle2 size={16} className="text-green-400 shrink-0" />}
      {canEdit && onRemove && (
        <button
          onClick={() => onRemove(movie.id)}
          className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
          aria-label="Remove"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export default function DraggableMovieList({
  movies = [],
  onReorder,
  onRemove,
  canEdit = false,
}) {
  const [items, setItems] = useState(movies);
  const [dragIndex, setDragIndex] = useState(null);

  useEffect(() => {
    setItems(movies);
  }, [movies]);

  function handleDragStart(index) {
    setDragIndex(index);
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const newItems = [...items];
    const [dragged] = newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, dragged);
    setDragIndex(index);
    setItems(newItems);
  }

  function handleDrop() {
    if (dragIndex !== null) {
      onReorder?.(items.map((m) => m.id));
    }
    setDragIndex(null);
  }

  if (!items.length) {
    return (
      <div className="text-center py-12 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-2xl">
        No movies in this collection yet.
      </div>
    );
  }

  return (
    <div className="space-y-2" onDragEnd={handleDrop}>
      {items.map((movie, index) => (
        <MovieListItem
          key={movie.id}
          movie={movie}
          index={index}
          onRemove={onRemove}
          canEdit={canEdit}
          isDragging={dragIndex === index}
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
