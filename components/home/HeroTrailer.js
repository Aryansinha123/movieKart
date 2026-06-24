import { useEffect, useRef, useState, memo } from "react";
import { getYoutubeEmbedUrl } from "@/lib/trailers";

/**
 * HeroTrailer — persistent iframe player for the hero carousel.
 *
 * Design decisions:
 * - Each HeroTrailer is mounted ONCE and toggled visible/invisible by
 *   `isCurrent`. This prevents black flashes from iframe teardown/recreation.
 * - YouTube's postMessage API (`playVideo`, `pauseVideo`, `mute`) is used
 *   because the IFrame Player API isn't available cross-origin in this setup.
 * - `sendCommandWithRetry` retries the initial play command every 400ms for
 *   up to 10 seconds to handle the case where the iframe hasn't buffered yet
 *   when `isCurrent` first becomes true.
 */
export default memo(function HeroTrailer({
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

  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(
    `[Profiler] <HeroTrailer> render count for ${videoKey}: ${renderCount.current}`
  );

  // Set embed URL once on mount (or if videoKey changes)
  useEffect(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    setEmbedSrc(getYoutubeEmbedUrl(videoKey, origin, true));
    loadStart.current = performance.now();
    // Reset state when video key changes
    setVideoPlaying(false);
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
   * Retry sending `playVideo` every 400ms until the player acks it
   * (detected via the window message listener setting `videoPlaying`).
   * Capped at 10 s to avoid endless loops on blocked autoplay.
   */
  const sendCommandWithRetry = (func, args = []) => {
    clearInterval(retryRef.current);
    let attempts = 0;
    const MAX_ATTEMPTS = 25; // 25 × 400ms = 10 s cap
    retryRef.current = setInterval(() => {
      if (videoPlaying || attempts >= MAX_ATTEMPTS) {
        clearInterval(retryRef.current);
        return;
      }
      sendCommand(func, args);
      attempts++;
    }, 400);
  };

  const effectiveMuteState = isMuted || !hasInteracted;

  // Sync play/pause state & handle retry on slide activation
  useEffect(() => {
    if (!embedSrc) return;

    if (isCurrent) {
      // Start retrying playVideo until the player confirms playback
      sendCommandWithRetry("playVideo");
      sendCommand(effectiveMuteState ? "mute" : "unMute");
      sendCommand("setVolume", [100]);
    } else {
      clearInterval(retryRef.current);
      sendCommand("pauseVideo");
      sendCommand("mute");
      setVideoPlaying(false);
    }

    return () => clearInterval(retryRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrent, embedSrc]);

  // Sync mute state independently
  useEffect(() => {
    if (!embedSrc || !isCurrent) return;
    sendCommand(effectiveMuteState ? "mute" : "unMute");
    if (!effectiveMuteState) {
      sendCommand("setVolume", [100]);
    }
  }, [effectiveMuteState, isCurrent, embedSrc]); // eslint-disable-line

  // Listen for YouTube player state messages
  useEffect(() => {
    if (!embedSrc) return;

    const handleMessage = (event) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        // playerState === 1 means PLAYING
        const isPlayingState =
          (data.event === "infoDelivery" && data.info?.playerState === 1) ||
          (data.event === "initialDelivery" && data.info?.playerState === 1) ||
          (data.event === "onStateChange" && data.info === 1);

        if (isPlayingState) {
          // Stop the retry loop once confirmed playing
          clearInterval(retryRef.current);

          if (!isLoaded.current) {
            isLoaded.current = true;
            if (loadStart.current) {
              const loadTime = performance.now() - loadStart.current;
              console.log(
                `[Profiler] Trailer ${videoKey} load time: ${loadTime.toFixed(2)}ms`
              );
            }
          }
          setVideoPlaying(true);
          onPlaying?.();
        }
      } catch {
        // Ignore JSON parse errors
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [embedSrc, onPlaying, videoKey]);

  // Cleanup retry interval on unmount
  useEffect(() => {
    return () => clearInterval(retryRef.current);
  }, []);

  if (!embedSrc) return null;

  return (
    <div
      className="absolute inset-0 transition-opacity duration-[800ms] ease-in-out hero-trailer-wrap"
      style={{
        opacity: isCurrent && videoPlaying ? 1 : 0,
        pointerEvents: "none",
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
