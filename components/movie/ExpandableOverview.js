"use client";

import { useState } from "react";

export default function ExpandableOverview({ overview }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!overview) return null;

  const shouldShowButton = overview.length > 180;

  return (
    <div className="mt-4 max-w-2xl">
      <div className="relative">
        <p
          className={`text-zinc-300 text-sm md:text-base lg:text-lg leading-relaxed transition-all duration-300 ${
            isExpanded ? "" : "line-clamp-3 md:line-clamp-none"
          }`}
        >
          {overview}
        </p>
        
        {/* Subtle fade effect when collapsed on mobile */}
        {!isExpanded && shouldShowButton && (
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black to-transparent pointer-events-none md:hidden" />
        )}
      </div>

      {shouldShowButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 md:hidden flex items-center gap-1 cursor-pointer transition-all active:scale-95 focus:outline-none"
        >
          {isExpanded ? "Show Less" : "Read More"}
        </button>
      )}
    </div>
  );
}
