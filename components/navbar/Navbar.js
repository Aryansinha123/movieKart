/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogIn, User, LogOut, ChevronDown, Bookmark, Eye, Sparkles, Menu, X, Settings, Heart } from "lucide-react";
import Image from "next/image";
import UserSearch from "@/components/navbar/UserSearch";
import MovieSearch from "@/components/navbar/MovieSearch";

function getUserFromToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload?.exp || payload.exp * 1000 > Date.now()) return payload;
    return null;
  } catch {
    return null;
  }
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  // Keep the first render identical between server and client to avoid hydration mismatch.
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function loadNotifications() {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (e) {}
  }

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

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target) && !e.target.closest('#mobile-menu-trigger')) {
        setMobileMenuOpen(false);
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

  async function handleMarkAllAsRead() {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {}
  }

  async function handleNotificationClick(n) {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationIds: [n._id] }),
      });
      setNotifications((prev) =>
        prev.map((item) => (item._id === n._id ? { ...item, read: true } : item))
      );
    } catch (e) {}
    setNotificationsOpen(false);
    if (n.collectionId) {
      router.push(`/collection/${n.collectionId}`);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Get user initial for avatar
  const userInitial = user?.username
    ? user.username.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : "U";

  return (
    <nav className={`sticky top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 transition-all duration-300 ${
      isScrolled 
        ? "bg-zinc-900 backdrop-blur-md border-b border-zinc-800 shadow-lg" 
        : "bg-black/60 backdrop-blur-sm border-transparent"
    }`}>
      <Link href="/" className="flex items-center">
        {/* Desktop: Show text name */}
        <h1 className="hidden md:block text-2xl font-bold text-red-500 hover:text-red-400 transition-colors cursor-pointer">
          MovieKart
        </h1>
        {/* Mobile: Show logo icon */}
        <Image
          src="/icon.png"
          alt="MovieKart"
          width={36}
          height={36}
          className="md:hidden rounded-lg shadow-md shadow-red-500/20 hover:shadow-red-500/40 transition-shadow"
        />
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden lg:flex items-center gap-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors group"
        >
          <Sparkles size={14} className="text-purple-400 group-hover:text-purple-300 transition-colors" />
          <span className="font-medium">Home</span>
        </Link>
        {isMounted && user && (
          <Link
            href="/feed"
            className="text-zinc-300 hover:text-white transition-colors flex items-center gap-2"
          >
            Feed
          </Link>
        )}
        <Link
          href="/collections"
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
        {isMounted && user && (
          <Link
            href="/favorites"
            className="text-zinc-300 hover:text-white transition-colors flex items-center gap-2"
          >
            <Heart size={16} />
            Favorites
          </Link>
        )}

        {/* Search */}
        {isMounted && user && (pathname === "/" ? <UserSearch /> : <MovieSearch />)}

        {/* Notifications Bell */}
        {isMounted && user && (
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-zinc-900 animate-pulse" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-750 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-purple-400 hover:text-purple-300 font-bold"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/60 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-500">No notifications yet.</div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n._id}
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full text-left p-3.5 hover:bg-zinc-800/40 transition-colors flex gap-2 items-start ${
                          !n.read ? "bg-purple-950/10 border-l-2 border-purple-500" : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-300 leading-normal">{n.message}</p>
                          <span className="text-[10px] text-zinc-550 block mt-1.5">
                            {new Date(n.createdAt).toLocaleDateString()}{" "}
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
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
              <span className="text-sm text-zinc-200 group-hover:text-white transition-colors max-w-[100px] truncate hidden sm:inline">
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
                    href="/favorites"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <Heart size={16} />
                    Favorites
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
                    <Settings size={16} />
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

      {/* Mobile Navigation Trigger */}
      <div className="flex lg:hidden items-center gap-4">
        {isMounted && user && (pathname === "/" ? <UserSearch /> : <MovieSearch />)}
        <button
          id="mobile-menu-trigger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div 
          ref={mobileMenuRef}
          className="absolute top-full left-0 right-0 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800 p-6 flex flex-col gap-6 lg:hidden animate-in slide-in-from-top-4 duration-300 z-50 shadow-2xl"
        >
          {/* Brand name at top of mobile menu */}
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 pb-4 border-b border-zinc-800"
          >
            <Image
              src="/icon.png"
              alt="MovieKart"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-red-500 to-rose-400 bg-clip-text text-transparent">
              MovieKart
            </span>
          </Link>

          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 text-lg font-medium text-zinc-300 hover:text-white transition-colors"
          >
            <Sparkles size={20} className="text-purple-400" />
            Home
          </Link>
          {isMounted && user && (
            <Link
              href="/feed"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-3"
            >
              <User size={20} className="text-zinc-400" />
              Feed
            </Link>
          )}
          <Link
            href="/collections"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-3"
          >
            <Bookmark size={20} className="text-zinc-400" />
            Collections
          </Link>
          {isMounted && user && (
            <>
              <div className="flex items-center gap-3 pb-2 border-b border-zinc-800">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-sm font-bold text-white shadow-md overflow-hidden">
                  {user?.avatar ? (
                    <Image
                      src={user.avatar}
                      alt="Avatar"
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    userInitial
                  )}
                </div>
                <div>
                  <p className="text-white font-bold">{user.username || "User"}</p>
                  <p className="text-zinc-500 text-xs truncate max-w-[200px]">{user.email}</p>
                </div>
              </div>
              
              <Link
                href={`/profile/${user?.username || "user"}`}
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-3"
              >
                <User size={20} className="text-zinc-400" />
                My Profile
              </Link>
              
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-3"
              >
                <Settings size={20} className="text-zinc-400" />
                Edit Profile
              </Link>

              <Link
                href="/watchlist"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-3"
              >
                <Bookmark size={20} className="text-zinc-400" />
                Watchlist
              </Link>
              
              <Link
                href="/watched"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-3"
              >
                <Eye size={20} className="text-zinc-400" />
                Watched
              </Link>
              
              <Link
                href="/favorites"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-3"
              >
                <Heart size={20} className="text-pink-400" />
                Favorites
              </Link>
            </>
          )}
          
          {!user && (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all"
            >
              <LogIn size={20} />
              Login
            </Link>
          )}

          {user && (
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 text-red-400 font-semibold border border-zinc-700 hover:bg-zinc-700 transition-all"
            >
              <LogOut size={20} />
              Log Out
            </button>
          )}
        </div>
      )}
    </nav>
  );
}