import { useEffect, useRef, useState, memo } from "react";
import { getYoutubeEmbedUrl } from "@/lib/trailers";

/**
 * HeroTrailer — persistent iframe player.
 *
 * Architecture:
 * - Rendered inside a z-20 container in HeroCarousel (above poster z-10).
 * - YouTube postMessage commands are sent for play/pause/mute.
 * - A 2-second fallback timer shows the trailer even if YouTube never fires
 *   playerState=1 (happens with bare embeds without IFrame API JS library).
 */
export default memo(function HeroTrailer({
  slideIdx,
  videoKey,
  isCurrent,
  isCarouselPlaying,
  isMuted,
  hasInteracted,
  onPlaying,
}) {
  const iframeRef = useRef(null);
  const [embedSrc, setEmbedSrc] = useState(null);
  // videoVisible: true once we're confident the video is playing (postMessage OR fallback timer)
  const [videoVisible, setVideoVisible] = useState(false);
  const videoVisibleRef = useRef(false);
  const loadStart = useRef(null);
  const retryRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  // ── Embed URL setup ──────────────────────────────────────────────
  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = getYoutubeEmbedUrl(videoKey, origin, /* startMuted= */ true);
    setEmbedSrc(url);
    loadStart.current = performance.now();
    // Reset when video key changes
    setVideoVisible(false);
    videoVisibleRef.current = false;
    console.log(`[HeroTrailer] Embed URL set for key=${videoKey}: ${url}`);
  }, [videoKey]);

  // ── postMessage helper ───────────────────────────────────────────
  const sendCommand = (func, args = []) => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
        console.log(`[HeroTrailer] postMessage sent: ${func}`, args);
      } catch {
        // suppress cross-origin errors
      }
    }
  };

  /**
   * Marks the trailer as visible and notifies parent.
   * Called either by postMessage confirmation OR fallback timer.
   */
  const markVisible = (source) => {
    if (videoVisibleRef.current) return;
    videoVisibleRef.current = true;
    setVideoVisible(true);
    clearInterval(retryRef.current);
    clearTimeout(fallbackTimerRef.current);
    const loadTime = loadStart.current ? (performance.now() - loadStart.current).toFixed(0) : "?";
    console.log(`[HeroTrailer] Trailer VISIBLE via ${source} for key=${videoKey} (${loadTime}ms)`);
    onPlaying?.(slideIdx);
  };

  /**
   * Retry playVideo every 400ms until confirmed.
   * Capped at 10s (25 attempts).
   */
  const startPlayWithRetry = () => {
    clearInterval(retryRef.current);
    let attempts = 0;
    retryRef.current = setInterval(() => {
      if (videoVisibleRef.current || attempts >= 25) {
        clearInterval(retryRef.current);
        return;
      }
      sendCommand("playVideo");
      attempts++;
    }, 400);
  };

  /**
   * Start 2-second fallback: if YouTube never confirms playerState=1
   * (which happens when the IFrame API JS library isn't loaded),
   * we assume the video is playing and show it anyway.
   */
  const startFallbackTimer = () => {
    clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = setTimeout(() => {
      if (!videoVisibleRef.current) {
        console.log(`[HeroTrailer] Fallback timer fired — showing trailer for key=${videoKey}`);
        markVisible("fallback-timer");
      }
    }, 2000);
  };

  // ── Play/pause sync on slide activation ─────────────────────────
  useEffect(() => {
    if (!embedSrc) return;

    const effectiveMuted = isMuted || !hasInteracted;

    if (isCurrent) {
      sendCommand("playVideo");
      sendCommand(effectiveMuted ? "mute" : "unMute");
      sendCommand("setVolume", [100]);
      startPlayWithRetry();
      startFallbackTimer();
    } else {
      clearInterval(retryRef.current);
      clearTimeout(fallbackTimerRef.current);
      sendCommand("pauseVideo");
      sendCommand("mute");
      // Reset visibility for when this slide becomes current again
      setVideoVisible(false);
      videoVisibleRef.current = false;
    }

    return () => {
      clearInterval(retryRef.current);
      clearTimeout(fallbackTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrent, embedSrc]);

  // ── Pause/resume when carousel play state toggles ────────────────
  useEffect(() => {
    if (!embedSrc || !isCurrent) return;
    if (isCarouselPlaying === false) {
      sendCommand("pauseVideo");
      console.log("[HeroTrailer] Carousel paused — pausing trailer");
    } else {
      sendCommand("playVideo");
      console.log("[HeroTrailer] Carousel resumed — resuming trailer");
    }
  }, [isCarouselPlaying, isCurrent, embedSrc]); // eslint-disable-line

  // ── Mute sync ────────────────────────────────────────────────────
  useEffect(() => {
    if (!embedSrc || !isCurrent) return;
    const effectiveMuted = isMuted || !hasInteracted;
    sendCommand(effectiveMuted ? "mute" : "unMute");
    if (!effectiveMuted) sendCommand("setVolume", [100]);
  }, [isMuted, hasInteracted, isCurrent, embedSrc]); // eslint-disable-line

  // ── Listen for YouTube playerState postMessage events ────────────
  useEffect(() => {
    if (!embedSrc) return;

    const handleMessage = (event) => {
      // Validate the message is from our iframe
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;

      let data;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      const playerState =
        data.info?.playerState ??
        (data.event === "onStateChange" ? data.info : undefined);

      console.log(`[HeroTrailer] postMessage received: event=${data.event} playerState=${playerState}`);

      // playerState 1 = PLAYING
      if (playerState === 1) {
        markVisible("postMessage-playerState=1");
      }

      // playerState -1 = UNSTARTED (video loaded, not yet playing) — attempt play
      if (playerState === -1 && isCurrent) {
        sendCommand("playVideo");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedSrc, slideIdx, isCurrent]);

  // ── Cleanup on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(retryRef.current);
      clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  if (!embedSrc) return null;

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{
        // Fade in when visible, instant fade out when changing slides
        opacity: isCurrent && videoVisible ? 1 : 0,
        transition: isCurrent ? "opacity 800ms ease-in-out" : "none",
      }}
    >
      <iframe
        ref={iframeRef}
        src={embedSrc}
        title="Movie trailer"
        className="hero-trailer-iframe"
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
});
