/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useRef, useState, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
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
  Volume2,
  VolumeX,
} from "lucide-react";
import WatchListButton from "@/components/movie/WatchListButton";
import { getMovieUrl } from "@/utils/slugify";
import { getYoutubeEmbedUrl } from "@/lib/trailers";

const BASE_AUTO_PLAY_MS = 12000;
const SWIPE_THRESHOLD = 60;

function getSlideDuration(slide) {
  return 12000;
}

function HeroTrailerPlayer({ videoKey, isActive, onPlaying, isMuted }) {
  const [embedSrc, setEmbedSrc] = useState(null);
  const iframeRef = useRef(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const isMutedRef = useRef(isMuted);
  const hasInteractedRef = useRef(hasInteracted);

  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true);
    };

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

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    hasInteractedRef.current = hasInteracted;
  }, [hasInteracted]);

  useEffect(() => {
    if (!isActive || !videoKey) {
      setEmbedSrc(null);
      return;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const initialMute = isMutedRef.current || !hasInteractedRef.current;
    setEmbedSrc(getYoutubeEmbedUrl(videoKey, origin, initialMute));
  }, [isActive, videoKey]);

  const effectiveMuteState = isMuted || !hasInteracted;

  useEffect(() => {
    if (!iframeRef.current || !iframeRef.current.contentWindow || !embedSrc) return;

    const command = effectiveMuteState ? "mute" : "unMute";
    if (!effectiveMuteState) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "setVolume", args: [100] }),
        "*"
      );
    }
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: "command", func: command, args: [] }),
      "*"
    );
  }, [effectiveMuteState, embedSrc]);

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

const SlideBackground = memo(function SlideBackground({ slide, parallaxX, parallaxY, dragOffset, isCurrent, isOutgoing, isPreload, isMuted, onVideoPlaying }) {
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
      onVideoPlaying?.();
    }, 4500); // 2s banner phase + 2.5s loading buffer

    return () => clearTimeout(fallbackTimer);
  }, [isCurrent, slide.trailerKey, onVideoPlaying]);

  // If the slide is unmounted from our stack, this handles resetting states
  useEffect(() => {
    if (!isCurrent) {
      setVideoPlaying(false);
    }
  }, [isCurrent]);

  // Restrict video loading ONLY to the current slide to prevent stutters, background playing, and audio overlapping
  const shouldLoadTrailer = slide.trailerKey && isCurrent;
  const isVideoVisible = shouldLoadTrailer && showVideo && videoPlaying;

  // Use Overlay Crossfade (outgoing slide stays at opacity 1 beneath incoming slide at zIndex 10)
  const slideOpacity = isCurrent ? 1 : (isOutgoing ? 1 : 0);

  return (
    <motion.div
      animate={{ opacity: slideOpacity }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="absolute inset-0"
      style={{ pointerEvents: isCurrent ? "auto" : "none" }}
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
            className={`object-cover object-center transition-opacity duration-1000 ease-in-out ${
              isVideoVisible ? "opacity-0" : "opacity-100"
            }`}
            sizes="100vw"
          />
        )}

        {/* Video Player */}
        {shouldLoadTrailer && (
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isVideoVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <HeroTrailerPlayer
              videoKey={slide.trailerKey}
              isActive={shouldLoadTrailer}
              onPlaying={() => {
                setVideoPlaying(true);
                onVideoPlaying?.();
              }}
              isMuted={isMuted}
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
});

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.04,
      staggerDirection: -1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
};

const SlideContent = memo(function SlideContent({ slide, isActive }) {
  const rating = slide.vote_average ? slide.vote_average.toFixed(1) : null;
  const watchHref = getMovieUrl(slide.id, slide.title);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate={isActive ? "visible" : "hidden"}
      exit="exit"
      className="relative z-20 max-w-3xl"
    >
      <motion.div
        variants={itemVariants}
        style={{
          background: `linear-gradient(135deg, ${slide.accent}22, ${slide.accentSecondary}18)`,
          border: `1px solid ${slide.accent}44`,
          color: slide.accentSecondary || slide.accent,
          willChange: "transform, opacity",
          animation: slide.source === "preferred" ? "language-glow-pulse 2s infinite ease-in-out" : "none",
        }}
        className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] backdrop-blur-md"
      >
        {slide.source === "preferred" ? (
          <span className="relative flex h-2 w-2 mr-1">
            <span
              className="animate-pulse absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: slide.accent }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: slide.accent }}
            />
          </span>
        ) : slide.badge === "Live Now" || slide.badge === "Now Playing in Theaters" ? (
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
      </motion.div>

      <motion.h1
        variants={itemVariants}
        style={{ willChange: "transform, opacity" }}
        className="hero-title text-[clamp(2.25rem,5.5vw,4.25rem)] font-bold leading-[1.05] tracking-tight text-white mb-4 drop-shadow-2xl"
      >
        {slide.title}
      </motion.h1>

      <motion.div
        variants={itemVariants}
        style={{ willChange: "transform, opacity" }}
        className="flex flex-wrap items-center gap-3 mb-5"
      >
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
      </motion.div>

      <motion.p
        variants={itemVariants}
        style={{ willChange: "transform, opacity" }}
        className="text-zinc-300/90 text-base md:text-lg leading-relaxed max-w-2xl mb-8 line-clamp-3 font-light"
      >
        {slide.overview}
      </motion.p>

      <motion.div
        variants={itemVariants}
        style={{ willChange: "transform, opacity" }}
        className="flex flex-wrap gap-3"
      >
        <Link href={watchHref}>
          <button
            className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg cursor-pointer"
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
          className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-semibold text-white bg-white/8 hover:bg-white/14 border border-white/15 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Plus size={18} />
          Add to Watchlist
        </WatchListButton>
      </motion.div>
    </motion.div>
  );
});

export default function HeroCarousel() {
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [prevCurrent, setPrevCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [currentVideoReady, setCurrentVideoReady] = useState(false);

  // Reset video ready status when transitioning to a new slide
  useEffect(() => {
    setCurrentVideoReady(false);
  }, [current]);

  // Delayed state updater for prevCurrent to handle slide fade-out transitions (800ms Snappy Transition)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPrevCurrent(current);
    }, 800);
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

  // Keyboard arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        prev();
      } else if (e.key === "ArrowRight") {
        next();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [next, prev]);

  // Stable callback for video ready notification
  const handleVideoPlaying = useCallback(() => {
    setCurrentVideoReady(true);
  }, []);

  const slide = slides[current];
  const slideDuration = slide ? getSlideDuration(slide) : BASE_AUTO_PLAY_MS;

  // Autoplay countdown timer starts only when active slide is playing and not hovered
  const isTimerActive = isPlaying && !isHovered && (!slide?.trailerKey || currentVideoReady);

  useEffect(() => {
    if (!isTimerActive || slides.length <= 1 || isDragging.current) return;
    
    const timer = setTimeout(next, slideDuration);
    return () => clearTimeout(timer);
  }, [isTimerActive, current, slideDuration, next, slides.length]);

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
            <div
              key={s.id}
              style={{
                zIndex,
                pointerEvents,
                "--slide-accent-pulse": `${s.accent}33`,
                "--slide-accent-border": `${s.accent}44`,
                "--slide-accent-glow": `${s.accent}77`,
                "--slide-accent-glow-border": `${s.accent}aa`,
              }}
              className="absolute inset-0"
            >
              {/* Background click details */}
              <Link href={watchHref} className="absolute inset-0 block cursor-pointer z-0">
                <SlideBackground
                  slide={s}
                  parallaxX={parallaxX}
                  parallaxY={parallaxY}
                  dragOffset={dragOffset}
                  isCurrent={isCurrent}
                  isOutgoing={isOutgoing}
                  isPreload={isPreload}
                  isMuted={isMuted}
                  onVideoPlaying={handleVideoPlaying}
                />
              </Link>

              {/* Text content locked to this specific slide (pre-rendered and smooth) */}
              <div className="relative z-10 h-full max-w-[1600px] mx-auto px-6 md:px-10 flex items-end pb-28 md:pb-32 pointer-events-none">
                <div className="pointer-events-auto">
                  <SlideContent slide={s} isActive={isCurrent} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-24 md:bottom-28 left-6 md:left-10 z-30 flex items-center gap-2">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="group relative h-1 rounded-full overflow-hidden transition-all duration-500 cursor-pointer"
            style={{ width: i === current ? 40 : 16 }}
          >
            <span className="absolute inset-0 bg-white/20 rounded-full" />
            <span
              className="absolute inset-y-0 left-0 right-0 rounded-full origin-left"
              style={{
                background: `linear-gradient(90deg, ${s.accent}, ${s.accentSecondary})`,
                transform: i === current ? undefined : "scaleX(0)",
                animation: i === current && isTimerActive ? `progress-bar ${slideDuration}ms linear forwards` : "none",
                animationPlayState: isTimerActive ? "running" : "paused",
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
            className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? "Pause autoplay" : "Resume autoplay"}
            className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
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
            className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <ChevronRight size={20} />
          </button>

          <button
            onClick={() => setIsMuted((m) => !m)}
            aria-label={isMuted ? "Unmute sound" : "Mute sound"}
            className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(0,0,0,0.6)]" />
    </section>
  );
}
