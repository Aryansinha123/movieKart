"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, X, Info, Trash2, Cake, MapPin, Film, Eye } from "lucide-react";
import { toast } from "react-hot-toast";
import { getPersonUrl } from "@/utils/slugify";
import { getImagePath } from "@/utils/imagePath";

export default function FavoriteActorsSection({ initialActors, profileUserId }) {
  const [actors, setActors] = useState(initialActors || []);
  const [selectedActor, setSelectedActor] = useState(null);
  const [isRemoving, setIsRemoving] = useState({});

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  let viewerId = "";
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      viewerId = payload?.id || "";
    } catch {}
  }
  const isSelf = viewerId && profileUserId && String(viewerId) === String(profileUserId);

  async function handleRemove(actorId, actorName) {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setIsRemoving(prev => ({ ...prev, [actorId]: true }));
      const res = await fetch("/api/favorites/actors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ actorId }),
      });

      const data = await res.json().catch(() => null);
      if (data?.success) {
        setActors(prev => prev.filter(a => a.id !== actorId));
        toast.success(`Removed ${actorName} from Favorites`);
        window.dispatchEvent(new Event("user-stats-update"));
      } else {
        throw new Error(data?.message || "Failed to remove");
      }
    } catch (err) {
      toast.error(err.message || "Failed to remove from favorites");
    } finally {
      setIsRemoving(prev => ({ ...prev, [actorId]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
          <Star size={20} fill="currentColor" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold">Favorite Actors</h2>
        <span className="text-zinc-500 text-xs md:text-sm ml-auto">Total: {actors.length}</span>
      </div>

      {actors.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {actors.map((actor) => (
            <div
              key={actor.id}
              className="group relative flex flex-col rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/40 hover:border-amber-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5"
            >
              {/* Profile Image */}
              <div className="relative aspect-[2/3] overflow-hidden bg-zinc-950">
                {actor.profile_path ? (
                  <Image
                    src={getImagePath(actor.profile_path)}
                    alt={actor.name}
                    fill
                    sizes="(max-width: 640px) 150px, (max-width: 768px) 200px, 250px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-700 bg-zinc-900">
                    <Film size={40} />
                  </div>
                )}
                
                {/* Hover overlay with Quick View & Remove */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 gap-2 z-10">
                  <span className="text-xs font-bold text-white truncate mb-1">{actor.name}</span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedActor(actor)}
                      className="flex-1 py-1.5 rounded-lg bg-white text-black text-xs font-bold flex items-center justify-center gap-1 hover:bg-zinc-200 transition-colors"
                      title="Quick View"
                    >
                      <Eye size={12} />
                      Quick View
                    </button>
                    {isSelf && (
                      <button
                        onClick={() => handleRemove(actor.id, actor.name)}
                        disabled={isRemoving[actor.id]}
                        className="p-1.5 rounded-lg bg-red-600/90 text-white hover:bg-red-650 transition-colors disabled:opacity-50"
                        title="Remove from Favorites"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Actor Info Footer */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <Link href={getPersonUrl(actor.id, actor.name)} className="font-bold text-sm text-white hover:text-amber-400 transition-colors block truncate">
                    {actor.name}
                  </Link>
                  <p className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase mt-1 truncate">
                    {actor.known_for_department || "Acting"}
                  </p>
                </div>
                {actor.popularity && (
                  <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1.5">
                    <span>Popularity:</span>
                    <span className="text-amber-500 font-semibold">{actor.popularity.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900/20 rounded-2xl p-8 border border-zinc-800/50 text-zinc-500 text-center">
          No favorite actors added yet.
        </div>
      )}

      {/* Quick View Modal */}
      {selectedActor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[999] p-4">
          <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedActor(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white transition-colors z-20"
            >
              <X size={18} />
            </button>

            <div className="overflow-y-auto p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8">
              {/* Photo */}
              <div className="shrink-0 w-40 md:w-48 aspect-[2/3] relative rounded-xl overflow-hidden border border-zinc-800 shadow-lg bg-zinc-900 mx-auto md:mx-0">
                {selectedActor.profile_path ? (
                  <Image
                    src={getImagePath(selectedActor.profile_path)}
                    alt={selectedActor.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
                    <Film size={40} />
                  </div>
                )}
              </div>

              {/* Bio & Stats */}
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedActor.name}</h3>
                  <p className="text-xs text-zinc-500 font-semibold tracking-wider uppercase mt-1">
                    {selectedActor.known_for_department}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-y border-zinc-900 py-3 text-sm">
                  {selectedActor.birthday && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Birthday</p>
                      <p className="font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Cake size={12} className="text-amber-500" />
                        {new Date(selectedActor.birthday).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {selectedActor.place_of_birth && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Birthplace</p>
                      <p className="font-semibold text-zinc-200 flex items-center gap-1.5">
                        <MapPin size={12} className="text-amber-500" />
                        <span className="truncate">{selectedActor.place_of_birth}</span>
                      </p>
                    </div>
                  )}
                </div>

                {selectedActor.biography ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Biography</p>
                    <p className="text-sm text-zinc-400 leading-relaxed max-h-40 overflow-y-auto scrollbar-thin whitespace-pre-wrap pr-1">
                      {selectedActor.biography}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">No biography details available.</p>
                )}

                <div className="pt-2 flex justify-between items-center">
                  <Link
                    href={getPersonUrl(selectedActor.id, selectedActor.name)}
                    onClick={() => setSelectedActor(null)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-lg transition-colors"
                  >
                    View Full Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
