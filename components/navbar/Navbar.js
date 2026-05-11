"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, User, LogOut, ChevronDown, Bookmark, Eye } from "lucide-react";
import Image from "next/image";

function getUserFromToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload?.exp && payload.exp * 1000 > Date.now()) return payload;
    return null;
  } catch {
    return null;
  }
}

export default function Navbar() {
  const router = useRouter();
  // Keep the first render identical between server and client to avoid hydration mismatch.
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setIsMounted(true);
    const token = localStorage.getItem("token");
    const parsed = getUserFromToken(token);
    if (!parsed && token) {
      localStorage.removeItem("token");
      setUser(null);
      return;
    }

    setUser(parsed);

    async function hydrateUser() {
      if (!token) return;
      try {
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (res.status === 431) {
          localStorage.removeItem("token");
          if (!cancelled) setUser(null);
          return;
        }

        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) return;
        if (!cancelled) setUser((prev) => ({ ...prev, ...data.user }));
      } catch {
        // ignore
      }
    }

    hydrateUser();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
    setDropdownOpen(false);
    router.push("/");
  }

  // Get user initial for avatar
  const userInitial = user?.username
    ? user.username.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : "U";

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800">
      <Link href="/">
        <h1 className="text-2xl font-bold text-red-500 hover:text-red-400 transition-colors cursor-pointer">
          MovieKart
        </h1>
      </Link>

      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="text-zinc-300 hover:text-white transition-colors"
        >
          Home
        </Link>
        <Link
          href="/discover"
          className="text-zinc-300 hover:text-white transition-colors"
        >
          Discover
        </Link>
        <Link
          href="/collection"
          className="text-zinc-300 hover:text-white transition-colors"
        >
          Collections
        </Link>
        {isMounted && user && (
          <Link
            href="/watchlist"
            className="text-zinc-300 hover:text-white transition-colors flex items-center gap-2"
          >
            <Bookmark size={16} />
            Watchlist
          </Link>
        )}
        {isMounted && user && (
          <Link
            href="/watched"
            className="text-zinc-300 hover:text-white transition-colors flex items-center gap-2"
          >
            <Eye size={16} />
            Watched
          </Link>
        )}

        {/* Auth section */}
        {!isMounted ? (
          <div className="w-[90px] h-9 rounded-lg bg-zinc-800 animate-pulse" />
        ) : user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              id="profile-dropdown-trigger"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-all duration-200 group"
            >
              {/* Avatar circle */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-xs font-bold text-white shadow-md overflow-hidden">
                {user?.avatar ? (
                  <Image
                    src={user.avatar}
                    alt="Avatar"
                    width={28}
                    height={28}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  userInitial
                )}
              </div>
              <span className="text-sm text-zinc-200 group-hover:text-white transition-colors max-w-[100px] truncate">
                {user.username || "User"}
              </span>
              <ChevronDown
                size={14}
                className={`text-zinc-400 transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-zinc-800">
                  <p className="text-sm font-medium text-white truncate">
                    {user.username || "User"}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    href="/watchlist"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <Bookmark size={16} />
                    Watchlist
                  </Link>
                  <Link
                    href="/watched"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <Eye size={16} />
                    Watched
                  </Link>
                  <Link
                    href={`/profile/${user?.username || "user"}`}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <User size={16} />
                    My Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <User size={16} />
                    Edit Profile
                  </Link>
                  <button
                    id="logout-button"
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-zinc-800 transition-colors"
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            id="login-button"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25 active:scale-[0.97]"
          >
            <LogIn size={16} />
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}