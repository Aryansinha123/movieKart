"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
} from "framer-motion";
import {
  Play,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pause,
  Star,
  Radio,
} from "lucide-react";
import WatchListButton from "@/components/movie/WatchListButton";
import { getMovieUrl } from "@/utils/slugify";
import { getYoutubeEmbedUrl } from "@/lib/trailers";

const BASE_AUTO_PLAY_MS = 6500;
const TRAILER_AUTO_PLAY_MS = 12000;
const SWIPE_THRESHOLD = 60;

function getSlideDuration(slide) {
  return slide?.trailerKey ? TRAILER_AUTO_PLAY_MS : BASE_AUTO_PLAY_MS;
}

function HeroTrailerPlayer({ videoKey, isActive }) {
  const [embedSrc, setEmbedSrc] = useState(null);

  useEffect(() => {
    if (!isActive || !videoKey) {
      setEmbedSrc(null);
      return;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setEmbedSrc(getYoutubeEmbedUrl(videoKey, origin));
  }, [isActive, videoKey]);

  if (!embedSrc) return null;

  return (
    <div className="hero-trailer-wrap">
      <iframe
        src={embedSrc}
        title="Official trailer"
        className="hero-trailer-iframe"
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}

function SlideBackground({ slide, parallaxX, parallaxY, dragOffset, isActive }) {
  return (
    <div className="absolute inset-0">
      {/* Trailer — no CSS transform on ancestors (YouTube embed requirement) */}
      {slide.trailerKey && (
        <HeroTrailerPlayer videoKey={slide.trailerKey} isActive={isActive} />
      )}

      {/* Backdrop image with parallax */}
      <motion.div
        key={slide.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 z-0"
        style={{ x: dragOffset * 0.15 }}
      >
        <motion.div className="absolute inset-[-4%]" style={{ x: parallaxX, y: parallaxY }}>
          {slide.backdrop && (
            <Image
              src={slide.backdrop}
              alt=""
              fill
              priority
              className={`object-cover object-center transition-opacity duration-700 ${
                slide.trailerKey ? "opacity-50" : "opacity-100"
              }`}
              sizes="100vw"
            />
          )}
        </motion.div>
      </motion.div>

      {/* Cinematic overlays */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-r from-black via-black/70 to-black/20 pointer-events-none" />
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-[#050505] via-transparent to-black/40 pointer-events-none" />
      <div
        className="absolute inset-0 z-[2] opacity-40 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 20% 50%, ${slide.accent}33, transparent 70%)`,
        }}
      />
      <div className="absolute inset-0 z-[2] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDIiLz4KPC9zdmc+')] opacity-60 pointer-events-none" />
    </div>
  );
}

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

function SlideContent({ slide, isActive }) {
  const rating = slide.vote_average ? slide.vote_average.toFixed(1) : null;
  const watchHref = getMovieUrl(slide.id, slide.title);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 40 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-20 max-w-3xl"
    >
      <div
        className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] backdrop-blur-md"
        style={{
          background: `linear-gradient(135deg, ${slide.accent}22, ${slide.accentSecondary}18)`,
          border: `1px solid ${slide.accent}44`,
          color: slide.accentSecondary || slide.accent,
        }}
      >
        {slide.badge === "Live Now" || slide.badge === "Now Playing in Theaters" ? (
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: slide.accent }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: slide.accent }}
            />
          </span>
        ) : (
          <Radio size={12} />
        )}
        {slide.badge}
      </div>

      <h1 className="hero-title text-[clamp(2.25rem,5.5vw,4.25rem)] font-bold leading-[1.05] tracking-tight text-white mb-4 drop-shadow-2xl">
        {slide.title}
      </h1>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        {rating && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-semibold">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            {rating}
            <span className="text-amber-400/70 font-normal text-xs">IMDb</span>
          </span>
        )}
        {slide.genres?.map((genre) => (
          <span
            key={genre}
            className="px-3 py-1 rounded-lg text-xs font-medium text-zinc-300 bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            {genre}
          </span>
        ))}
      </div>

      <p className="text-zinc-300/90 text-base md:text-lg leading-relaxed max-w-2xl mb-8 line-clamp-3 font-light">
        {slide.overview}
      </p>

      <div className="flex flex-wrap gap-3">
        <Link href={watchHref}>
          <button
            className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${slide.accent}, ${slide.accentSecondary})`,
              boxShadow: `0 8px 32px ${slide.accent}44`,
            }}
          >
            <Play size={18} className="fill-white group-hover:scale-110 transition-transform" />
            Watch Now
          </button>
        </Link>

        <WatchListButton
          movieId={slide.id}
          className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-semibold text-white bg-white/8 hover:bg-white/14 border border-white/15 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={18} />
          Add to Watchlist
        </WatchListButton>
      </div>
    </motion.div>
  );
}

export default function HeroCarousel() {
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const containerRef = useRef(null);
  const dragStartX = useRef(0);
  const isDragging = useRef(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });
  const parallaxX = useTransform(springX, [-0.5, 0.5], [-24, 24]);
  const parallaxY = useTransform(springY, [-0.5, 0.5], [-16, 16]);

  useEffect(() => {
    async function loadSlides() {
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
          setSlides(data.slides);
          setLoading(false);
          const withTrailers = await enrichSlidesWithTrailers(data.slides);
          setSlides(withTrailers);
          return;
        }
      } catch {
        setSlides([]);
      } finally {
        setLoading(false);
      }
    }
    loadSlides();
  }, []);

  const goTo = useCallback(
    (index) => {
      if (slides.length === 0) return;
      setCurrent((index + slides.length) % slides.length);
    },
    [slides.length]
  );

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  const slide = slides[current];
  const slideDuration = slide ? getSlideDuration(slide) : BASE_AUTO_PLAY_MS;

  useEffect(() => {
    if (!isPlaying || isHovered || slides.length <= 1 || isDragging.current) return;
    const timer = setInterval(next, slideDuration);
    return () => clearInterval(timer);
  }, [isPlaying, isHovered, slides.length, next, current, slideDuration]);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

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

  if (loading) {
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
    <section
      ref={containerRef}
      className="relative w-full h-[70vh] md:h-[88vh] overflow-hidden bg-[#050505] select-none touch-pan-y"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        mouseX.set(0);
        mouseY.set(0);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-label="Featured content carousel"
    >
      <AnimatePresence mode="wait">
        {slide && (
          <SlideBackground
            key={slide.id}
            slide={slide}
            parallaxX={parallaxX}
            parallaxY={parallaxY}
            dragOffset={dragOffset}
            isActive
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 h-full max-w-[1600px] mx-auto px-6 md:px-10 flex items-end pb-28 md:pb-32">
        <AnimatePresence mode="wait">
          <SlideContent key={slide.id} slide={slide} isActive />
        </AnimatePresence>
      </div>

      <div className="absolute bottom-24 md:bottom-28 left-6 md:left-10 z-30 flex items-center gap-2">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="group relative h-1 rounded-full overflow-hidden transition-all duration-500"
            style={{ width: i === current ? 40 : 16 }}
          >
            <span className="absolute inset-0 bg-white/20 rounded-full" />
            <motion.span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: `linear-gradient(90deg, ${s.accent}, ${s.accentSecondary})` }}
              initial={false}
              animate={{
                width: i === current ? "100%" : "0%",
                opacity: i === current ? 1 : 0.4,
              }}
              transition={{
                duration: i === current && isPlaying ? slideDuration / 1000 : 0.3,
                ease: "linear",
              }}
            />
          </button>
        ))}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
        <div className="glass-panel flex items-center gap-1 px-2 py-2 rounded-2xl">
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? "Pause autoplay" : "Resume autoplay"}
            className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-current" />}
          </button>

          <span className="px-3 text-xs font-medium text-zinc-400 tabular-nums min-w-[4rem] text-center">
            {String(current + 1).padStart(2, "0")}
            <span className="text-zinc-600 mx-1">/</span>
            {String(slides.length).padStart(2, "0")}
          </span>

          <button
            onClick={next}
            aria-label="Next slide"
            className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(0,0,0,0.6)]" />
    </section>
  );
}
