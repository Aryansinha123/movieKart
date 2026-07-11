import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export default function Breadcrumbs({ items = [] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="w-full max-w-6xl mx-auto px-6 md:px-10 pt-6 pb-2 text-zinc-500 text-xs md:text-sm relative z-30">
      <ol className="flex flex-wrap items-center gap-1.5 md:gap-2">
        <li className="flex items-center">
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <Home size={14} aria-hidden="true" />
            <span>Home</span>
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5 md:gap-2">
              <ChevronRight size={12} className="text-zinc-700 shrink-0" aria-hidden="true" />
              {isLast ? (
                <span className="text-zinc-300 font-medium truncate max-w-[180px] sm:max-w-xs md:max-w-md" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-white transition-colors truncate max-w-[120px] sm:max-w-xs"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
