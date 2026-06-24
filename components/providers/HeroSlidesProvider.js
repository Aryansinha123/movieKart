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

function dedupeById(arr) {
  const seen = new Set();
  return arr.filter((s) => {
    if (!s?.id || seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export function HeroSlidesProvider({ children }) {
  const [slides, setSlides] = useState([]);
  const [slidesLoading, setSlidesLoading] = useState(true);
  // Only lock once we have successfully loaded slides
  const hasSlidesRef = useRef(false);
  const retryCountRef = useRef(0);

  const loadSlides = useCallback(async () => {
    // Skip if we already have slides successfully loaded
    if (hasSlidesRef.current) return;

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
        // Lock — we have slides, never re-fetch
        hasSlidesRef.current = true;
        retryCountRef.current = 0;

        const uniqueSlides = dedupeById(data.slides);

        // Show slides immediately so carousel appears without waiting for trailers
        setSlides(uniqueSlides);
        setSlidesLoading(false);

        // Enrich with trailers in the background (non-blocking)
        enrichSlidesWithTrailers(uniqueSlides)
          .then((withTrailers) => setSlides(dedupeById(withTrailers)))
          .catch(() => {}); // trailer enrichment failure is non-fatal

        return;
      }

      // API responded but returned empty/error — schedule retry
      throw new Error(data?.message || "Hero API returned empty slides");

    } catch (err) {
      console.error("[HeroSlidesProvider] Failed to load slides:", err.message);

      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        const delay = RETRY_DELAY_MS * retryCountRef.current;
        console.log(
          `[HeroSlidesProvider] Retrying in ${delay}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})...`
        );
        setTimeout(loadSlides, delay);
      } else {
        // All retries exhausted — stop spinner, show nothing
        console.error("[HeroSlidesProvider] All retries exhausted. Giving up.");
        setSlidesLoading(false);
      }
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
