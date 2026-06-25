"use client";

import { X } from "lucide-react";
import CollectionSearchBar from "./CollectionSearchBar";

export default function AddMoviesModal({ isOpen, onClose, onAddMovie, existingMovieIds = [] }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Add Movies to Collection
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Search TMDB by title or input a TMDB ID directly</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 min-h-[300px]">
          <CollectionSearchBar
            onAddMovie={onAddMovie}
            existingMovieIds={existingMovieIds}
            autoFocus={true}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end p-5 border-t border-zinc-800/85 bg-zinc-950/40">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 font-semibold text-sm transition-colors cursor-pointer border border-zinc-800 text-zinc-300 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
