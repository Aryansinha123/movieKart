import { useEffect, useRef, useState, memo } from "react";
import { getYoutubeEmbedUrl } from "@/lib/trailers";

/**
 * HeroTrailer — persistent iframe player for the hero carousel.
 *
 * z-index note: This component renders inside a z-20 container in HeroCarousel.
 * The CSS class hero-trailer-wrap previously set z-index:0 via globals.css — that
 * class is no longer applied here to avoid z-index fights. Layout is handled by
 * the parent container (absolute inset-0 z-20 in HeroCarousel).
 *
 * Netflix-style flow:
 *   1. iframe loads silently in background (opacity: 0)
 *   2. YouTube postMessage playerState=1 fires → videoPlaying = true
 *   3. Opacity transitions to 1 over 800ms
 *   4. HeroSlide poster scrims fade out (via isTrailerPlaying prop)
 */
export default memo(function HeroTrailer({
  slideIdx,
  videoKey,
  isCurrent,
  isMuted,
  hasInteracted,
  onPlaying,
}) {
  const iframeRef = useRef(null);
  const [embedSrc, setEmbedSrc] = useState(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const loadStart = useRef(null);
  const isLoaded = useRef(false);
  const retryRef = useRef(null);
  // Track whether videoPlaying is true in a ref for the retry callback
  const videoPlayingRef = useRef(false);

  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(
    `[HeroTrailer] render #${renderCount.current} | key=${videoKey} | isCurrent=${isCurrent} | videoPlaying=${videoPlaying}`
  );

  // Set embed URL once on mount (or if videoKey changes)
  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setEmbedSrc(getYoutubeEmbedUrl(videoKey, origin, true));
    loadStart.current = performance.now();
    // Reset state when video key changes
    setVideoPlaying(false);
    videoPlayingRef.current = false;
    isLoaded.current = false;
  }, [videoKey]);

  // ── postMessage helper ────────────────────────────────────────────
  const sendCommand = (func, args = []) => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
      } catch {
        // Suppress cross-origin errors
      }
    }
  };

  /**
   * Retry playVideo every 400ms until YouTube confirms state=1.
   * Capped at 10 s (25 attempts) to avoid infinite loops on blocked autoplay.
   */
  const sendCommandWithRetry = (func, args = []) => {
    clearInterval(retryRef.current);
    let attempts = 0;
    const MAX_ATTEMPTS = 25; // 25 × 400ms = 10s cap
    retryRef.current = setInterval(() => {
      if (videoPlayingRef.current || attempts >= MAX_ATTEMPTS) {
        clearInterval(retryRef.current);
        return;
      }
      sendCommand(func, args);
      attempts++;
    }, 400);
  };

  const effectiveMuteState = isMuted || !hasInteracted;

  // Sync play/pause on slide activation — start retry on becoming current
  useEffect(() => {
    if (!embedSrc) return;

    if (isCurrent) {
      sendCommandWithRetry("playVideo");
      sendCommand(effectiveMuteState ? "mute" : "unMute");
      sendCommand("setVolume", [100]);
    } else {
      clearInterval(retryRef.current);
      sendCommand("pauseVideo");
      sendCommand("mute");
      setVideoPlaying(false);
      videoPlayingRef.current = false;
    }

    return () => clearInterval(retryRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrent, embedSrc]);

  // Sync mute state independently
  useEffect(() => {
    if (!embedSrc || !isCurrent) return;
    sendCommand(effectiveMuteState ? "mute" : "unMute");
    if (!effectiveMuteState) sendCommand("setVolume", [100]);
  }, [effectiveMuteState, isCurrent, embedSrc]); // eslint-disable-line

  // Listen for YouTube player state messages
  useEffect(() => {
    if (!embedSrc) return;

    const handleMessage = (event) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        // playerState === 1 means PLAYING
        const isPlayingState =
          (data.event === "infoDelivery" && data.info?.playerState === 1) ||
          (data.event === "initialDelivery" && data.info?.playerState === 1) ||
          (data.event === "onStateChange" && data.info === 1);

        if (isPlayingState && !videoPlayingRef.current) {
          clearInterval(retryRef.current);
          videoPlayingRef.current = true;
          setVideoPlaying(true);

          if (!isLoaded.current) {
            isLoaded.current = true;
            if (loadStart.current) {
              const loadTime = performance.now() - loadStart.current;
              console.log(`[HeroTrailer] Trailer ${videoKey} confirmed playing. Load time: ${loadTime.toFixed(0)}ms`);
            }
          }

          // Notify parent with the slide index so it knows which slide is playing
          onPlaying?.(slideIdx);
        }
      } catch {
        // Ignore JSON parse errors
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [embedSrc, onPlaying, videoKey, slideIdx]);

  // Cleanup retry interval on unmount
  useEffect(() => {
    return () => clearInterval(retryRef.current);
  }, []);

  if (!embedSrc) return null;

  return (
    // No hero-trailer-wrap class — that class sets z-index:0 which fights the parent z-20
    <div
      className="absolute inset-0 transition-opacity duration-[800ms] ease-in-out overflow-hidden pointer-events-none"
      style={{
        opacity: isCurrent && videoPlaying ? 1 : 0,
      }}
    >
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
});
