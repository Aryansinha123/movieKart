import { memo, useRef } from "react";
import Image from "next/image";

export default memo(function HeroBackground({
  slide,
  isCurrent,
  isPreload,
  dragOffset,
  isTrailerPlaying,
}) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(
    `[HeroBackground] render #${renderCount.current} | id=${slide.id} | isTrailerPlaying=${isTrailerPlaying}`
  );

  const imgStart = useRef(performance.now());
  const handleImageLoad = () => {
    const duration = performance.now() - imgStart.current;
    console.log(`[HeroBackground] Image ${slide.id} loaded in ${duration.toFixed(0)}ms`);
  };

  return (
    <div className="absolute inset-0 z-0 select-none pointer-events-none">
      {/* GPU-accelerated parallax image layer */}
      <div
        style={{
          transform: `translate3d(calc(var(--parallax-x, 0px) + ${dragOffset * 0.12}px), var(--parallax-y, 0px), 0)`,
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          // Fade poster out when trailer is playing (Netflix-style crossfade)
          opacity: isTrailerPlaying ? 0 : 1,
          transition: "opacity 800ms ease-in-out",
        }}
        className="absolute inset-[-4%] z-0"
      >
        {slide.backdrop && (
          <Image
            src={slide.backdrop}
            alt=""
            fill
            priority={isCurrent}
            loading={isCurrent ? undefined : isPreload ? "eager" : "lazy"}
            onLoad={handleImageLoad}
            className="object-cover object-center"
            sizes="100vw"
          />
        )}
      </div>

      {/* Scrim overlay layers — fade out when trailer plays */}
      <div
        className="absolute inset-0 z-[5] pointer-events-none"
        style={{
          opacity: isTrailerPlaying ? 0 : 1,
          transition: "opacity 800ms ease-in-out",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/20 to-black/50" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(ellipse 70% 55% at 18% 55%, ${slide.accent}33, transparent 70%)`,
          }}
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDIiLz4KPC9zdmc+')] opacity-50" />
      </div>

      {/*
        Persistent bottom+left gradient for text readability.
        This stays visible even when trailer plays so text remains legible.
      */}
      <div className="absolute inset-0 z-[6] pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
      </div>
    </div>
  );
});
