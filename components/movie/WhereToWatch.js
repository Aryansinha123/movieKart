import Image from "next/image";
import { ExternalLink } from "lucide-react";

function ProviderLogo({ provider, size = "md" }) {
  const dim = size === "lg" ? "w-12 h-12 rounded-xl" : "w-8 h-8 md:w-10 md:h-10 rounded-lg";
  const imgSize = size === "lg" ? 48 : 40;
  const hasLink = Boolean(provider.watchUrl);

  const image = (
    <Image
      src={`https://image.tmdb.org/t/p/w200${provider.logo_path}`}
      alt={provider.provider_name}
      width={imgSize}
      height={imgSize}
      className="w-full h-full object-cover"
    />
  );

  if (!hasLink) {
    return (
      <div
        className={`relative ${dim} overflow-hidden border border-zinc-700/50`}
        title={provider.provider_name}
      >
        {image}
      </div>
    );
  }

  return (
    <a
      href={provider.watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative ${dim} overflow-hidden border border-zinc-700/50 hover:border-cyan-500/40 hover:scale-105 transition-all duration-200 cursor-pointer`}
      title={`Watch on ${provider.provider_name}`}
      aria-label={`Watch on ${provider.provider_name}`}
    >
      {image}
      <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <ExternalLink size={size === "lg" ? 16 : 14} className="text-white" />
      </span>
    </a>
  );
}

export default function WhereToWatch({ providers, watchLink, variant = "desktop" }) {
  if (!providers?.length) return null;

  if (variant === "mobile") {
    return (
      <div className="px-6 py-8 sm:hidden border-b border-zinc-900 bg-zinc-950">
        <h3 className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-4">
          Where to Watch
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          {providers.map((provider) => (
            <ProviderLogo key={provider.provider_id} provider={provider} size="lg" />
          ))}
          {watchLink && (
            <a
              href={watchLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mt-2 text-center text-sm font-bold text-cyan-400 bg-cyan-400/10 py-3 rounded-xl border border-cyan-400/20"
            >
              Stream Now ↗
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 hidden sm:block">
      <h3 className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-3">
        Where to Watch
      </h3>
      <div className="flex flex-wrap items-center gap-3">
        {providers.map((provider) => (
          <ProviderLogo key={provider.provider_id} provider={provider} />
        ))}
        {watchLink && (
          <a
            href={watchLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 bg-cyan-400/10 px-3 py-1.5 rounded-full border border-cyan-400/20"
          >
            STREAM ↗
          </a>
        )}
      </div>
    </div>
  );
}
