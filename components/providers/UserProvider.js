"use client";

import { createContext, useContext, useEffect, useState } from "react";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [watchedIds, setWatchedIds] = useState(new Set());
  const [watchlistIds, setWatchlistIds] = useState(new Set());
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [favoriteActorIds, setFavoriteActorIds] = useState(new Set());
  const [notInterestedIds, setNotInterestedIds] = useState(new Set());
  const [notInterestedMovies, setNotInterestedMovies] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  async function refreshStats() {
    const token = localStorage.getItem("token");
    if (!token) {
      setWatchedIds(new Set());
      setWatchlistIds(new Set());
      setFavoriteIds(new Set());
      setFavoriteActorIds(new Set());
      setNotInterestedIds(new Set());
      setNotInterestedMovies([]);
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
        setFavoriteActorIds(new Set((data.favoriteActors || []).map(id => Number(id))));
        
        const hiddenArr = data.notInterested || [];
        setNotInterestedIds(new Set(hiddenArr.map(item => Number(item.movieId))));
        setNotInterestedMovies(hiddenArr);
      }
    } catch (e) {
      console.error("Failed to fetch user stats", e);
    } finally {
      setIsLoaded(true);
    }
  }

  async function hideTitle(movie) {
    const token = localStorage.getItem("token");
    if (!token) return false;

    const movieId = Number(movie.id || movie.movieId);
    const title = movie.title || "";
    // Normalize genres
    const genres = Array.isArray(movie.genres) 
      ? movie.genres.map(g => typeof g === "object" ? g.name : String(g))
      : [];

    // Optimistic UI update:
    // Add to notInterested set/list, and filter out from watchlist/favorites
    setNotInterestedIds(prev => {
      const next = new Set(prev);
      next.add(movieId);
      return next;
    });
    setNotInterestedMovies(prev => {
      if (prev.some(item => Number(item.movieId) === movieId)) return prev;
      return [...prev, { movieId, title, genres, createdAt: new Date().toISOString() }];
    });
    setWatchlistIds(prev => {
      const next = new Set(prev);
      next.delete(movieId);
      return next;
    });
    setFavoriteIds(prev => {
      const next = new Set(prev);
      next.delete(movieId);
      return next;
    });

    try {
      const res = await fetch("/api/user/not-interested", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ movieId, title, genres })
      });
      const data = await res.json();
      if (data.success) {
        window.dispatchEvent(new CustomEvent("user-stats-update"));
        return true;
      }
    } catch (e) {
      console.error("Failed to hide title", e);
    }
    refreshStats();
    return false;
  }

  async function restoreTitle(movieId) {
    const token = localStorage.getItem("token");
    if (!token) return false;

    const idNum = Number(movieId);

    // Optimistic update
    setNotInterestedIds(prev => {
      const next = new Set(prev);
      next.delete(idNum);
      return next;
    });
    setNotInterestedMovies(prev => prev.filter(item => Number(item.movieId) !== idNum));

    try {
      const res = await fetch("/api/user/not-interested", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ movieId: idNum })
      });
      const data = await res.json();
      if (data.success) {
        window.dispatchEvent(new CustomEvent("user-stats-update"));
        return true;
      }
    } catch (e) {
      console.error("Failed to restore title", e);
    }
    refreshStats();
    return false;
  }

  async function restoreAllTitles() {
    const token = localStorage.getItem("token");
    if (!token) return false;

    // Optimistic update
    setNotInterestedIds(new Set());
    setNotInterestedMovies([]);

    try {
      const res = await fetch("/api/user/not-interested", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ clearAll: true })
      });
      const data = await res.json();
      if (data.success) {
        window.dispatchEvent(new CustomEvent("user-stats-update"));
        return true;
      }
    } catch (e) {
      console.error("Failed to restore all titles", e);
    }
    refreshStats();
    return false;
  }

  useEffect(() => {
    refreshStats();
    
    // Listen for changes (e.g. from buttons)
    const handleUpdate = () => refreshStats();
    window.addEventListener("user-stats-update", handleUpdate);
    return () => window.removeEventListener("user-stats-update", handleUpdate);
  }, []);

  return (
    <UserContext.Provider value={{ 
      watchedIds, 
      watchlistIds, 
      favoriteIds, 
      favoriteActorIds, 
      notInterestedIds, 
      notInterestedMovies, 
      isLoaded, 
      refreshStats, 
      hideTitle, 
      restoreTitle,
      restoreAllTitles
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserMovies() {
  return useContext(UserContext);
}
