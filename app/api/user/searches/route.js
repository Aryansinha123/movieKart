import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getUserFromToken } from "@/lib/getUser";

export async function GET(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(userData.id).select("recentSearches").lean();
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, recentSearches: user.recentSearches || [] });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Invalid body parameters" }, { status: 400 });
    }

    const user = await User.findById(userData.id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    if (!user.recentSearches) {
      user.recentSearches = [];
    }

    if (body.sync && Array.isArray(body.sync)) {
      // Sync list of searches from localStorage
      // incoming structure: [{ query, timestamp }]
      const existingMap = new Map();
      
      // Load current DB searches
      user.recentSearches.forEach(item => {
        existingMap.set(item.query.toLowerCase(), item.timestamp);
      });

      // Load sync searches
      body.sync.forEach(item => {
        if (!item || !item.query) return;
        const key = item.query.toLowerCase();
        const incomingTime = item.timestamp ? new Date(item.timestamp) : new Date();
        if (existingMap.has(key)) {
          // Keep the newer timestamp
          const existingTime = new Date(existingMap.get(key));
          if (incomingTime > existingTime) {
            existingMap.set(key, incomingTime);
          }
        } else {
          existingMap.set(key, incomingTime);
        }
      });

      // Convert map back to list
      const mergedList = [];
      const seenQueries = new Set();
      
      // Match back original queries format (case preservation helper)
      const queryOriginalCases = new Map();
      user.recentSearches.forEach(item => queryOriginalCases.set(item.query.toLowerCase(), item.query));
      body.sync.forEach(item => {
        if (item && item.query) {
          const key = item.query.toLowerCase();
          if (!queryOriginalCases.has(key)) {
            queryOriginalCases.set(key, item.query);
          }
        }
      });

      existingMap.forEach((timestamp, keyLower) => {
        mergedList.push({
          query: queryOriginalCases.get(keyLower) || keyLower,
          timestamp: new Date(timestamp)
        });
      });

      // Sort: newest first
      mergedList.sort((a, b) => b.timestamp - a.timestamp);

      // Keep only top 10
      user.recentSearches = mergedList.slice(0, 10);
    } else if (body.query) {
      const q = body.query.trim();
      if (q) {
        // Remove existing matches of query (case-insensitive deduplication)
        user.recentSearches = user.recentSearches.filter(
          item => item.query.toLowerCase() !== q.toLowerCase()
        );
        // Prepend new search at index 0
        user.recentSearches.unshift({
          query: q,
          timestamp: new Date()
        });
        // Limit to 10
        user.recentSearches = user.recentSearches.slice(0, 10);
      }
    } else {
      return NextResponse.json({ success: false, message: "Missing query or sync items" }, { status: 400 });
    }

    await user.save();
    return NextResponse.json({ success: true, recentSearches: user.recentSearches });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(userData.id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const { searchParams } = new URL(req.url);
    
    const clearAll = body?.clearAll || searchParams.get("clearAll") === "true";
    const query = body?.query || searchParams.get("query");

    if (clearAll) {
      user.recentSearches = [];
    } else if (query) {
      user.recentSearches = user.recentSearches.filter(
        item => item.query.toLowerCase() !== query.toLowerCase()
      );
    } else {
      return NextResponse.json({ success: false, message: "Invalid delete parameters" }, { status: 400 });
    }

    await user.save();
    return NextResponse.json({ success: true, recentSearches: user.recentSearches });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
