import Link from "next/link";

export default function HeroSection() {
  return (
    <section
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      className="relative min-h-[500px] flex flex-col items-center justify-center text-center px-8 pt-32 pb-16 bg-[#0a0a0a] rounded-2xl overflow-hidden -mt-20"
    >
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>

      {/* Spotlight glow */}
      <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at top, rgba(220,38,38,0.12) 0%, transparent 65%)" }}
      />

      {/* Film strip */}
      <div className="flex gap-1 mb-8 opacity-30" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="w-[10px] h-[7px] rounded-sm"
            style={{ background: i % 2 === 0 ? "#ef4444" : "#3f3f46", opacity: i % 2 === 0 ? 1 : undefined }}
          />
        ))}
      </div>

      {/* Badge */}
      <div className="inline-flex items-center gap-1.5 mb-7 px-3.5 py-1.5 rounded-full text-[#f87171] text-xs font-medium uppercase tracking-widest"
        style={{ background: "rgba(220,38,38,0.12)", border: "0.5px solid rgba(220,38,38,0.3)" }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full bg-red-500"
          style={{ animation: "pulse-dot 2s infinite" }}
        />
        Now streaming
      </div>

      {/* Heading */}
      <h1
        className="text-[clamp(36px,5vw,56px)] leading-[1.1] tracking-tight text-[#fafafa] max-w-[640px] mb-2"
        style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}
      >
        Build Your Personal<br />
        <em className="italic text-red-500">Movie Universe</em>
      </h1>

      {/* Subheading */}
      <p className="text-[15px] text-[#71717a] max-w-[440px] leading-relaxed mt-4 mb-10 font-light">
        Track watched movies, curate collections, share profiles,
        discover trending films, and get AI-powered recommendations.
      </p>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/#trending">
          <button
            className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-6 py-3 rounded-lg transition-all hover:-translate-y-px active:scale-[0.98]"
          >
            {/* Play icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            Explore Movies
          </button>
        </Link>

        <Link href="/login">
          <button
            className="inline-flex items-center gap-2 bg-transparent text-[#a1a1aa] hover:text-[#e4e4e7] text-sm font-normal px-6 py-3 rounded-lg transition-all hover:-translate-y-px active:scale-[0.98]"
            style={{ border: "0.5px solid #3f3f46" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#71717a"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#3f3f46"}
          >
            {/* Bookmark icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            Create Collection
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div
        className="flex gap-8 mt-14 pt-8"
        style={{ borderTop: "0.5px solid #1f1f1f" }}
        aria-label="Platform stats"
      >
        {[
          { num: "12M+", label: "Films tracked" },
          { num: "840K", label: "Collections" },
          { num: "4.9★", label: "Avg rating" },
        ].map(({ num, label }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <span
              className="text-[22px] text-[#fafafa]"
              style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}
            >
              {num}
            </span>
            <span className="text-[11px] text-[#52525b] uppercase tracking-widest font-medium">
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}