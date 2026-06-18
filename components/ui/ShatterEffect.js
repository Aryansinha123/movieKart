"use client";

import { useEffect, useRef, useState } from "react";

export default function ShatterEffect({
  rect,
  imageUrl,
  duration = 1200, // ms
  onComplete,
  isReversing = false,
  onReverseComplete,
}) {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null);
  const [imageStatus, setImageStatus] = useState("loading"); // "loading" | "ready"
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  // Store callbacks in refs to prevent inline arrow functions in MovieCard
  // from restarting the animation loop.
  const onCompleteRef = useRef(onComplete);
  const onReverseCompleteRef = useRef(onReverseComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onReverseCompleteRef.current = onReverseComplete;
  }, [onReverseComplete]);

  // Load the poster image with CORS support. Fall back gracefully on failure.
  useEffect(() => {
    if (!imageUrl) {
      setImageStatus("ready");
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      setImageStatus("ready");
    };
    img.onerror = () => {
      console.warn("CORS/network restriction on image; using high-fidelity fallback shards.");
      setImageStatus("ready");
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Dimensions of the card
  const width = rect?.width || 260;
  const height = rect?.height || 350;

  // Padding around the card to allow shards to fly outward without clipping
  const padX = 120;
  const padY = 120;
  const canvasWidth = width + padX * 2;
  const canvasHeight = height + padY * 2;

  // Shards and particles state
  const shardsRef = useRef([]);
  const particlesRef = useRef([]);

  // Generate triangulation on mount or rect changes
  useEffect(() => {
    const cols = 5;
    const rows = 6;
    const points = [];

    // 1. Generate grid vertices with random offsets (jitter) for organic glass shards
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const x = (c / cols) * width;
        const y = (r / rows) * height;

        // Keep borders aligned, jitter internal points
        const isBorderX = c === 0 || c === cols;
        const isBorderY = r === 0 || r === rows;
        const jitterX = isBorderX ? 0 : (Math.random() - 0.5) * (width / cols) * 0.7;
        const jitterY = isBorderY ? 0 : (Math.random() - 0.5) * (height / rows) * 0.7;

        points.push({ x: x + jitterX, y: y + jitterY });
      }
    }

    const shards = [];
    const getIndex = (r, c) => r * (cols + 1) + c;

    // 2. Create triangles (two for each grid square)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p0 = points[getIndex(r, c)];
        const p1 = points[getIndex(r, c + 1)];
        const p2 = points[getIndex(r + 1, c)];
        const p3 = points[getIndex(r + 1, c + 1)];

        // Triangle 1
        shards.push(createShard(p0, p1, p2));
        // Triangle 2
        shards.push(createShard(p1, p3, p2));
      }
    }

    // 3. Create particles
    const particles = [];
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 80,
        y: height / 2 + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 250,
        vy: (Math.random() - 0.5) * 250 - 50,
        radius: Math.random() * 2.5 + 1.2,
        color: `hsl(${200 + Math.random() * 60}, 100%, 75%)`, // Cyan/purple glow
        alpha: Math.random() * 0.8 + 0.2,
        decay: Math.random() * 0.8 + 0.4,
      });
    }

    shardsRef.current = shards;
    particlesRef.current = particles;
  }, [width, height]);

  // Create a shard object with physics properties
  function createShard(p0, p1, p2) {
    const cx = (p0.x + p1.x + p2.x) / 3;
    const cy = (p0.y + p1.y + p2.y) / 3;

    // Center offsets
    const r0 = { x: p0.x - cx, y: p0.y - cy };
    const r1 = { x: p1.x - cx, y: p1.y - cy };
    const r2 = { x: p2.x - cx, y: p2.y - cy };

    // Velocity away from center + random scatter
    const dirX = cx - width / 2;
    const dirY = cy - height / 2;
    const dist = Math.sqrt(dirX * dirX + dirY * dirY) || 1;

    // Scatter force
    const force = 120 + Math.random() * 180;
    const vx = (dirX / dist) * force + (Math.random() - 0.5) * 80;
    const vy = (dirY / dist) * force - Math.random() * 100; // upward bias

    return {
      cx,
      cy,
      r0,
      r1,
      r2,
      vx,
      vy,
      vAngle: (Math.random() - 0.5) * 3, // spin rate (rad/s)
      weight: Math.random() * 0.5 + 0.5,
    };
  }

  // Animation Loop
  useEffect(() => {
    if (imageStatus !== "ready") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let active = true;
    startTimeRef.current = null; // Always reset when loop starts/restarts

    const animate = (timestamp) => {
      if (!active) return;

      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      
      // Calculate progress (0.0 to 1.0)
      let progress = elapsed / duration;
      if (progress > 1) progress = 1;

      // Handle Reversing (Undo)
      const currentProgress = isReversing ? 1 - progress : progress;

      // Clear Canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Translate coordinates to draw within card bounds with padding
      ctx.save();
      ctx.translate(padX, padY);

      const t = currentProgress * (duration / 1000); // Time in seconds
      const gravity = 450; // pixels/s^2

      // Draw Glass Shards
      shardsRef.current.forEach((shard) => {
        // Compute position using analytical equation (perfect for reverse)
        const x = shard.cx + shard.vx * t;
        const y = shard.cy + shard.vy * t + 0.5 * gravity * t * t;
        const angle = shard.vAngle * t;

        // Shrink and fade-out smoothly
        const scale = Math.max(0.01, 1 - t * 0.45);
        const opacity = Math.max(0, 1 - t * 1.1);

        if (opacity <= 0) return;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.scale(scale, scale);
        ctx.globalAlpha = opacity;

        // Clip to shard shape
        ctx.beginPath();
        ctx.moveTo(shard.r0.x, shard.r0.y);
        ctx.lineTo(shard.r1.x, shard.r1.y);
        ctx.lineTo(shard.r2.x, shard.r2.y);
        ctx.closePath();

        if (image) {
          ctx.clip();
          // Align image to original coordinates
          ctx.drawImage(image, -shard.cx, -shard.cy, width, height);
        } else {
          // Premium glass fall back: semi-transparent, reflective shards
          const grad = ctx.createLinearGradient(-30, -30, 30, 30);
          grad.addColorStop(0, "rgba(255, 255, 255, 0.16)");
          grad.addColorStop(0.5, "rgba(255, 255, 255, 0.04)");
          grad.addColorStop(1, "rgba(164, 219, 255, 0.08)");
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // Draw crack borders
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
      });

      // Draw Glowing Dust / Sparks
      particlesRef.current.forEach((p) => {
        // Standard particle update
        const px = p.x + p.vx * t;
        const py = p.y + p.vy * t + 0.5 * 180 * t * t; // lighter gravity
        const alpha = Math.max(0, p.alpha * (1 - t * p.decay));

        if (alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        
        // Glow effect
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      });

      // Restore outer translation
      ctx.restore();

      // Check Completion
      if (progress >= 1) {
        active = false;
        if (isReversing) {
          onReverseCompleteRef.current?.();
        } else {
          onCompleteRef.current?.();
        }
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      active = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, [isReversing, duration, imageStatus, image, width, height, canvasWidth, canvasHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      style={{
        position: "absolute",
        top: `-${padY}px`,
        left: `-${padX}px`,
        zIndex: 50,
        pointerEvents: "none",
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
      }}
    />
  );
}
