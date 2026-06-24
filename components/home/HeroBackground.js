import { memo, useRef } from "react";
import Image from "next/image";

export default memo(function HeroBackground({ slide, isCurrent, isPreload, dragOffset }) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`[Profiler] <HeroBackground> render count for slide ${slide.id}: ${renderCount.current}`);

  const imgStart = useRef(performance.now());
  const handleImageLoad = () => {
    const duration = performance.now() - imgStart.current;
    console.log(`[Profiler] Image ${slide.id} load time: ${duration.toFixed(2)}ms`);
  };

  return (
    <div className="absolute inset-0 z-0 select-none pointer-events-none">
      {/* GPU Accelerated Parallax & Drag Translation Image Layer */}
      <div 
        style={{
          transform: `translate3d(calc(var(--parallax-x, 0px) + ${dragOffset * 0.12}px), var(--parallax-y, 0px), 0)`,
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden"
        }}
        className="absolute inset-[-4%] z-0"
      >
        {slide.backdrop && (
          <Image
            src={slide.backdrop}
            alt=""
            fill
            priority={isCurrent}
            loading={isCurrent ? undefined : (isPreload ? "eager" : "lazy")}
            onLoad={handleImageLoad}
            className="object-cover object-center"
            sizes="100vw"
          />
        )}
      </div>

      {/* Scrim Overlay Layers (above image, below text) */}
      <div className="absolute inset-0 z-[5] pointer-events-none">
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
    </div>
  );
});
