"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Maximize2,
  Minimize2
} from "lucide-react";

export default function GallerySection({ backdrops, movieTitle }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Zoom and Pan States
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Maximum items to display on grid
  const GRID_LIMIT = 6;
  const displayImages = backdrops.slice(0, GRID_LIMIT);
  const remainingCount = backdrops.length - GRID_LIMIT;

  // Reset zoom & pan on image change
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handlePrev = () => {
    resetZoom();
    setCurrentIndex((prev) => (prev === 0 ? backdrops.length - 1 : prev - 1));
  };

  const handleNext = () => {
    resetZoom();
    setCurrentIndex((prev) => (prev === backdrops.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (idx) => {
    resetZoom();
    setCurrentIndex(idx);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, currentIndex, backdrops.length]);

  // Zoom adjustments
  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const zoomOut = () => {
    setScale((prev) => {
      const nextScale = Math.max(prev - 0.5, 1);
      if (nextScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return nextScale;
    });
  };

  const toggleDoubleTabZoom = (e) => {
    e.preventDefault();
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
      // Optional: Center zoom on double click coordinate relative to image
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        const offsetX = e.clientX - (rect.left + rect.width / 2);
        const offsetY = e.clientY - (rect.top + rect.height / 2);
        // Move towards the click point slightly
        setPosition({ x: -offsetX * 1.5, y: -offsetY * 1.5 });
      }
    }
  };

  // Dragging logic
  const handleStart = (clientX, clientY) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleMove = (clientX, clientY) => {
    if (!isDragging || scale <= 1) return;
    
    // Calculate new position
    let newX = clientX - dragStart.current.x;
    let newY = clientY - dragStart.current.y;

    // Bounds checking can be added if desired, but free-dragging feels more premium
    // combined with visual container bounds. For simplicity, we allow free dragging.
    setPosition({ x: newX, y: newY });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Mouse drag handlers
  const onMouseDown = (e) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const onMouseMove = (e) => {
    handleMove(e.clientX, e.clientY);
  };

  // Touch drag handlers
  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    }
  };

  const onTouchMove = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-6 md:px-10 pt-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          Gallery <span className="text-zinc-500 text-sm font-normal">({backdrops.length})</span>
        </h2>
        {backdrops.length > GRID_LIMIT && (
          <button 
            onClick={() => { setCurrentIndex(0); setIsOpen(true); }}
            className="text-sm font-semibold text-red-500 hover:text-red-400 transition-colors cursor-pointer"
          >
            View All Photos
          </button>
        )}
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {displayImages.map((img, idx) => {
          const isLastGridItem = idx === GRID_LIMIT - 1;
          const showOverlay = isLastGridItem && remainingCount > 0;

          return (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                setIsOpen(true);
              }}
              className="aspect-video relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 group focus:outline-none focus:ring-2 focus:ring-red-500/50 text-left w-full cursor-pointer"
            >
              <Image
                src={`https://image.tmdb.org/t/p/w780${img.file_path}`}
                alt={`${movieTitle} Backdrop Screenshot ${idx + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              
              {showOverlay && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center transition-all group-hover:bg-black/60">
                  <span className="text-2xl md:text-3xl font-extrabold text-white">+{remainingCount}</span>
                  <span className="text-xs text-zinc-400 font-semibold tracking-wider uppercase mt-1">View More</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex flex-col bg-black/95 backdrop-blur-md select-none animate-in fade-in duration-200"
          ref={containerRef}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-black/40 backdrop-blur-md z-50">
            <div>
              <h3 className="font-semibold text-white text-sm md:text-base line-clamp-1">{movieTitle}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Screenshot {currentIndex + 1} of {backdrops.length}
              </p>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center gap-1.5 md:gap-3 bg-zinc-900/60 p-1.5 rounded-full border border-zinc-800/80">
              <button 
                onClick={zoomOut}
                disabled={scale <= 1}
                className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              
              <span className="text-xs font-mono font-bold text-zinc-400 min-w-[36px] text-center">
                {scale.toFixed(1)}x
              </span>

              <button 
                onClick={zoomIn}
                disabled={scale >= 4}
                className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>

              {(scale > 1 || position.x !== 0 || position.y !== 0) && (
                <button 
                  onClick={resetZoom}
                  className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-all cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw size={16} />
                </button>
              )}

              <div className="h-4 w-px bg-zinc-800 mx-1" />

              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full bg-red-950/40 text-red-400 hover:text-white hover:bg-red-600 transition-all cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Main Carousel Area */}
          <div 
            className="flex-1 relative flex items-center justify-center overflow-hidden cursor-crosshair"
            onMouseMove={onMouseMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchMove={onTouchMove}
            onTouchEnd={handleEnd}
          >
            {/* Prev Arrow */}
            <button
              onClick={handlePrev}
              className="absolute left-4 md:left-6 z-50 p-3 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-white hover:scale-105 active:scale-95 transition-all shadow-xl backdrop-blur-sm cursor-pointer"
              title="Previous Photo"
            >
              <ChevronLeft size={24} />
            </button>

            {/* Interactive Image Container */}
            <div 
              className="relative w-full h-full max-w-[90vw] max-h-[70vh] flex items-center justify-center"
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
            >
              <img
                ref={imageRef}
                src={`https://image.tmdb.org/t/p/w1280${backdrops[currentIndex].file_path}`}
                alt={`${movieTitle} - Screenshot ${currentIndex + 1}`}
                onDoubleClick={toggleDoubleTabZoom}
                className={`max-w-full max-h-full object-contain select-none pointer-events-auto transition-transform duration-200 ease-out`}
                style={{
                  transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
                  cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
                  transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
                draggable={false}
              />
            </div>

            {/* Next Arrow */}
            <button
              onClick={handleNext}
              className="absolute right-4 md:right-6 z-50 p-3 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-white hover:scale-105 active:scale-95 transition-all shadow-xl backdrop-blur-sm cursor-pointer"
              title="Next Photo"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Thumbnails Navigation Strip */}
          <div className="bg-black/80 backdrop-blur-md border-t border-zinc-900 px-6 py-4 z-50">
            <div className="max-w-4xl mx-auto flex items-center gap-3 overflow-x-auto py-1 no-scrollbar justify-start md:justify-center">
              {backdrops.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => handleThumbnailClick(idx)}
                  className={`flex-shrink-0 w-20 md:w-24 aspect-video relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    idx === currentIndex 
                      ? "border-red-500 scale-105 ring-2 ring-red-500/20" 
                      : "border-zinc-800 opacity-55 hover:opacity-100 hover:border-zinc-700"
                  }`}
                >
                  <img
                    src={`https://image.tmdb.org/t/p/w300${img.file_path}`}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
