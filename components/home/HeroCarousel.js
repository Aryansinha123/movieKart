/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useRef, useState, Profiler } from "react";
import { useHeroSlides } from "@/components/providers/HeroSlidesProvider";
import HeroSlide from "./HeroSlide";
import HeroTrailer from "./HeroTrailer";
import HeroControls from "./HeroControls";

const BASE_AUTO_PLAY_MS = 12000;
const SWIPE_THRESHOLD = 60;

function getSlideDuration() {
  return 12000;
}

export default function HeroCarousel() {
  // ── Slides from global persistent cache ─────────────────────────
  const { slides, slidesLoading } = useHeroSlides();

  // ── Local UI state ───────────────────────────────────────────────
  const [current, setCurrent] = useState(0);
  const [prevCurrent, setPrevCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [currentVideoReady, setCurrentVideoReady] = useState(false);
  const [loadedTrailerKeys, setLoadedTrailerKeys] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);
  // Tracks which slide index is actively playing video (for poster fade)
  const [playingIdx, setPlayingIdx] = useState(null);

  const containerRef = useRef(null);
  const dragStartX = useRef(0);
  const isDragging = useRef(false);

  const rafRef = useRef(null);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const targetX = useRef(0);
  const targetY = useRef(0);

  // Profile commit logs
  const onRenderCallback = (id, phase, actualDuration) => {
    console.log(`[Profiler] ${id} commitment [${phase}] actual duration: ${actualDuration.toFixed(2)}ms`);
  };

  // Detect mobile & touch devices to disable mouse move parallax
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.matchMedia("(max-width: 768px)").matches ||
          "ontouchstart" in window ||
          navigator.maxTouchPoints > 0
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // RequestAnimationFrame Parallax loop
  const updateParallax = () => {
    currentX.current += (targetX.current - currentX.current) * 0.08;
    currentY.current += (targetY.current - currentY.current) * 0.08;

    if (containerRef.current) {
      containerRef.current.style.setProperty("--parallax-x", `${currentX.current.toFixed(2)}px`);
      containerRef.current.style.setProperty("--parallax-y", `${currentY.current.toFixed(2)}px`);
    }

    if (
      Math.abs(targetX.current - currentX.current) > 0.01 ||
      Math.abs(targetY.current - currentY.current) > 0.01
    ) {
      rafRef.current = requestAnimationFrame(updateParallax);
    } else {
      rafRef.current = null;
    }
  };

  const handleMouseMove = (e) => {
    if (isMobile || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pctX = (e.clientX - rect.left) / rect.width - 0.5;
    const pctY = (e.clientY - rect.top) / rect.height - 0.5;
    targetX.current = pctX * 20;
    targetY.current = pctY * 16;
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(updateParallax);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    targetX.current = 0;
    targetY.current = 0;
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(updateParallax);
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Cache preloaded trailer keys in a Set
  useEffect(() => {
    if (slides.length === 0) return;
    const currentKey = slides[current]?.trailerKey;
    const nextIdx = (current + 1) % slides.length;
    const nextKey = slides[nextIdx]?.trailerKey;

    setLoadedTrailerKeys((prev) => {
      const nextKeys = new Set(prev);
      if (currentKey) nextKeys.add(currentKey);
      if (nextKey) nextKeys.add(nextKey);
      return nextKeys;
    });
  }, [current, slides]);

  // Reset video ready state AND playing index on slide change
  useEffect(() => {
    setCurrentVideoReady(false);
    setPlayingIdx(null);
  }, [current]);

  // Handle slide fade-out delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setPrevCurrent(current);
    }, 800);
    return () => clearTimeout(timer);
  }, [current]);

  // Global user interaction observer
  useEffect(() => {
    const handleInteraction = () => setHasInteracted(true);
    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("touchstart", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });
    if (typeof navigator !== "undefined" && navigator.userActivation?.hasBeenActive) {
      setHasInteracted(true);
    }
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  // Clamp `current` when slides shrink
  useEffect(() => {
    if (slides.length > 0 && current >= slides.length) setCurrent(0);
  }, [slides.length, current]);

  const goTo = useCallback(
    (index) => {
      if (slides.length === 0) return;
      setCurrent((index + slides.length) % slides.length);
    },
    [slides.length]
  );

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [next, prev]);

  // Called by HeroTrailer when YouTube confirms playback (playerState=1)
  const handleVideoPlaying = useCallback(
    (idx) => {
      setCurrentVideoReady(true);
      setPlayingIdx(idx);
      console.log(`[HeroCarousel] Trailer confirmed playing for slide index: ${idx}`);
    },
    []
  );

  const slide = slides[current];
  const slideDuration = slide ? getSlideDuration(slide) : BASE_AUTO_PLAY_MS;
  const isTimerActive = isPlaying && !isHovered && (!slide?.trailerKey || currentVideoReady);
  // True when the current slide's trailer is confirmed playing
  const isTrailerPlaying = playingIdx === current;

  useEffect(() => {
    if (!isTimerActive || slides.length <= 1 || isDragging.current) return;
    const timer = setTimeout(next, slideDuration);
    return () => clearTimeout(timer);
  }, [isTimerActive, current, slideDuration, next, slides.length]);

  const handlePointerDown = (e) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    setDragOffset(0);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    setDragOffset(e.clientX - dragStartX.current);
  };

  const handlePointerUp = (e) => {
    if (!isDragging.current) return;
    const delta = e.clientX - dragStartX.current;
    isDragging.current = false;
    setDragOffset(0);
    if (delta > SWIPE_THRESHOLD) prev();
    else if (delta < -SWIPE_THRESHOLD) next();
  };

  if (slidesLoading) {
    return (
      <section className="relative w-full h-[70vh] md:h-[88vh] bg-[#050505] overflow-hidden">
        <div className="absolute inset-0 hero-shimmer" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
        </div>
      </section>
    );
  }

  if (slides.length === 0) return null;

  return (
    <Profiler id="HeroCarousel" onRender={onRenderCallback}>
      <section
        ref={containerRef}
        className="relative w-full h-[70vh] md:h-[88vh] overflow-hidden bg-[#050505] select-none touch-pan-y"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label="Featured content carousel"
      >
        <style>{`
          @keyframes progress-bar {
            from { transform: scaleX(0); }
            to { transform: scaleX(1); }
          }
          @keyframes language-glow-pulse {
            0%, 100% {
              box-shadow: 0 0 4px var(--slide-accent-pulse), inset 0 0 2px var(--slide-accent-pulse);
              border-color: var(--slide-accent-border);
            }
            50% {
              box-shadow: 0 0 12px var(--slide-accent-glow), inset 0 0 6px var(--slide-accent-glow);
              border-color: var(--slide-accent-glow-border);
            }
          }
        `}</style>

        {/* ── LAYER 1: Slide backdrops (poster images + scrims) ── z-0 */}
        <div className="absolute inset-0 z-0">
          {slides.map((s, idx) => {
            const isCurrent = idx === current;
            const isOutgoing = idx === prevCurrent && !isCurrent;
            const isPreload = idx === (current + 1) % slides.length && !isCurrent;
            if (!isCurrent && !isOutgoing && !isPreload) return null;
            const zIndex = isCurrent ? 10 : isOutgoing ? 5 : 0;
            return (
              <div
                key={s.id}
                style={{
                  zIndex,
                  "--slide-accent-pulse": `${s.accent}33`,
                  "--slide-accent-border": `${s.accent}44`,
                  "--slide-accent-glow": `${s.accent}77`,
                  "--slide-accent-glow-border": `${s.accent}aa`,
                }}
                className="absolute inset-0"
              >
                <HeroSlide
                  slide={s}
                  isCurrent={isCurrent}
                  isOutgoing={isOutgoing}
                  isPreload={isPreload}
                  dragOffset={dragOffset}
                  // Pass trailer-playing state so the poster scrim can fade out
                  isTrailerPlaying={isCurrent && isTrailerPlaying}
                />
              </div>
            );
          })}
        </div>

        {/* ── LAYER 2: Trailer iframe pool ── z-20 (above poster z-10, below content z-30) */}
        <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
          {slides.map((s, idx) => {
            const isCurrent = idx === current;
            const isPreload = idx === (current + 1) % slides.length;
            const shouldMount =
              s.trailerKey && (loadedTrailerKeys.has(s.trailerKey) || isCurrent || isPreload);
            if (!shouldMount) return null;
            return (
              <HeroTrailer
                key={s.id}
                slideIdx={idx}
                videoKey={s.trailerKey}
                isCurrent={isCurrent}
                isCarouselPlaying={isPlaying}
                isMuted={isMuted}
                hasInteracted={hasInteracted}
                onPlaying={handleVideoPlaying}
              />
            );
          })}
        </div>

        {/* ── LAYER 3: Controls & timeline ── z-30 */}
        <HeroControls
          slides={slides}
          current={current}
          isPlaying={isPlaying}
          isMuted={isMuted}
          isTimerActive={isTimerActive}
          slideDuration={slideDuration}
          onGoTo={goTo}
          onPrev={prev}
          onNext={next}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onToggleMute={() => setIsMuted((m) => !m)}
        />

        {/* ── LAYER 4: Edge vignette (decorative, no z, natural stacking) */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(0,0,0,0.6)]" />
      </section>
    </Profiler>
  );
}
