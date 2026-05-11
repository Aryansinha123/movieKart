export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-zinc-900 border-b border-zinc-800">
      <h1 className="text-2xl font-bold text-red-500">
        MovieKart
      </h1>

      <div className="flex gap-6">
        <button>Home</button>
        <button>Discover</button>
        <button>Collections</button>
        <button>Profile</button>
      </div>
    </nav>
  );
}