"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

const HeroSlidesContext = createContext(null);

async function enrichSlidesWithTrailers(slides) {
  return Promise.all(
    slides.map(async (slide) => {
      if (slide.trailerKey) return slide;
      try {
        const res = await fetch(`/api/movies/${slide.id}/trailer`);
        const data = await res.json();
        if (data?.trailerKey) {
          return { ...slide, trailerKey: data.trailerKey };
        }
      } catch {
        // keep slide without trailer
      }
      return slide;
    })
  );
}

export function HeroSlidesProvider({ children }) {
  // Slides are stored here and never reset on route change
  const [slides, setSlides] = useState([]);
  const [slidesLoading, setSlidesLoading] = useState(true);
  const didFetch = useRef(false);

  const loadSlides = useCallback(async () => {
    if (didFetch.current) return; // already loaded – skip
    didFetch.current = true;

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers = {};
      if (token && token !== "null" && token !== "undefined") {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch("/api/hero", { headers });
      const data = await res.json();

      if (data?.slides?.length) {
        const seen = new Set();
        const uniqueSlides = data.slides.filter((s) => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        // Show slides immediately (without trailers) so carousel appears fast
        setSlides(uniqueSlides);
        setSlidesLoading(false);

        // Enrich with trailers in the background
        const withTrailers = await enrichSlidesWithTrailers(uniqueSlides);
        const seen2 = new Set();
        const finalUnique = withTrailers.filter((s) => {
          if (seen2.has(s.id)) return false;
          seen2.add(s.id);
          return true;
        });
        setSlides(finalUnique);
        return;
      }
    } catch (err) {
      console.error("[HeroSlidesProvider] Failed to load slides:", err.message);
      setSlides([]);
    } finally {
      setSlidesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlides();
  }, [loadSlides]);

  return (
    <HeroSlidesContext.Provider value={{ slides, slidesLoading }}>
      {children}
    </HeroSlidesContext.Provider>
  );
}

export function useHeroSlides() {
  const ctx = useContext(HeroSlidesContext);
  if (!ctx) {
    throw new Error("useHeroSlides must be used within a HeroSlidesProvider");
  }
  return ctx;
}
