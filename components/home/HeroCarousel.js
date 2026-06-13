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

const BASE_AUTO_PLAY_MS = 12000;
const TRAILER_AUTO_PLAY_MS = 12000;
const SWIPE_THRESHOLD = 60;

function getSlideDuration(slide) {
  return 12000;
}

function HeroTrailerPlayer({ videoKey, isActive, onPlaying }) {
  const [embedSrc, setEmbedSrc] = useState(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!isActive || !videoKey) {
      setEmbedSrc(null);
      return;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setEmbedSrc(getYoutubeEmbedUrl(videoKey, origin));
  }, [isActive, videoKey]);

  useEffect(() => {
    if (!embedSrc) return;

    const handleMessage = (event) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        
        // YouTube API playing states:
        // - infoDelivery/initialDelivery with playerState = 1 (playing)
        // - onStateChange with info = 1 (playing)
        const isPlayingState = 
          (data.event === "infoDelivery" && data.info?.playerState === 1) ||
          (data.event === "initialDelivery" && data.info?.playerState === 1) ||
          (data.event === "onStateChange" && data.info === 1);

        if (isPlayingState) {
          onPlaying?.();
        }
      } catch (e) {
        // Ignore parser or irrelevant messages
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [embedSrc, onPlaying]);

  if (!embedSrc) return null;

  return (
    <div className="hero-trailer-wrap">
      <iframe
        ref={iframeRef}
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

function SlideBackground({ slide, parallaxX, parallaxY, dragOffset, isCurrent, isOutgoing, isPreload }) {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Trigger video showing after 2 seconds if it's the current slide
  useEffect(() => {
    if (!isCurrent) {
      setShowVideo(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowVideo(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isCurrent]);

  // Fallback timeout to ensure trailer is displayed even if postMessage fails/is blocked (e.g. by adblockers)
  useEffect(() => {
    if (!isCurrent || !slide.trailerKey) return;

    const fallbackTimer = setTimeout(() => {
      setVideoPlaying(true);
    }, 4500); // 2s banner phase + 2.5s loading buffer

    return () => clearTimeout(fallbackTimer);
  }, [isCurrent, slide.trailerKey]);

  // If the slide is unmounted from our stack, this handles resetting states
  useEffect(() => {
    if (!isCurrent) {
      setVideoPlaying(false);
    }
  }, [isCurrent]);

  const shouldLoadTrailer = slide.trailerKey && (isCurrent || isPreload || isOutgoing);
  const isVideoVisible = shouldLoadTrailer && showVideo && videoPlaying;

  const slideOpacity = isCurrent ? 1 : 0;

  return (
    <motion.div
      animate={{ opacity: slideOpacity }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
      className="absolute inset-0"
    >
      <motion.div
        className="absolute inset-[-4%]"
        style={{ x: parallaxX, y: parallaxY }}
        animate={{ scale: isCurrent ? 1.05 : 1.0 }}
        transition={{ duration: 12, ease: "linear" }}
      >
        {/* Backdrop image */}
        {slide.backdrop && (
          <Image
            src={slide.backdrop}
            alt=""
            fill
            priority
            className={`object-cover object-center transition-opacity duration-1000 ${
              isVideoVisible ? "opacity-0" : "opacity-100"
            }`}
            sizes="100vw"
          />
        )}

        {/* Video Player */}
        {shouldLoadTrailer && (
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isVideoVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <HeroTrailerPlayer
              videoKey={slide.trailerKey}
              isActive={shouldLoadTrailer}
              onPlaying={() => setVideoPlaying(true)}
            />
          </div>
        )}
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
    </motion.div>
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
  const [prevCurrent, setPrevCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  // Delayed state updater for prevCurrent to handle slide fade-out transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      setPrevCurrent(current);
    }, 1200); // 1200ms is the duration of our slide crossfade transition
    return () => clearTimeout(timer);
  }, [current]);

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
          const seen = new Set();
          const uniqueSlides = data.slides.filter((s) => {
            if (seen.has(s.id)) return false;
            seen.add(s.id);
            return true;
          });
          setSlides(uniqueSlides);
          setLoading(false);
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
      {/* Stacked slide backgrounds with custom preloading and crossfading */}
      <div className="absolute inset-0 z-0">
        {slides.map((s, idx) => {
          const isCurrent = idx === current;
          const isOutgoing = idx === prevCurrent && !isCurrent;
          const isPreload = idx === (current + 1) % slides.length && !isCurrent;

          if (!isCurrent && !isOutgoing && !isPreload) return null;

          const zIndex = isCurrent ? 10 : (isOutgoing ? 5 : 0);
          const pointerEvents = isCurrent ? "auto" : "none";
          const watchHref = getMovieUrl(s.id, s.title);

          return (
            <Link
              key={s.id}
              href={watchHref}
              style={{ zIndex, pointerEvents }}
              className="absolute inset-0 block cursor-pointer"
            >
              <SlideBackground
                slide={s}
                parallaxX={parallaxX}
                parallaxY={parallaxY}
                dragOffset={dragOffset}
                isCurrent={isCurrent}
                isOutgoing={isOutgoing}
                isPreload={isPreload}
              />
            </Link>
          );
        })}
      </div>

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
