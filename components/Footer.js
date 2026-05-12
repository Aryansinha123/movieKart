import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-900 bg-black py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start">
          <Link href="/" className="text-xl font-black text-red-500 tracking-tighter">
            MovieKart
          </Link>
          <p className="text-zinc-500 text-xs mt-2 font-medium">
            Next-gen cinematic discovery engine.
          </p>
        </div>

        <div className="text-zinc-600 text-[11px] font-medium tracking-widest uppercase text-center md:text-right">
          <p>© 2026 MovieKart. All rights reserved.</p>
          <p className="mt-1">
            Made with <span className="text-red-500">♥</span> by{" "}
            <span className="text-zinc-400">Aryan Sinha</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
