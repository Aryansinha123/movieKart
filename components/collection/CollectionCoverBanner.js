"use client";

import { useState } from "react";
import Image from "next/image";

export default function CollectionCoverBanner({ src, alt, gradient = "from-zinc-800 to-black" }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority
      className="object-cover object-center"
      sizes="100vw"
      onError={() => setFailed(true)}
    />
  );
}
