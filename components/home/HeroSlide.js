import { memo, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import HeroBackground from "./HeroBackground";
import HeroContent from "./HeroContent";
import { getMovieUrl } from "@/utils/slugify";

export default memo(function HeroSlide({
  slide,
  isCurrent,
  isOutgoing,
  isPreload,
  dragOffset
}) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`[Profiler] <HeroSlide> render count for slide ${slide.id}: ${renderCount.current}`);

  const slideOpacity = isCurrent ? 1 : (isOutgoing ? 0 : 0);
  const watchHref = getMovieUrl(slide.id, slide.title);

  return (
    <motion.div
      style={{
        opacity: slideOpacity,
        pointerEvents: isCurrent ? "auto" : "none",
        willChange: "opacity",
      }}
      animate={{ opacity: slideOpacity }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="absolute inset-0"
    >
      <Link 
        href={watchHref} 
        onClick={() => console.log(`[Client-HeroCarousel] Clicked Slide Background Movie ID: ${slide.id}, Title: "${slide.title}"`)} 
        className="absolute inset-0 block cursor-pointer z-0"
      >
        <HeroBackground
          slide={slide}
          isCurrent={isCurrent}
          isPreload={isPreload}
          dragOffset={dragOffset}
        />
      </Link>

      <div className="hero-content-layer h-full max-w-[1600px] mx-auto px-6 md:px-10 flex items-end pb-28 md:pb-32 pointer-events-none">
        <div className="pointer-events-auto">
          <HeroContent slide={slide} isActive={isCurrent} />
        </div>
      </div>
    </motion.div>
  );
});
