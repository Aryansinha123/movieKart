"use client";

import { createContext, useContext, useEffect, useState } from "react";

const RecentSearchesContext = createContext();

export function RecentSearchesProvider({ children }) {
  const [recentSearches, setRecentSearches] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  function getLocalSearches() {
    if (typeof window === "undefined") return [];
    try {
      const dataStr = localStorage.getItem("recentSearches");
      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        if (parsed && Array.isArray(parsed.recentSearches)) {
          return parsed.recentSearches;
        }
      }
    } catch (e) {
      console.error("Failed to parse local searches", e);
    }
    return [];
  }

  function saveLocalSearches(searches) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("recentSearches", JSON.stringify({ recentSearches: searches }));
    } catch (e) {
      console.error("Failed to save local searches", e);
    }
  }

  async function loadSearches() {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");

    if (!token) {
      // Guest user: Load from localStorage
      setRecentSearches(getLocalSearches());
      setIsLoaded(true);
      return;
    }

    try {
      // Logged-in user: Check if there are local searches to sync first
      const local = getLocalSearches();
      if (local.length > 0) {
        // Send sync request to DB
        const syncRes = await fetch("/api/user/searches", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ sync: local })
        });
        const syncData = await syncRes.json();
        if (syncData.success) {
          setRecentSearches(syncData.recentSearches || []);
          // Clear local searches since they are now synced
          saveLocalSearches([]);
          setIsLoaded(true);
          return;
        }
      }

      // Fetch from database
      const res = await fetch("/api/user/searches", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRecentSearches(data.recentSearches || []);
      }
    } catch (e) {
      console.error("Failed to fetch recent searches", e);
    } finally {
      setIsLoaded(true);
    }
  }

  async function addSearch(query) {
    const q = (query || "").trim();
    if (!q) return;

    // Optimistically update local state first (purely)
    setRecentSearches(prev => {
      const next = prev.filter(item => item.query.toLowerCase() !== q.toLowerCase());
      next.unshift({ query: q, timestamp: new Date().toISOString() });
      return next.slice(0, 10);
    });

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      const current = getLocalSearches();
      const next = current.filter(item => item.query.toLowerCase() !== q.toLowerCase());
      next.unshift({ query: q, timestamp: new Date().toISOString() });
      saveLocalSearches(next.slice(0, 10));
    } else {
      try {
        await fetch("/api/user/searches", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ query: q })
        });
      } catch (e) {
        console.error("Failed to save search to DB", e);
      }
    }
  }

  async function removeSearch(query) {
    const q = (query || "").trim();
    if (!q) return;

    // Optimistically update local state first (purely)
    setRecentSearches(prev => {
      return prev.filter(item => item.query.toLowerCase() !== q.toLowerCase());
    });

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      const current = getLocalSearches();
      const next = current.filter(item => item.query.toLowerCase() !== q.toLowerCase());
      saveLocalSearches(next);
    } else {
      try {
        await fetch("/api/user/searches", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ query: q })
        });
      } catch (e) {
        console.error("Failed to delete search from DB", e);
      }
    }
  }

  async function clearSearchHistory() {
    // Optimistically clear local state
    setRecentSearches([]);
    
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      saveLocalSearches([]);
    } else {
      try {
        await fetch("/api/user/searches", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ clearAll: true })
        });
      } catch (e) {
        console.error("Failed to clear search history from DB", e);
      }
    }
  }

  useEffect(() => {
    loadSearches();
    
    const handleUpdate = () => loadSearches();
    window.addEventListener("user-stats-update", handleUpdate);
    return () => window.removeEventListener("user-stats-update", handleUpdate);
  }, []);

  return (
    <RecentSearchesContext.Provider value={{
      recentSearches,
      isLoaded,
      addSearch,
      removeSearch,
      clearSearchHistory,
      refreshSearches: loadSearches
    }}>
      {children}
    </RecentSearchesContext.Provider>
  );
}

export function useRecentSearches() {
  return useContext(RecentSearchesContext);
}
