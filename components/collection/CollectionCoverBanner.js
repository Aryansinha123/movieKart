"use client";

import { useState } from "react";
import Image from "next/image";

export default function CollectionCoverBanner({
  src,
  alt,
  gradient = "from-zinc-800 to-black",
  bannerStyle = {},
}) {
  const [failed, setFailed] = useState(false);

  const styleGradient = bannerStyle?.gradient
    ? getGradientClass(bannerStyle.gradient)
    : gradient;

  if (!src || failed) {
    return (
      <div className={`absolute inset-0 bg-gradient-to-br ${styleGradient}`}>
        {bannerStyle?.themeColor && (
          <div
            className="absolute inset-0 opacity-30"
            style={{ background: `radial-gradient(circle at 30% 50%, ${bannerStyle.themeColor}, transparent 70%)` }}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
        onError={() => setFailed(true)}
      />
      {bannerStyle?.themeColor && (
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${bannerStyle.themeColor}40, transparent)` }}
        />
      )}
    </>
  );
}

function getGradientClass(id) {
  const map = {
    "purple-cyan": "from-purple-900 via-violet-800 to-cyan-900",
    "rose-amber": "from-rose-900 via-orange-800 to-amber-900",
    "emerald-teal": "from-emerald-900 via-green-800 to-teal-900",
    "blue-indigo": "from-blue-900 via-indigo-800 to-slate-900",
    "fuchsia-pink": "from-fuchsia-900 via-pink-800 to-rose-900",
    zinc: "from-zinc-900 via-zinc-800 to-black",
  };
  return map[id] || "from-zinc-800 to-black";
}
