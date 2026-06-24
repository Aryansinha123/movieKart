import { useEffect, useRef, useState, memo } from "react";
import { getYoutubeEmbedUrl } from "@/lib/trailers";

export default memo(function HeroTrailer({ videoKey, isCurrent, isMuted, hasInteracted, onPlaying }) {
  const iframeRef = useRef(null);
  const [embedSrc, setEmbedSrc] = useState(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const loadStart = useRef(null);
  const isLoaded = useRef(false);

  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`[Profiler] <HeroTrailer> render count for ${videoKey}: ${renderCount.current}`);

  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setEmbedSrc(getYoutubeEmbedUrl(videoKey, origin, true));
    loadStart.current = performance.now();
  }, [videoKey]);

  const sendCommand = (func, args = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
      } catch (e) {
        // Suppress cross-origin warnings
      }
    }
  };

  const effectiveMuteState = isMuted || !hasInteracted;

  // Sync play/pause state
  useEffect(() => {
    if (!embedSrc) return;

    if (isCurrent) {
      sendCommand("playVideo");
      const command = effectiveMuteState ? "mute" : "unMute";
      sendCommand(command);
      sendCommand("setVolume", [100]);
    } else {
      sendCommand("pauseVideo");
      sendCommand("mute");
      setVideoPlaying(false); // Reset visual overlay playing state when slide becomes inactive
    }
  }, [isCurrent, embedSrc, effectiveMuteState]);

  // Sync mute state on volume changes
  useEffect(() => {
    if (!embedSrc || !isCurrent) return;
    const command = effectiveMuteState ? "mute" : "unMute";
    sendCommand(command);
    if (!effectiveMuteState) {
      sendCommand("setVolume", [100]);
    }
  }, [effectiveMuteState, isCurrent, embedSrc]);

  // Handle messages from the iframe API
  useEffect(() => {
    if (!embedSrc) return;

    const handleMessage = (event) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        // Player state playing is 1
        const isPlayingState = 
          (data.event === "infoDelivery" && data.info?.playerState === 1) ||
          (data.event === "initialDelivery" && data.info?.playerState === 1) ||
          (data.event === "onStateChange" && data.info === 1);

        if (isPlayingState) {
          if (!isLoaded.current) {
            isLoaded.current = true;
            if (loadStart.current) {
              const loadTime = performance.now() - loadStart.current;
              console.log(`[Profiler] Trailer ${videoKey} load time: ${loadTime.toFixed(2)}ms`);
            }
          }
          setVideoPlaying(true);
          onPlaying?.();
        }
      } catch (e) {
        // Ignore JSON errors
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [embedSrc, videoPlaying, onPlaying, videoKey]);

  if (!embedSrc) return null;

  return (
    <div 
      className="absolute inset-0 transition-opacity duration-800 ease-in-out hero-trailer-wrap"
      style={{ 
        opacity: (isCurrent && videoPlaying) ? 1 : 0,
        pointerEvents: "none"
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
