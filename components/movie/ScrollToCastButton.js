"use client";

import { useState, useEffect } from "react";
import { ArrowDown } from "lucide-react";

export default function ScrollToCastButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const castEl = document.getElementById("cast");
      const videosSection = document.getElementById("videos-section");
      
      if (!castEl || !videosSection) {
        setIsVisible(false);
        return;
      }

      const videosRect = videosSection.getBoundingClientRect();
      const castRect = castEl.getBoundingClientRect();

      // Show the floating button if:
      // - The user has scrolled into the videos section (top of videos is above 70% of screen height)
      // - The cast section is not yet fully in view (top of cast is below the viewport)
      const isWindowScrolledPastVideosTop = videosRect.top < window.innerHeight * 0.7;
      const isCastNotYetVisible = castRect.top > window.innerHeight * 0.9;
      
      setIsVisible(isWindowScrolledPastVideosTop && isCastNotYetVisible);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    
    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <a
      href="#cast"
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-zinc-900/95 hover:bg-zinc-800 backdrop-blur-md text-sm font-bold text-white border border-zinc-700/80 shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 group"
    >
      <ArrowDown size={16} className="text-red-500 animate-bounce group-hover:text-white transition-colors" />
      <span>Scroll to Cast</span>
    </a>
  );
}
