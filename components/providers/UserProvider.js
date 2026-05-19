"use client";

import { createContext, useContext, useEffect, useState } from "react";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [watchedIds, setWatchedIds] = useState(new Set());
  const [watchlistIds, setWatchlistIds] = useState(new Set());
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  async function refreshStats() {
    const token = localStorage.getItem("token");
    if (!token) {
      setWatchedIds(new Set());
      setWatchlistIds(new Set());
      setFavoriteIds(new Set());
      setIsLoaded(true);
      return;
    }

    try {
      const res = await fetch("/api/user/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setWatchedIds(new Set(data.watchedMovies.map(id => Number(id))));
        setWatchlistIds(new Set(data.watchlist.map(id => Number(id))));
        setFavoriteIds(new Set((data.favorites || []).map(id => Number(id))));
      }
    } catch (e) {
      console.error("Failed to fetch user stats", e);
    } finally {
      setIsLoaded(true);
    }
  }

  useEffect(() => {
    refreshStats();
    
    // Listen for changes (e.g. from buttons)
    const handleUpdate = () => refreshStats();
    window.addEventListener("user-stats-update", handleUpdate);
    return () => window.removeEventListener("user-stats-update", handleUpdate);
  }, []);

  return (
    <UserContext.Provider value={{ watchedIds, watchlistIds, favoriteIds, isLoaded, refreshStats }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserMovies() {
  return useContext(UserContext);
}
