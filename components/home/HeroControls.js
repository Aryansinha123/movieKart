import { memo, useRef } from "react";
import { ChevronLeft, Pause, Play, ChevronRight, VolumeX, Volume2 } from "lucide-react";

export default memo(function HeroControls({
  slides,
  current,
  isPlaying,
  isMuted,
  isTimerActive,
  slideDuration,
  onGoTo,
  onPrev,
  onNext,
  onTogglePlay,
  onToggleMute
}) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`[Profiler] <HeroControls> render count: ${renderCount.current}`);

  return (
    <>
      {/* Pagination Timeline Indicators */}
      <div className="absolute bottom-24 md:bottom-28 left-6 md:left-10 z-30 flex items-center gap-2">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onGoTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="group relative h-1 rounded-full overflow-hidden transition-all duration-500 cursor-pointer"
            style={{ width: i === current ? 40 : 16 }}
          >
            <span className="absolute inset-0 bg-white/20 rounded-full" />
            <span
              className="absolute inset-y-0 left-0 right-0 rounded-full origin-left animate-progress-layer"
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

      {/* Center Unified Control Panel */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
        <div className="glass-panel flex items-center gap-1 px-2 py-2 rounded-2xl">
          <button
            onClick={onPrev}
            aria-label="Previous slide"
            className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause autoplay" : "Resume autoplay"}
            className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-current" />}
          </button>

          <span className="px-3 text-xs font-medium text-zinc-400 tabular-nums min-w-[4rem] text-center select-none">
            {String(current + 1).padStart(2, "0")}
            <span className="text-zinc-600 mx-1">/</span>
            {String(slides.length).padStart(2, "0")}
          </span>

          <button
            onClick={onNext}
            aria-label="Next slide"
            className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <ChevronRight size={20} />
          </button>

          <button
            onClick={onToggleMute}
            aria-label={isMuted ? "Unmute sound" : "Mute sound"}
            className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>
    </>
  );
});
