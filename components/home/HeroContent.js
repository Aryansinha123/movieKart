import { memo, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Radio, Play, Plus } from "lucide-react";
import WatchListButton from "@/components/movie/WatchListButton";
import { getMovieUrl } from "@/utils/slugify";

const LANG_LABELS = {
  hi: "Hindi",
  en: "English",
  te: "Telugu",
  ta: "Tamil",
  ml: "Malayalam",
  kn: "Kannada",
  ko: "Korean",
  ja: "Japanese",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: 0.25,
      ease: "easeIn",
    },
  },
};

export default memo(function HeroContent({ slide, isActive }) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`[Profiler] <HeroContent> render count for slide ${slide.id}: ${renderCount.current}`);

  const rating = slide.vote_average ? slide.vote_average.toFixed(1) : null;
  const watchHref = getMovieUrl(slide.id, slide.title);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate={isActive ? "visible" : "hidden"}
      exit="exit"
      className="relative z-20 max-w-3xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]"
    >
      {/* Accent Badge */}
      <motion.div
        variants={itemVariants}
        style={{
          background: `linear-gradient(135deg, ${slide.accent}22, ${slide.accentSecondary}18)`,
          border: `1px solid ${slide.accent}44`,
          color: slide.accentSecondary || slide.accent,
          willChange: "transform, opacity",
          animation: slide.source === "preferred" ? "language-glow-pulse 2s infinite ease-in-out" : "none",
        }}
        className="inline-flex items-center gap-2 mb-4 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-md"
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
          <Radio size={10} />
        )}
        {slide.badge}
      </motion.div>

      {/* Main Title */}
      <motion.h1
        variants={itemVariants}
        style={{ willChange: "transform, opacity" }}
        className="hero-title text-[clamp(2rem,5vw,4rem)] font-bold leading-[1.05] tracking-tight text-white mb-3 drop-shadow-2xl"
      >
        {slide.title}
      </motion.h1>

      {/* Rating & Genres row */}
      <motion.div
        variants={itemVariants}
        style={{ willChange: "transform, opacity" }}
        className="flex flex-wrap items-center gap-3 mb-4"
      >
        {rating && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            {rating}
            <span className="text-amber-400/70 font-normal text-[10px]">IMDb</span>
          </span>
        )}
        {slide.original_language && (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-white bg-red-500/15 border border-red-500/30 backdrop-blur-sm uppercase tracking-wide">
            {LANG_LABELS[slide.original_language] || slide.original_language.toUpperCase()}
          </span>
        )}
        {slide.genres?.map((genre) => (
          <span
            key={genre}
            className="px-2.5 py-0.5 rounded text-[10px] font-medium text-zinc-300 bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            {genre}
          </span>
        ))}
      </motion.div>

      {/* Overview text */}
      <motion.p
        variants={itemVariants}
        style={{ willChange: "transform, opacity" }}
        className="text-zinc-300/90 text-sm md:text-base leading-relaxed max-w-xl mb-6 line-clamp-3 font-light"
      >
        {slide.overview}
      </motion.p>

      {/* Slide action buttons */}
      <motion.div
        variants={itemVariants}
        style={{ willChange: "transform, opacity" }}
        className="flex flex-wrap gap-3 pointer-events-auto"
      >
        <Link href={watchHref} onClick={() => console.log(`[Client-HeroCarousel] Clicked Watch Now Button Movie ID: ${slide.id}, Title: "${slide.title}"`)}>
          <button
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${slide.accent}, ${slide.accentSecondary})`,
              boxShadow: `0 8px 32px ${slide.accent}44`,
            }}
          >
            <Play size={14} className="fill-white group-hover:scale-110 transition-transform" />
            Watch Now
          </button>
        </Link>

        <WatchListButton
          movieId={slide.id}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/8 hover:bg-white/14 border border-white/15 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Plus size={14} />
          Add to Watchlist
        </WatchListButton>
      </motion.div>
    </motion.div>
  );
});
